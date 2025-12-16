import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
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

    const { data, error } = await supabase
      .from("playlists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ playlists: data })
  } catch (error) {
    console.error("Error fetching playlists:", error)
    return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 })
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

    const { name, description, cover_color } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("playlists")
      .insert({
        user_id: user.id,
        name,
        description,
        cover_color: cover_color || "#7C3AED",
      })
      .select()

    if (error) throw error

    return NextResponse.json({ playlist: data[0] })
  } catch (error) {
    console.error("Error creating playlist:", error)
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 })
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

    const { id: playlistId } = await request.json()

    if (!playlistId) {
      return NextResponse.json({ error: "Playlist ID is required" }, { status: 400 })
    }

    // 1. Get all songs associated with the playlist
    const { data: playlistSongsData, error: playlistSongsError } = await supabase
      .from("playlist_songs")
      .select("song_id")
      .eq("playlist_id", playlistId)
      .range(0, 50000)

    if (playlistSongsError) {
      console.error("Error fetching songs in playlist:", playlistSongsError)
      return NextResponse.json({ error: "Failed to fetch songs in playlist" }, { status: 500 })
    }

    const songIds = playlistSongsData.map((ps) => ps.song_id)

    if (songIds.length > 0) {
      // 2. Get blob_urls for all songs
      const { data: songsData, error: songsError } = await supabase
        .from("songs")
        .select("blob_url")
        .in("id", songIds)
        .range(0, 50000)

      if (songsError) {
        console.error("Error fetching song blob_urls:", songsError)
        return NextResponse.json({ error: "Failed to fetch song files" }, { status: 500 })
      }

      // 3. Delete files from Cloudflare R2
      const deletePromises = songsData.map(async (song) => {
        const url = new URL(song.blob_url);
        const key = url.pathname.substring(1); // Remove leading slash

        if (!key) {
          console.warn(`Could not extract key from URL: ${song.blob_url}`);
          return; // Skip if key is invalid
        }

        const deleteCommand = new DeleteObjectCommand({
          Bucket: CLOUDFLARE_R2_BUCKET_NAME,
          Key: key,
        })
        try {
          await r2.send(deleteCommand)
        } catch (r2Error) {
          console.error(`Error deleting file ${key} from R2:`, r2Error)
          // Continue with other deletions even if one fails
        }
      })
      await Promise.allSettled(deletePromises) // Wait for all delete operations to attempt completion

      // 4. Delete song records from Supabase
      const { error: deleteSongsError } = await supabase
        .from("songs")
        .delete()
        .in("id", songIds)

      if (deleteSongsError) {
        console.error("Error deleting song records:", deleteSongsError)
        return NextResponse.json({ error: "Failed to delete song records" }, { status: 500 })
      }
    }

    // 5. Delete the playlist record
    const { error: deletePlaylistError } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlistId)
      .eq("user_id", user.id)

    if (deletePlaylistError) {
      console.error("Error deleting playlist record:", deletePlaylistError)
      return NextResponse.json({ error: "Failed to delete playlist record" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting playlist:", error)
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 })
  }
}
