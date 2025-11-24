"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import MusicPlayer from "@/components/music-player"
import UploadMusic from "@/components/upload-music"
import SongCard from "@/components/song-card"
import GenreFilter from "@/components/genre-filter"

interface Song {
  id: string
  title: string
  artist?: string
  duration: number
  blob_url: string
  genre_id: string
  genres?: {
    id: string
    name: string
    color: string
  }
}

interface Genre {
  id: string
  name: string
  color: string
}

export default function AppPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenre, setSelectedGenre] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)
      await fetchGenres()
      await fetchSongs()
      setIsLoading(false)
    }

    getUser()
  }, [router])

  const fetchGenres = async () => {
    try {
      const res = await fetch("/api/genres")
      const data = await res.json()
      setGenres(data.genres || [])
    } catch (error) {
      console.error("Error fetching genres:", error)
    }
  }

  const fetchSongs = async (genreId?: string) => {
    try {
      const url = genreId && genreId !== "all" ? `/api/songs?genre_id=${genreId}` : "/api/songs"
      const res = await fetch(url)
      const data = await res.json()
      setSongs(data.songs || [])
    } catch (error) {
      console.error("Error fetching songs:", error)
    }
  }

  const handleSelectGenre = (genreId: string) => {
    setSelectedGenre(genreId)
    fetchSongs(genreId)
  }

  const handleDeleteSong = async (id: string, blobUrl: string) => {
    try {
      const res = await fetch("/api/songs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, blob_url: blobUrl }),
      })

      if (res.ok) {
        setSongs(songs.filter((s) => s.id !== id))
      }
    } catch (error) {
      console.error("Error deleting song:", error)
    }
  }

  const handleUploadSuccess = async (songData: any) => {
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(songData),
      })

      if (res.ok) {
        await fetchSongs(selectedGenre)
      }
    } catch (error) {
      console.error("Error saving song:", error)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu música...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            Preferencia Musical
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-muted-foreground">Hola, {user?.email?.split("@")[0]}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8 pb-32">
        {/* Upload Section */}
        <section>
          <UploadMusic genres={genres} onUploadSuccess={handleUploadSuccess} />
        </section>

        {/* Player Section */}
        {songs.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Reproductor</h2>
            <MusicPlayer
              songs={songs.map((s) => ({
                id: s.id,
                title: s.title,
                artist: s.artist,
                duration: s.duration,
                blob_url: s.blob_url,
              }))}
              onPlayingChange={(playing) => {
                // Track if something is playing
              }}
            />
          </section>
        )}

        {/* Filter Section */}
        {songs.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Filtrar por género</h2>
            <GenreFilter genres={genres} selectedGenre={selectedGenre} onSelectGenre={handleSelectGenre} />
          </section>
        )}

        {/* Songs List Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            {selectedGenre === "all" ? "Todas las canciones" : `Canciones - ${selectedGenre}`}
          </h2>
          {songs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground mb-2">No tienes canciones aún</p>
              <p className="text-sm text-muted-foreground">Comienza a subir música para organizarla por género</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {songs.map((song) => (
                <SongCard
                  key={song.id}
                  title={song.title}
                  artist={song.artist}
                  duration={song.duration}
                  genre={song.genres?.name}
                  isPlaying={currentPlayingId === song.id}
                  onPlay={() => {
                    setCurrentPlayingId(song.id)
                  }}
                  onDelete={() => handleDeleteSong(song.id, song.blob_url)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
