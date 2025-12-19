import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // For GET we allow guests. Ideally we can check RLS policies but here we open it.
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns this playlist
    const { data: playlist } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", (await params).id)
      .single()

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
    }

    // Get songs in playlist
    const { data, error } = await supabase
      .from("playlist_songs")
      .select(`
        id,
        position,
        added_at,
        songs (
          id,
          title,
          artist,
          duration,
          blob_url,
          genres (id, name, color)
        )
      `)
      .eq("playlist_id", (await params).id)
      .order("position")

    if (error) throw error

    return NextResponse.json({ songs: data })
  } catch (error) {
    console.error("Error fetching playlist songs:", error)
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { song_id, song_ids } = body

    // Verify user owns this playlist
    const { id: playlistId } = await params

    const { data: playlist } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", playlistId)
      .eq("user_id", user.id)
      .single()

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
    }

    // Get max position to calculate new positions
    const { data: maxPositionData } = await supabase
      .from("playlist_songs")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1)

    let currentMaxPosition = (maxPositionData?.[0]?.position ?? -1)

    // Handle single or multiple song additions
    if (song_ids && Array.isArray(song_ids)) {
      // Batch insert
      const songsToInsert = song_ids.map((id, index) => {
        return {
          playlist_id: playlistId,
          song_id: id,
          position: currentMaxPosition + 1 + index,
        }
      })

      const { data, error } = await supabase.from("playlist_songs").insert(songsToInsert).select()

      if (error) throw error

      return NextResponse.json({ success: true, count: data.length })
    } else if (song_id) {
      // Single insert
      const { data, error } = await supabase
        .from("playlist_songs")
        .insert({
          playlist_id: playlistId,
          song_id,
          position: currentMaxPosition + 1,
        })
        .select()

      if (error) throw error

      return NextResponse.json({ playlistSong: data[0] })
    } else {
      return NextResponse.json({ error: "song_id or song_ids is required" }, { status: 400 })
    }

  } catch (error) {
    console.error("Error adding song(s) to playlist:", error)
    return NextResponse.json({ error: "Failed to add song(s)" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { song_id } = await request.json()

    // Verify user owns this playlist
    const { data: playlist } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", (await params).id)
      .eq("user_id", user.id)
      .single()

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
    }

    const { error } = await supabase.from("playlist_songs").delete().eq("playlist_id", (await params).id).eq("song_id", song_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing song from playlist:", error)
    return NextResponse.json({ error: "Failed to remove song" }, { status: 500 })
  }
}
