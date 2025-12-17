import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/playlists/[id] - Get single playlist details with songs
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { id } = params

        // 1. Get Playlist info
        const { data: playlist, error: playlistError } = await supabase
            .from("playlists")
            .select("*")
            .eq("id", id)
            .single()

        if (playlistError || !playlist) {
            return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
        }

        // 2. Get Songs for this playlist
        // We join playlist_songs with songs to get the actual song details
        const { data: songs, error: songsError } = await supabase
            .from("playlist_songs")
            .select(`
        position,
        songs (
          id,
          title,
          artist,
          duration,
          blob_url,
          genre_id,
          genres (name, color)
        )
      `)
            .eq("playlist_id", id)
            .order("position", { ascending: true })

        if (songsError) {
            throw songsError
        }

        // Flatten structure for frontend convenience
        const formattedSongs = songs.map((item: any) => ({
            ...item.songs,
            playlist_position: item.position
        }))

        return NextResponse.json({
            playlist,
            songs: formattedSongs
        })

    } catch (error) {
        console.error("Error fetching playlist details:", error)
        return NextResponse.json({ error: "Failed to fetch playlist details" }, { status: 500 })
    }
}

// DELETE /api/playlists/[id] - Delete playlist (Safe delete, only DB record)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { id } = params

        // Auth Check
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Role Check
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (profileError || !profile || profile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Only admins can delete playlists" }, { status: 403 })
        }

        // Safe Delete: Only delete the playlist record. 
        // The foreign key constraint on 'playlist_songs' will CASCADE and remove the association records automatically.
        // The 'songs' table and R2 files remain UNTOUCHED.
        const { error: deleteError } = await supabase
            .from("playlists")
            .delete()
            .eq("id", id)

        if (deleteError) {
            throw deleteError
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Error deleting playlist:", error)
        return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 })
    }
}
