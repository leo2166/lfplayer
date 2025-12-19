"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import PlaylistCard from "@/components/playlist-card"
import { PlaylistWizard } from "@/components/playlist-wizard"
import { useMusicPlayer } from "@/contexts/MusicPlayerContext"
import { useUserRole } from "@/contexts/UserRoleContext"
import type { Song, Genre } from "@/lib/types"

interface Playlist {
  id: string
  name: string
  description?: string
  cover_color: string
  song_count?: number
}

export default function PlaylistsPage() {
  const router = useRouter()
  const userRole = useUserRole()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const { playSong } = useMusicPlayer()

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchPlaylists(), fetchSongsAndGenres()])
      setIsLoading(false)
    }
    loadData()
  }, [])

  const fetchPlaylists = async () => {
    try {
      const res = await fetch("/api/playlists")
      const data = await res.json()

      // Get song counts for each playlist
      const playlistsWithCounts = await Promise.all(
        (data.playlists || []).map(async (playlist: Playlist) => {
          const songRes = await fetch(`/api/playlists/${playlist.id}/songs`)
          const songData = await songRes.json()
          return {
            ...playlist,
            song_count: songData.songs?.length || 0,
          }
        }),
      )

      setPlaylists(playlistsWithCounts)
    } catch (error) {
      console.error("Error fetching playlists:", error)
    }
  }

  const fetchSongsAndGenres = async () => {
    try {
      const [songsRes, genresRes] = await Promise.all([
        fetch("/api/songs"),
        fetch("/api/genres")
      ])
      const songsData = await songsRes.json()
      const genresData = await genresRes.json()
      setSongs(songsData.songs || [])
      setGenres(genresData.genres || [])
    } catch (error) {
      console.error("Error fetching songs/genres:", error)
    }
  }

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Playlist eliminada correctamente')
        fetchPlaylists()
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || 'Error al eliminar la playlist')
      }
    } catch (error) {
      console.error('Error deleting playlist:', error)
      toast.error('No se pudo conectar con el servidor')
    }
  }

  const handlePlaylistSelect = (id: string) => {
    router.push(`/app/playlists/${id}`)
  }

  const handlePlayPlaylist = async (playlistId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`)
      const data = await res.json()
      const songsToPlay = data.songs.map((ps: any) => ({
        id: ps.songs.id,
        title: ps.songs.title,
        artist: ps.songs.artist,
        duration: ps.songs.duration,
        blob_url: ps.songs.blob_url,
      }))
      if (songsToPlay.length > 0) {
        playSong(songsToPlay[0], songsToPlay)
      }
    } catch (error) {
      console.error("Error playing playlist:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando playlists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Mis Playlists
            </h1>
          </div>
          {userRole === 'admin' && (
            <Button
              onClick={() => setIsWizardOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Playlist
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {playlists.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground mb-4">No hay playlists aún</p>
            <p className="text-sm text-muted-foreground">
              {userRole === 'admin'
                ? 'Crea una nueva playlist para comenzar a organizar tu música'
                : 'El administrador aún no ha creado playlists'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                id={playlist.id}
                name={playlist.name}
                description={playlist.description}
                songCount={playlist.song_count || 0}
                coverColor={playlist.cover_color}
                onDelete={userRole === 'admin' ? () => handleDeletePlaylist(playlist.id) : undefined}
                onSelect={() => handlePlaylistSelect(playlist.id)}
                onPlay={() => handlePlayPlaylist(playlist.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Playlist Wizard with Cascade Selection */}
      <PlaylistWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        songs={songs}
        genres={genres}
        onPlaylistCreated={() => {
          setIsWizardOpen(false)
          fetchPlaylists()
        }}
      />
    </div>
  )
}
