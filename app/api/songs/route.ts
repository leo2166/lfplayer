// Force redeploy at 2025-12-10
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from "next/server"
import { getR2ClientForAccount, getAccountNumberFromUrl, updateBucketUsage } from "@/lib/cloudflare/r2-manager"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Allow public access (RLS policies will handle security defined in scripts/009_add_public_songs_policy.sql)
    // const { data: { user } } = await supabase.auth.getUser()
    // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const genre_id = request.nextUrl.searchParams.get("genre_id")

    let query = supabase
      .from("songs")
      .select(`
        id,
        title,
        artist,
        duration,
        blob_url,
        genre_id,
        genres (id, name, color)
      `)
      // .eq("user_id", user.id) // Removed to allow guest access
      .order("created_at", { ascending: false })

    if (genre_id && genre_id !== "all") {
      query = query.eq("genre_id", genre_id)
    }

    // FIX: Supabase defaults to 1000 rows. We increase this range to prevent older songs from "disappearing".
    // 50,000 should be sufficient for the current scale.
    query = query.range(0, 50000);

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ songs: data })
  } catch (error) {
    console.error("Error fetching songs:", error)
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 })
    }

    const body = await request.json()

    let songsToInsert: any[]

    if (Array.isArray(body)) {
      songsToInsert = body.map((song) => ({
        ...song,
        user_id: user.id,
        storage_account_number: song.storage_account_number || 1, // Usar cuenta especificada o default a 1
      }))
    } else {
      const { title, artist, genre_id, blob_url, duration, storage_account_number } = body
      songsToInsert = [
        {
          user_id: user.id,
          title,
          artist,
          genre_id,
          blob_url,
          duration,
          storage_account_number: storage_account_number || 1, // Usar cuenta especificada o default a 1
        },
      ]
    }

    if (songsToInsert.length === 0) {
      return NextResponse.json({ error: "No songs to insert" }, { status: 400 });
    }

    // Check for duplicates BEFORE inserting
    const duplicateChecks = await Promise.all(
      songsToInsert.map(song =>
        supabase
          .from("songs")
          .select("id, title, artist, created_at, genres(name)")
          .eq("user_id", user.id)
          .eq("title", song.title)
          .eq("artist", song.artist)
          .range(0, 50000) // Search across all potential songs, not just the first 1000
          .maybeSingle()
      )
    )

    const duplicates = duplicateChecks
      .map((result, index) => ({ result, song: songsToInsert[index] }))
      .filter(({ result }) => result.data !== null)

    if (duplicates.length > 0) {
      const duplicateNames = duplicates.map(d => {
        const existing = d.result.data;
        let genreName = 'Desconocido';
        const g = existing?.genres as any; // Cast to any to bypass TS inference issue on the join
        if (g) {
          genreName = Array.isArray(g) ? g[0]?.name : g.name;
        }
        const date = existing?.created_at ? new Date(existing.created_at).toLocaleDateString() : 'N/A';
        return `"${d.song.title}" (Género: ${genreName}, Subido: ${date})`;
      })
      console.log("Duplicates detected:", duplicateNames)
      return NextResponse.json({
        error: `Las siguientes canciones ya existen en tu biblioteca: ${duplicateNames.join(", ")}`,
        duplicates: duplicateNames,
        details: duplicates.map(d => {
          const g = d.result.data?.genres as any;
          const genreName = g ? (Array.isArray(g) ? g[0]?.name : g.name) : 'Desconocido';
          return {
            title: d.song.title,
            artist: d.result.data?.artist,
            genre: genreName,
            created_at: d.result.data?.created_at
          };
        })
      }, { status: 409 })
    }

    const { data, error } = await supabase.from("songs").insert(songsToInsert).select()

    if (error) {
      throw error;
    }

    console.log("Canciones insertadas en Supabase:", data);
    revalidatePath('/app');
    return NextResponse.json({ songs: data })

  } catch (err) {
    let errorMessage = "An unknown error occurred.";
    if (typeof err === 'object' && err !== null && 'message' in err) {
      errorMessage = (err as { message: string }).message;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    }

    console.error("Error creating song(s):", errorMessage);
    return NextResponse.json({ error: `Failed to create song(s): ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 })
    }

    const { id, blob_url } = await request.json()

    if (blob_url) {
      try {
        // Determinar de qué cuenta es el archivo
        const accountNumber = getAccountNumberFromUrl(blob_url) as 1 | 2
        const r2Client = getR2ClientForAccount(accountNumber)

        const url = new URL(blob_url)
        const objectKey = url.pathname.substring(1)

        const deleteCommand = new DeleteObjectCommand({
          Bucket: accountNumber === 1 ? process.env.CLOUDFLARE_R2_BUCKET_NAME! : process.env.CLOUDFLARE_R2_BUCKET_NAME_2!,
          Key: objectKey,
        });

        await r2Client.send(deleteCommand);
        console.log(`Successfully deleted object from R2 account ${accountNumber}: ${objectKey}`);

        // Actualizar uso de almacenamiento (estimamos tamaño promedio de 4MB)
        await updateBucketUsage(accountNumber, -4194304);
      } catch (r2Error) {
        console.error("Error deleting from R2:", r2Error);
      }
    }

    const { error } = await supabase.from("songs").delete().eq("id", id).eq("user_id", user.id)

    if (error) throw error

    revalidatePath('/app');
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting song:", error)
    return NextResponse.json({ error: "Failed to delete song" }, { status: 500 })
  }
}
