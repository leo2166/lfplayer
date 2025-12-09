"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Song, Genre } from "@/lib/types"
import { useMusicPlayer } from "@/contexts/MusicPlayerContext"
import { useUserRole } from "@/contexts/UserRoleContext"
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
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog" // Import AlertDialog components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import GenreFilter from "@/components/genre-filter"
import SongCard from "@/components/song-card"
import AddMusicDialog from "@/components/add-music-dialog" // NEW IMPORT
import { Folder, Music, Trash2, Loader2, ChevronDownIcon, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface MusicLibraryProps {
  songs: Song[]
  genres: Genre[]
}

interface DeleteSummary { // Define the shape of the delete summary
  totalSongs: number;
  deletedFromR2: number;
  deletedFromSupabase: number;
}

export default function MusicLibrary({ songs, genres }: MusicLibraryProps) {
  const userRole = useUserRole()
  const [selectedGenre, setSelectedGenre] = useState("all")
  const [deletingArtist, setDeletingArtist] = useState<string | null>(null)
  // State for single song deletion
  const [deletingSong, setDeletingSong] = useState<Song | null>(null)
  // State to prevent hydration errors
  const [hasMounted, setHasMounted] = useState(false)
  const [isAddIndividualMusicOpen, setAddIndividualMusicOpen] = useState(false) // New state
  const [artistToAddSongTo, setArtistToAddSongTo] = useState<string | undefined>(undefined) // New state

  // State for delete summary modal
  const [showDeleteSummary, setShowDeleteSummary] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState<DeleteSummary | null>(null);

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

  if (!hasMounted) {
    return (
        <div className="w-full h-full p-4 md:p-8 space-y-8">
            <div className="space-y-4">
                <div className="h-10 w-1/4 bg-muted rounded-lg animate-pulse" />
                <div className="h-6 w-1/2 bg-muted rounded-lg animate-pulse" />
            </div>
             <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
            <div className="space-y-2">
                <div className="h-20 w-full bg-muted rounded-lg animate-pulse" />
                <div className="h-20 w-full bg-muted rounded-lg animate-pulse" />
                <div className="h-20 w-full bg-muted rounded-lg animate-pulse" />
            </div>
        </div>
    )
  }

  const handlePlay = (song: Song) => {
    playSong(song, filteredSongs)
  }

  // --- Artist Deletion Logic ---
  const handleDeleteArtist = async (artist: string) => {
    if (deletingArtist === artist) return; // Prevent multiple deletions
    setDeletingArtist(artist);
    const toastId = toast.loading(`Eliminando artista '${artist}'...`);
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error');
      }
      toast.dismiss(toastId); // Dismiss loading toast
      setDeleteSummary(result.summary); // Set the summary data
      setShowDeleteSummary(true);     // Show the summary modal
      router.refresh(); // Refresh the library view
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      const displayError = errorMessage.includes("base de datos") ? errorMessage : `Error al eliminar: ${errorMessage}`;
      toast.error(displayError, { id: toastId });
    } finally {
      setDeletingArtist(null);
    }
  };

  // --- Single Song Deletion Logic ---
  const handleDeleteSong = async (song: Song) => {
    if (deletingSong?.id === song.id) return; // Prevent multiple deletions
    setDeletingSong(song);
    const toastId = toast.loading(`Eliminando canción '${song.title}'...`);
    try {
      const response = await fetch(`/api/songs/${song.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error');
      }
      toast.success(`Canción '${song.title}' eliminada correctamente.`, { id: toastId });
      setTimeout(() => router.refresh(), 100); // Re-introduce delay for refresh
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar: ${errorMessage}`, { id: toastId });
    } finally {
      setDeletingSong(null);
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
                {userRole === 'admin' && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setArtistToAddSongTo(artist);
                        setAddIndividualMusicOpen(true);
                      }}
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteArtist(artist);
                      }}
                      disabled={deletingArtist === artist}
                      className="h-8 w-8"
                    >
                      {deletingArtist === artist ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                    </Button>
                  </div>
                )}
              </AccordionPrimitive.Header>
              <AccordionContent className="px-4 pt-2 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {artistSongs.map((song) => (
                    <SongCard
                      key={song.id}
                      title={song.title}
                      artist={song.artist}
                      duration={song.duration || 0}
                      genre={song.genre_id ? genreMap.get(song.genre_id) : undefined}
                      onPlay={() => handlePlay(song, artistSongs)}
                      onDelete={userRole === 'admin' ? () => handleDeleteSong(song) : undefined}
                      isDeleting={deletingSong?.id === song.id}
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
            <AddMusicDialog
              open={isAddIndividualMusicOpen}
              onOpenChange={setAddIndividualMusicOpen}
              onUploadSuccess={() => {
                setAddIndividualMusicOpen(false);
                router.refresh();
              }}
              preselectedArtist={artistToAddSongTo}
            />

            {/* Delete Summary AlertDialog */}
            <AlertDialog open={showDeleteSummary} onOpenChange={setShowDeleteSummary}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resumen de Eliminación del Artista</AlertDialogTitle>
                  <AlertDialogDescription>
                    {deleteSummary ? (
                      <div className="space-y-2 text-base">
                        <p>Se encontraron **{deleteSummary.totalSongs}** canciones para este artista.</p>
                        <p>Se eliminaron **{deleteSummary.deletedFromR2}** archivos de Cloudflare R2.</p>
                        <p>El rastro en la base de datos de Supabase fue eliminado.</p>
                      </div>
                    ) : (
                      <p>No se pudo obtener el resumen de eliminación.</p>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setShowDeleteSummary(false)}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
  )
}

