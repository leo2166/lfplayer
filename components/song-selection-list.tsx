"use client"

import { useState, useMemo, useEffect } from "react"
import type { Song } from "@/lib/types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "./ui/button"
import { Folder, Search } from "lucide-react"

interface SongSelectionListProps {
  songs: Song[]
  onSelectionChange: (selectedIds: string[]) => void
}

export default function SongSelectionList({ songs, onSelectionChange }: SongSelectionListProps) {
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")

  // Notify parent component when selection changes
  useEffect(() => {
    onSelectionChange(Array.from(selectedSongIds))
  }, [selectedSongIds, onSelectionChange])

  const handleToggle = (songId: string) => {
    setSelectedSongIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(songId)) {
        newSet.delete(songId)
      } else {
        newSet.add(songId)
      }
      return newSet
    })
  }
  
  const filteredSongs = useMemo(() => {
    if (!searchTerm) return songs
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [songs, searchTerm])

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
  
  const allVisibleSongIds = useMemo(() => filteredSongs.map(s => s.id), [filteredSongs]);

  const handleSelectAll = () => {
    setSelectedSongIds(new Set(allVisibleSongIds));
  }

  const handleDeselectAll = () => {
    setSelectedSongIds(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar canción o artista..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

       <div className="flex gap-2">
        <Button onClick={handleSelectAll} variant="outline" size="sm">Seleccionar Todos</Button>
        <Button onClick={handleDeselectAll} variant="outline" size="sm">Deseleccionar Todos</Button>
      </div>

      <ScrollArea className="h-64 w-full rounded-md border p-4">
        <Accordion type="multiple" className="w-full space-y-2">
          {Object.entries(groupedByArtist).map(([artist, artistSongs]) => (
            <AccordionItem value={artist} key={artist} className="border border-border rounded-lg bg-card/50">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Folder className="w-6 h-6 text-purple-600" />
                  <div className="text-left">
                    <h3 className="font-semibold">{artist}</h3>
                    <p className="text-sm text-muted-foreground">
                      {artistSongs.length} {artistSongs.length === 1 ? "canción" : "canciones"}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2 pb-4">
                <div className="space-y-2">
                  {artistSongs.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => handleToggle(song.id)}
                    >
                      <Checkbox
                        id={`song-${song.id}`}
                        checked={selectedSongIds.has(song.id)}
                        onCheckedChange={() => handleToggle(song.id)}
                      />
                      <label htmlFor={`song-${song.id}`} className="flex-1 cursor-pointer">
                        <p className="font-medium">{song.title}</p>
                        <p className="text-sm text-muted-foreground">{song.artist}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
       <p className="text-sm text-muted-foreground text-center">
          {selectedSongIds.size} {selectedSongIds.size === 1 ? 'canción seleccionada' : 'canciones seleccionadas'}
       </p>
    </div>
  )
}
