"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Song, Genre } from "@/lib/types"
import { useMusicPlayer } from "@/contexts/MusicPlayerContext"
import { toast } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion"
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import GenreFilter from "@/components/genre-filter"
import SongCard from "@/components/song-card"
import { Folder, Music, Trash2, Loader2, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MusicLibraryProps {
  songs: Song[]
  genres: Genre[]
}

export default function MusicLibrary({ songs, genres }: MusicLibraryProps) {
  const [selectedGenre, setSelectedGenre] = useState("all")
  // State for artist deletion
  const [artistToDelete, setArtistToDelete] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  // State for single song deletion
  const [songToDelete, setSongToDelete] = useState<Song | null>(null)
  const [songDeletePassword, setSongDeletePassword] = useState("")
  const [isSongDeleting, setIsSongDeleting] = useState(false)
  // State to prevent hydration errors
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const router = useRouter()
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
  }

  // --- Artist Deletion Logic ---
  const handleDeleteRequest = (artist: string) => {
    setArtistToDelete(artist)
  }

  const handleCancelDelete = () => {
    setArtistToDelete(null)
    setPassword("")
    setIsDeleting(false)
  }

  const handleConfirmDelete = async () => {
    if (!artistToDelete) return
    setIsDeleting(true)
    const toastId = toast.loading(`Eliminando artista '${artistToDelete}'...`)
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist: artistToDelete, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          toast.dismiss(toastId);
          toast.error(result.error || 'Clave incorrecta.');
          setIsDeleting(false);
          return;
        }
        throw new Error(result.error || 'Ocurrió un error');
      }
      toast.success(`Artista '${artistToDelete}' eliminado correctamente.`, { id: toastId });
      handleCancelDelete()
      setTimeout(() => router.refresh(), 100); // Delay refresh to allow dialog to close
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      const displayError = errorMessage.includes("base de datos") ? errorMessage : `Error al eliminar: ${errorMessage}`;
      toast.error(displayError, { id: toastId });
      setIsDeleting(false)
    }
  }

    // --- Single Song Deletion Logic ---
  const handleDeleteSongRequest = (song: Song) => {
    setSongToDelete(song);
  };

  const handleCancelSongDelete = () => {
    setSongToDelete(null);
    setSongDeletePassword("");
    setIsSongDeleting(false);
  };

  const handleConfirmSongDelete = async () => {
    if (!songToDelete) return;
    setIsSongDeleting(true);
    const toastId = toast.loading(`Eliminando canción '${songToDelete.title}'...`);
    try {
      const response = await fetch(`/api/songs/${songToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: songDeletePassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          toast.dismiss(toastId);
          toast.error(result.error || 'Clave incorrecta.');
          setIsSongDeleting(false);
          return;
        }
        throw new Error(result.error || 'Ocurrió un error');
      }
      toast.success(`Canción '${songToDelete.title}' eliminada correctamente.`, { id: toastId });
      handleCancelSongDelete();
      setTimeout(() => router.refresh(), 100); // Delay refresh to allow dialog to close
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar: ${errorMessage}`, { id: toastId });
      setIsSongDeleting(false);
    }
  };

  return (
    <>
      <div className="w-full h-full p-4 md:p-8 space-y-8">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Mi Música</h1>
            <p className="text-muted-foreground">
              Filtra por género o busca tus canciones favoritas.
            </p>
          </div>
        </header>

        <GenreFilter
          genres={genres}
          selectedGenre={selectedGenre}
          onSelectGenre={setSelectedGenre}
        />

        <Accordion type="single" collapsible className="w-full space-y-2">
          {Object.entries(groupedByArtist).map(([artist, artistSongs]) => (
            <AccordionItem value={artist} key={artist} className="border border-border rounded-lg bg-card/50">
              <AccordionPrimitive.Header className="group flex items-center justify-between w-full px-4">
                <AccordionPrimitive.Trigger 
                  className={cn("flex flex-1 items-center justify-between py-3 text-left text-sm font-medium transition-all hover:no-underline")}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-6 h-6 text-purple-600" />
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">{artist}</h3>
                      <p className="text-sm text-muted-foreground">{artistSongs.length} {artistSongs.length === 1 ? 'canción' : 'canciones'}</p>
                    </div>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[state=open]:rotate-180" />
                </AccordionPrimitive.Trigger>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                  e.stopPropagation(); 
                  handleDeleteRequest(artist); 
                }}>
                  <Trash2 className="w-5 h-5 text-destructive" />
                </Button>
              </AccordionPrimitive.Header>
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
                      onDelete={() => handleDeleteSongRequest(song)}
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
            <p className="text-sm text-muted-foreground/80">Intenta seleccionar otro género o agrega nueva música.</p>
          </div>
        )}
      </div>
      
      {hasMounted && (
        <>
          {/* Artist Deletion Dialog */}
          <AlertDialog open={!!artistToDelete} onOpenChange={(open) => !open && handleCancelDelete()}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de que quieres eliminar a '{artistToDelete}'?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción es irreversible. Se eliminarán todas las canciones de este artista. Por favor, introduce la clave de seguridad para confirmar.</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Input 
                  id="artist-delete-password" // Added unique ID
                  type="password"
                  placeholder="Clave de seguridad"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmDelete()}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting || !password}>
                  {isDeleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</>) : "Confirmar Eliminación"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Single Song Deletion Dialog */}
          <AlertDialog open={!!songToDelete} onOpenChange={(open) => !open && handleCancelSongDelete()}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar la canción '{songToDelete?.title}'?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción es irreversible. La canción se eliminará permanentemente. Por favor, introduce la clave de seguridad para confirmar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Input
                  id="song-delete-password"
                  type="password"
                  placeholder="Clave de seguridad"
                  value={songDeletePassword}
                  onChange={(e) => setSongDeletePassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmSongDelete()}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleCancelSongDelete} disabled={isSongDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmSongDelete} disabled={isSongDeleting || !songDeletePassword}>
                  {isSongDeleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</>) : "Confirmar Eliminación"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  )
}

