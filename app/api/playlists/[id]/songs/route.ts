import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns this playlist
    const { data: playlist } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
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
      .eq("playlist_id", params.id)
      .order("position")

    if (error) throw error

    return NextResponse.json({ songs: data })
  } catch (error) {
    console.error("Error fetching playlist songs:", error)
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
    }

    // Get max position
    const { data: maxPosition } = await supabase
      .from("playlist_songs")
      .select("position")
      .eq("playlist_id", params.id)
      .order("position", { ascending: false })
      .limit(1)

    const position = (maxPosition?.[0]?.position ?? -1) + 1

    const { data, error } = await supabase
      .from("playlist_songs")
      .insert({
        playlist_id: params.id,
        song_id,
        position,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ playlistSong: data[0] })
  } catch (error) {
    console.error("Error adding song to playlist:", error)
    return NextResponse.json({ error: "Failed to add song" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
    }

    const { error } = await supabase.from("playlist_songs").delete().eq("playlist_id", params.id).eq("song_id", song_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing song from playlist:", error)
    return NextResponse.json({ error: "Failed to remove song" }, { status: 500 })
  }
}
