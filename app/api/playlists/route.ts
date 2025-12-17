import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Public read access enabled via RLS
    const { data: playlists, error } = await supabase
      .from("playlists")
      .select(`
        *,
        playlist_songs (count)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ playlists })
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
      return NextResponse.json({ error: "Forbidden: Only admins can create playlists" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, songIds, cover_color } = body

    if (!name) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 })
    }

    // 1. Create Playlist
    const { data: playlist, error: createError } = await supabase
      .from("playlists")
      .insert({
        user_id: user.id,
        name,
        description,
        cover_color: cover_color || '#7C3AED'
      })
      .select()
      .single()

    if (createError) throw createError
    if (!playlist) throw new Error("Failed to create playlist object")

    // 2. Add Songs if provided
    if (songIds && Array.isArray(songIds) && songIds.length > 0) {
      const playlistSongs = songIds.map((songId: string, index: number) => ({
        playlist_id: playlist.id,
        song_id: songId,
        position: index
      }))

      const { error: songsError } = await supabase
        .from("playlist_songs")
        .insert(playlistSongs)

      if (songsError) {
        console.error("Error adding songs to playlist:", songsError)
        // Return success but with warning, as playlist itself was created
        return NextResponse.json({
          playlist,
          warning: "Playlist created but failed to add some songs."
        })
      }
    }

    return NextResponse.json({ playlist })

  } catch (error) {
    console.error("Error creating playlist:", error)
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create playlist: ${message}` }, { status: 500 })
  }
}