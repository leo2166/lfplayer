"use client"

import { useState, useMemo } from "react"
import type { Song, Genre } from "@/lib/types"
import { useMusicPlayer } from "@/contexts/MusicPlayerContext"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import GenreFilter from "@/components/genre-filter"
import SongCard from "@/components/song-card"
import { Folder, Music } from "lucide-react"

interface MusicLibraryProps {
  songs: Song[]
  genres: Genre[]
}

export default function MusicLibrary({ songs, genres }: MusicLibraryProps) {
  const [selectedGenre, setSelectedGenre] = useState("all")
  const { playSong, currentSong, isPlaying } = useMusicPlayer()

  const genreMap = useMemo(() => new Map(genres.map((genre) => [genre.id, genre.name])), [genres])

  const filteredSongs = useMemo(() =>
    selectedGenre === "all"
      ? songs
      : songs.filter((song) => song.genre_id === selectedGenre),
    [selectedGenre, songs]
  )

  const groupedByArtist = useMemo(() => {
    return filteredSongs.reduce((acc, song) => {
      const artist = song.artist || "Artista Desconocido"
      if (!acc[artist]) {
        acc[artist] = []
      }
      acc[artist].push(song)
      return acc
    }, {} as Record<string, Song[]>)
  }, [filteredSongs])

  const handlePlay = (song: Song) => {
    playSong(song, filteredSongs)
    console.log("Playing song:", song.title)
  }

  const handleDelete = (song: Song) => {
    // TODO: Implement delete logic
    console.log("Deleting song:", song.title)
  }

  return (
    <div className="w-full h-full p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Mi Música</h1>
        <p className="text-muted-foreground">
          Filtra por género o busca tus canciones favoritas.
        </p>
      </header>

      <GenreFilter
        genres={genres}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
      />

      <Accordion type="single" collapsible className="w-full space-y-2">
        {Object.entries(groupedByArtist).map(([artist, artistSongs]) => (
          <AccordionItem value={artist} key={artist} className="border border-border rounded-lg bg-card/50">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <Folder className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">{artist}</h3>
                  <p className="text-sm text-muted-foreground">{artistSongs.length} {artistSongs.length === 1 ? 'canción' : 'canciones'}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-2 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {artistSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    title={song.title}
                    artist={song.artist}
                    duration={song.duration || 0}
                    genre={song.genre_id ? genreMap.get(song.genre_id) : undefined}
                    onPlay={() => handlePlay(song)}
                    onDelete={() => handleDelete(song)}
                    isPlaying={isPlaying && currentSong?.id === song.id}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filteredSongs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No se encontraron canciones para este género.</p>
          <p className="text-sm text-muted-foreground/80">
            Intenta seleccionar otro género o agrega nueva música.
          </p>
        </div>
      )}
    </div>
  )
}
