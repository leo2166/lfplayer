import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from "next/server"
import { r2, CLOUDFLARE_R2_BUCKET_NAME } from "@/lib/cloudflare/r2"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (genre_id && genre_id !== "all") {
      query = query.eq("genre_id", genre_id)
    }

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
    console.log(`\n--- POST /api/songs endpoint hit at: ${new Date().toISOString()} ---`);
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
      }))
    } else {
      const { title, artist, genre_id, blob_url, duration } = body
      songsToInsert = [
        {
          user_id: user.id,
          title,
          artist,
          genre_id,
          blob_url,
          duration,
        },
      ]
    }

    if (songsToInsert.length === 0) {
        return NextResponse.json({ error: "No songs to insert" }, { status: 400 });
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
        const url = new URL(blob_url)
        const objectKey = url.pathname.substring(1)
        
        const deleteCommand = new DeleteObjectCommand({
            Bucket: CLOUDFLARE_R2_BUCKET_NAME,
            Key: objectKey,
        });

        await r2.send(deleteCommand);
        console.log(`Successfully deleted object from R2: ${objectKey}`);
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