"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Music, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import MusicPlayer from "@/components/music-player"
import SongCard from "@/components/song-card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Song {
  id: string
  title: string
  artist?: string
  duration: number
  blob_url: string
}

interface PlaylistSong {
  id: string
  position: number
  songs: Song
}

export default function PlaylistDetailPage() {
  const router = useRouter()
  const params = useParams()
  const playlistId = params.id as string

  const [playlist, setPlaylist] = useState<any>(null)
  const [songs, setSongs] = useState<PlaylistSong[]>([])
  const [allUserSongs, setAllUserSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddSongs, setShowAddSongs] = useState(false)

  useEffect(() => {
    const getPlaylistData = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      await fetchPlaylistSongs()
      await fetchAllUserSongs()
      setIsLoading(false)
    }

    getPlaylistData()
  }, [playlistId, router])

  const fetchPlaylistSongs = async () => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`)
      const data = await res.json()
      setSongs(data.songs || [])
    } catch (error) {
      console.error("Error fetching playlist songs:", error)
    }
  }

  const fetchAllUserSongs = async () => {
    try {
      const res = await fetch("/api/songs")
      const data = await res.json()
      setAllUserSongs(data.songs || [])
    } catch (error) {
      console.error("Error fetching user songs:", error)
    }
  }

  const handleAddSong = async (songId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: songId }),
      })

      if (res.ok) {
        await fetchPlaylistSongs()
      }
    } catch (error) {
      console.error("Error adding song:", error)
    }
  }

  const handleRemoveSong = async (songId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: songId }),
      })

      if (res.ok) {
        await fetchPlaylistSongs()
      }
    } catch (error) {
      console.error("Error removing song:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando playlist...</p>
        </div>
      </div>
    )
  }

  const playlistSongs = songs.map((ps) => ({
    id: ps.songs.id,
    title: ps.songs.title,
    artist: ps.songs.artist,
    duration: ps.songs.duration,
    blob_url: ps.songs.blob_url,
  }))

  const songsNotInPlaylist = allUserSongs.filter((song) => !songs.some((ps) => ps.songs.id === song.id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app/playlists">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Playlist
            </h1>
          </div>
          {songs.length < allUserSongs.length && (
            <Button
              onClick={() => setShowAddSongs(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 space-y-8 pb-32">
        {playlistSongs.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Reproductor</h2>
            <MusicPlayer songs={playlistSongs} />
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Canciones ({songs.length})</h2>
          {songs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground mb-4">No hay canciones en esta playlist</p>
              <Button
                onClick={() => setShowAddSongs(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Agregar canciones
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {songs.map((ps) => (
                <SongCard
                  key={ps.songs.id}
                  title={ps.songs.title}
                  artist={ps.songs.artist}
                  duration={ps.songs.duration}
                  onPlay={() => {
                    // Play this song
                  }}
                  onDelete={() => handleRemoveSong(ps.songs.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Add Songs Dialog */}
      <Dialog open={showAddSongs} onOpenChange={setShowAddSongs}>
        <DialogContent className="max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar canciones a la playlist</DialogTitle>
            <DialogDescription>Selecciona las canciones que deseas agregar</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {songsNotInPlaylist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todas tus canciones están en esta playlist
              </p>
            ) : (
              songsNotInPlaylist.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{song.artist || "Artista desconocido"}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddSong(song.id)}
                    className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
