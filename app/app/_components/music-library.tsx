"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Song, Genre } from "@/lib/types"
import { useMusicPlayer } from "@/contexts/MusicPlayerContext"
import { useUserRole } from "@/contexts/UserRoleContext"
import { useMusicLibrary } from "@/contexts/MusicLibraryContext" // NEW IMPORT
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
import { Folder, Music, Trash2, Loader2, ChevronDownIcon, Plus, FileCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeleteSummary { // Define the shape of the delete summary
  totalSongs: number;
  deletedFromR2: number;
  deletedFromSupabase: number;
}

export default function MusicLibrary() { // Props removed
  const userRole = useUserRole()
  const { songs, genres, refetchSongs } = useMusicLibrary() // Consume context
  const [selectedGenre, setSelectedGenre] = useState("all")
  const [deletingArtist, setDeletingArtist] = useState<string | null>(null)
  // State for single song deletion
  const [deletingSong, setDeletingSong] = useState<Song | null>(null)
  // State to prevent hydration errors
  const [hasMounted, setHasMounted] = useState(false)
  const [isAddIndividualMusicOpen, setAddIndividualMusicOpen] = useState(false) // New state
  const [artistToAddSongTo, setArtistToAddSongTo] = useState<string | undefined>(undefined) // New state
  const [genreToAddSongTo, setGenreToAddSongTo] = useState<string | undefined>(undefined)

  // State for delete summary modal
  const [showDeleteSummary, setShowDeleteSummary] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState<DeleteSummary | null>(null);
  const [deleteSummaryTitle, setDeleteSummaryTitle] = useState("Resumen de Eliminación");


  // State for delete by date
  const [deleteDate, setDeleteDate] = useState('');
  const [isDeletingByDate, setIsDeletingByDate] = useState(false);
  const [showDateDeleteConfirm, setShowDateDeleteConfirm] = useState(false);

  // State for orphan file check
  const [isCheckingOrphans, setIsCheckingOrphans] = useState(false);
  const [showOrphanResult, setShowOrphanResult] = useState(false);
  const [orphanResult, setOrphanResult] = useState<any>(null);

  // State for orphan file deletion
  const [isDeletingOrphans, setIsDeletingOrphans] = useState(false);
  const [showOrphanDeleteConfirm, setShowOrphanDeleteConfirm] = useState(false);

  // State for broken link check
  const [isCheckingBrokenLinks, setIsCheckingBrokenLinks] = useState(false);
  const [showBrokenLinkResult, setShowBrokenLinkResult] = useState(false);
  const [brokenLinkResult, setBrokenLinkResult] = useState<any>(null);

  // State for broken link deletion
  const [isDeletingBrokenLinks, setIsDeletingBrokenLinks] = useState(false);
  const [showBrokenLinkDeleteConfirm, setShowBrokenLinkDeleteConfirm] = useState(false);


  useEffect(() => {
    setHasMounted(true);
  }, []); // Empty dependency array ensures this runs once.


  const router = useRouter() // Keep useRouter for general navigation, not for refresh
  const { playSong, currentSong, isPlaying } = useMusicPlayer()

  const genreMap = useMemo(() => {
    if (!Array.isArray(genres)) {
      console.warn("MusicLibrary (Client) WARN: genres is not an array in genreMap useMemo, defaulting to empty Map:", genres);
      return new Map();
    }
    return new Map(genres.map((genre) => [genre.id, genre.name]));
  }, [genres]);

  const filteredSongs = useMemo(() => {
    if (!Array.isArray(songs)) {
      console.warn("MusicLibrary (Client) WARN: songs is not an array in filteredSongs useMemo, defaulting to empty array:", songs);
      return [];
    }
    return selectedGenre === "all"
      ? songs
      : songs.filter((song) => song.genre_id === selectedGenre);
  }, [selectedGenre, songs]);

  const groupedByArtist = useMemo(() => {
    if (!Array.isArray(filteredSongs)) {
      console.warn("MusicLibrary (Client) WARN: filteredSongs is not an array in groupedByArtist useMemo, defaulting to empty object:", filteredSongs);
      return {};
    }
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
      setDeleteSummaryTitle(`Resumen de Eliminación - ${artist}`); // Set dynamic title
      setDeleteSummary(result.summary); // Set the summary data
      setShowDeleteSummary(true);     // Show the summary modal
      refetchSongs(); // Use refetchSongs instead of router.refresh()
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
      refetchSongs(); // Use refetchSongs instead of setTimeout(() => router.refresh(), 100)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar: ${errorMessage}`, { id: toastId });
    } finally {
      setDeletingSong(null);
    }
  };

  // --- Delete by Date Logic ---
  const handleDeleteByDate = async () => {
    if (!deleteDate || isDeletingByDate) return;

    setIsDeletingByDate(true);
    setShowDateDeleteConfirm(false);
    const toastId = toast.loading(`Eliminando canciones de la fecha ${deleteDate}...`);

    try {
      const response = await fetch('/api/delete-by-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: deleteDate }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error en el servidor.');
      }

      toast.dismiss(toastId);
      setDeleteSummaryTitle(`Resumen de Eliminación - ${deleteDate}`);
      setDeleteSummary(result.summary);
      setShowDeleteSummary(true);
      setDeleteDate(""); // Reset date input
      refetchSongs(); // Use refetchSongs instead of router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar: ${errorMessage}`, { id: toastId });
    } finally {
      setIsDeletingByDate(false);
    }
  };

  // --- Orphan File Check Logic ---
  const handleOrphanCheck = async () => {
    setIsCheckingOrphans(true);
    const toastId = toast.loading('Buscando archivos huérfanos en R2...');
    try {
      const response = await fetch('/api/cleanup-supabase', {
        method: 'GET',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error');
      }
      toast.dismiss(toastId);
      setOrphanResult(result);
      setShowOrphanResult(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error en la verificación: ${errorMessage}`, { id: toastId });
    } finally {
      setIsCheckingOrphans(false);
    }
  };

  // --- Delete Orphan Files Logic ---
  const handleDeleteOrphans = async () => {
    setIsDeletingOrphans(true);
    setShowOrphanDeleteConfirm(false);
    const toastId = toast.loading(`Eliminando ${orphanResult?.orphanFileCount || ''} archivos huérfanos...`);

    try {
      const response = await fetch('/api/cleanup-supabase', {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error');
      }
      toast.success(`Se eliminaron ${result.deletedCount} archivos huérfanos.`, { id: toastId });
      setShowOrphanResult(false); // Close the results modal
      setOrphanResult(null);     // Clear the results
      refetchSongs(); // Use refetchSongs instead of router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar: ${errorMessage}`, { id: toastId });
    } finally {
      setIsDeletingOrphans(false);
    }
  };

  // --- Broken Link Check Logic ---
  const handleBrokenLinkCheck = async () => {
    setIsCheckingBrokenLinks(true);
    const toastId = toast.loading('Buscando registros rotos en Supabase...');
    try {
      const response = await fetch('/api/cleanup-supabase/broken-links', {
        method: 'GET',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error');
      }
      toast.dismiss(toastId);
      setBrokenLinkResult(result);
      setShowBrokenLinkResult(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error en la verificación de registros rotos: ${errorMessage}`, { id: toastId });
    } finally {
      setIsCheckingBrokenLinks(false);
    }
  };

  // --- Delete Broken Links Logic ---
  const handleDeleteBrokenLinks = async () => {
    setIsDeletingBrokenLinks(true);
    setShowBrokenLinkDeleteConfirm(false);
    const toastId = toast.loading(`Eliminando ${brokenLinkResult?.brokenRecordCount || ''} registros rotos...`);

    try {
      const response = await fetch('/api/cleanup-supabase/broken-links', {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error');
      }
      toast.success(`Se eliminaron ${result.deletedCount} registros rotos.`, { id: toastId });
      setShowBrokenLinkResult(false); // Close the results modal
      setBrokenLinkResult(null);     // Clear the results
      refetchSongs(); // Use refetchSongs instead of router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar registros rotos: ${errorMessage}`, { id: toastId });
    } finally {
      setIsDeletingBrokenLinks(false);
    }
  };

  // --- Rectify Orphans Logic ---
  const handleRectifyOrphans = async () => {
    setIsRectifying(true);
    const toastId = toast.loading(`Intentando recuperar ${orphanResult?.orphanFileCount || ''} archivos huérfanos...`);

    try {
      // You could open a dialog here to ask for genreId, but for simplicity we'll let them be uncategorized (null genre)
      // or we could add a genre selector in the alert dialog. For now, proceeding with null genre.
      const response = await fetch('/api/rectify-orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genreId: null }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error');
      }

      toast.success(`Se recuperaron ${result.rectifiedCount} canciones exitosamente.`, { id: toastId });

      setRectifyResult(result);
      setShowOrphanResult(false);
      setShowRectifySuccess(true);
      refetchSongs(); // Refresh the list to show new songs

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al recuperar: ${errorMessage}`, { id: toastId });
    } finally {
      setIsRectifying(false);
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

        {userRole === 'admin' && (
          <div className="bg-card/50 border border-border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Panel de Administrador</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-border pb-4">
              <p className="text-sm text-muted-foreground flex-shrink-0">Eliminar todo lo subido en una fecha:</p>
              <Input
                type="date"
                value={deleteDate}
                onChange={(e) => setDeleteDate(e.target.value)}
                className="w-full sm:w-auto"
                disabled={isDeletingByDate}
              />
              <Button
                variant="destructive"
                onClick={() => setShowDateDeleteConfirm(true)}
                disabled={!deleteDate || isDeletingByDate}
              >
                {isDeletingByDate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Eliminar por Fecha
              </Button>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <div className="border border-border p-3 rounded-lg">
                <p className="text-sm text-muted-foreground flex-shrink-0 mb-3">Mantenimiento de Almacenamiento:</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={handleOrphanCheck}
                    disabled={isCheckingOrphans || isDeletingOrphans || isRectifying}
                  >
                    {isCheckingOrphans ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Verificar Archivos Huérfanos
                  </Button>
                  <Button
                    variant="outline" // Changed from secondary to outline
                    onClick={handleBrokenLinkCheck}
                    disabled={isCheckingBrokenLinks || isDeletingBrokenLinks}
                  >
                    {isCheckingBrokenLinks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Verificar Registros Rotos
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                        setGenreToAddSongTo(artistSongs[0]?.genre_id); // Capture genre_id
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
                      onPlay={() => playSong(song, artistSongs)}
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
          setAddIndividualMusicOpen(false); // Call refetchSongs from context
          refetchSongs();
        }}
        preselectedArtist={artistToAddSongTo}
        preselectedGenreId={genreToAddSongTo}
      />

      {/* Delete Summary AlertDialog */}
      <AlertDialog open={showDeleteSummary} onOpenChange={setShowDeleteSummary}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteSummaryTitle}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {deleteSummary ? (
                <div className="space-y-2 text-base text-muted-foreground text-sm">
                  <div>Se encontraron **{deleteSummary.totalSongs}** canciones.</div>
                  <div>Se eliminaron **{deleteSummary.deletedFromR2}** archivos de Cloudflare R2.</div>
                  <div>El rastro en la base de datos de Supabase fue eliminado.</div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">No se pudo obtener el resumen de eliminación.</div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowDeleteSummary(false);
              setDeleteSummary(null);
            }}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete by Date Confirmation Dialog */}
      <AlertDialog open={showDateDeleteConfirm} onOpenChange={setShowDateDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se eliminarán permanentemente todas las canciones
              subidas en la fecha **{deleteDate}**. Esto incluye los archivos de audio
              y los registros en la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteByDate}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sí, eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Orphan File Check Results Dialog */}
      <AlertDialog open={showOrphanResult} onOpenChange={setShowOrphanResult}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Análisis de Archivos Huérfanos Completado</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {orphanResult ? (
                <div className="space-y-3 text-base pt-4 text-muted-foreground text-sm">
                  <div>Total de archivos en Cloudflare R2: <span className="font-bold">{orphanResult.totalR2Files}</span></div>
                  <div>Archivos referenciados en Supabase: <span className="font-bold">{orphanResult.totalSupabaseFiles}</span></div>
                  <div className="text-lg">Total de archivos huérfanos: <span className="font-bold text-destructive">{orphanResult.orphanFileCount}</span></div>
                  {orphanResult.orphanFileCount > 0 && (
                    <div className="text-sm pt-2">
                      Se encontraron archivos que existen en R2 pero no en la base de datos.<br />
                      Puedes intentar <strong>Recuperarlos</strong> (crear registro) o <strong>Eliminarlos</strong> definitivamente.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">No se pudo obtener el resultado del análisis.</div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
            {/* Modified Footer to include Rectify button */}
            <div className="flex gap-2 w-full sm:w-auto">
              <AlertDialogAction onClick={() => setShowOrphanResult(false)} className="bg-transparent text-primary hover:bg-secondary border border-transparent hover:border-border">Cerrar</AlertDialogAction>
            </div>

            {orphanResult?.orphanFileCount > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleRectifyOrphans}
                  disabled={isDeletingOrphans || isRectifying}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isRectifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                  Recuperar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowOrphanResult(false);
                    setShowOrphanDeleteConfirm(true);
                  }}
                  disabled={isDeletingOrphans || isRectifying}
                >
                  {isDeletingOrphans ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Eliminar
                </Button>
              </div>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rectify Success Dialog */}
      <AlertDialog open={showRectifySuccess} onOpenChange={setShowRectifySuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¡Recuperación Exitosa!</AlertDialogTitle>
            <AlertDialogDescription>
              Se han recuperado correctamente **{rectifyResult?.rectifiedCount}** canciones.<br /><br />
              Ahora aparecerán en tu biblioteca bajo el nombre de artista detectado o "Artista Desconocido".<br />
              Si quedaron archivos sin recuperar, puedes volver a escanear para eliminarlos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRectifySuccess(false)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Orphan Delete Confirmation Dialog */}
      <AlertDialog open={showOrphanDeleteConfirm} onOpenChange={setShowOrphanDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se eliminarán permanentemente
              **{orphanResult?.orphanFileCount}** archivos huérfanos de Cloudflare R2.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrphans}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeletingOrphans}
            >
              {isDeletingOrphans ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar huérfanos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Broken Link Results Dialog */}
      <AlertDialog open={showBrokenLinkResult} onOpenChange={setShowBrokenLinkResult}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Análisis de Registros Rotos Completado</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {brokenLinkResult ? (
                <div className="space-y-3 text-base pt-4 text-muted-foreground text-sm">
                  <div>Total de archivos en Cloudflare R2: <span className="font-bold">{brokenLinkResult.totalR2Files}</span></div>
                  <div>Total de canciones en Supabase: <span className="font-bold">{brokenLinkResult.totalSupabaseSongs}</span></div>
                  <div className="text-lg">Registros rotos encontrados: <span className="font-bold text-destructive">{brokenLinkResult.brokenRecordCount}</span></div>
                  {brokenLinkResult.brokenRecordCount > 0 && (
                    <>
                      <p className="text-sm pt-2">
                        Estos registros en Supabase apuntan a archivos que ya no existen en Cloudflare R2.
                      </p>
                      <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 text-xs">
                        <ul className="list-disc list-inside space-y-1">
                          {brokenLinkResult.brokenRecords.map((record: any) => (
                            <li key={record.id} className="text-destructive/80">
                              {record.artist} - {record.title} (ID: {record.id.substring(0, 8)}...)
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">No se pudo obtener el resultado del análisis de registros rotos.</div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {brokenLinkResult?.brokenRecordCount > 0 && (
              <Button
                variant="destructive"
                onClick={() => {
                  setShowBrokenLinkResult(false);
                  setShowBrokenLinkDeleteConfirm(true);
                }}
                disabled={isDeletingBrokenLinks}
              >
                {isDeletingBrokenLinks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Limpiar Registros Rotos
              </Button>
            )}
            <AlertDialogAction onClick={() => setShowBrokenLinkResult(false)}>Cerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Broken Link Delete Confirmation Dialog */}
      <AlertDialog open={showBrokenLinkDeleteConfirm} onOpenChange={setShowBrokenLinkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se eliminarán permanentemente
              **{brokenLinkResult?.brokenRecordCount}** registros de canciones de Supabase.
              Estos registros apuntan a archivos inexistentes en Cloudflare R2.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBrokenLinks}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeletingBrokenLinks}
            >
              {isDeletingBrokenLinks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar registros rotos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
