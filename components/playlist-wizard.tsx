"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Folder, Music, ChevronRight, ArrowLeft, Disc, CheckCircle2, Search } from "lucide-react"
import { toast } from "sonner"
import type { Song, Genre } from "@/lib/types"

interface PlaylistWizardProps {
    isOpen: boolean
    onClose: () => void
    songs: Song[]
    genres: Genre[]
    onPlaylistCreated: () => void
}

type ViewState = "genres" | "artists" | "songs"

export function PlaylistWizard({ isOpen, onClose, songs, genres, onPlaylistCreated }: PlaylistWizardProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [playlistName, setPlaylistName] = useState("")
    const [playlistDescription, setPlaylistDescription] = useState("")

    // Selection State
    const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set())
    const [viewState, setViewState] = useState<ViewState>("genres")
    const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null)
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Reset wizard state when closed or opened
    const resetState = () => {
        setStep(1)
        setPlaylistName("")
        setPlaylistDescription("")
        setSelectedSongIds(new Set())
        setViewState("genres")
        setSelectedGenreId(null)
        setSelectedArtist(null)
        setSearchTerm("")
    }

    const handleClose = () => {
        resetState()
        onClose()
    }

    // --- Derived Data ---

    // Filtered artists based on selected genre
    const artistsInGenre = useMemo(() => {
        if (!selectedGenreId) return []
        const genreSongs = songs.filter(s => s.genre_id === selectedGenreId)
        const artists = Array.from(new Set(genreSongs.map(s => s.artist || "Desconocido"))).sort()
        return artists
    }, [songs, selectedGenreId])

    // Songs in selected artist (and genre)
    const songsInArtist = useMemo(() => {
        if (!selectedGenreId || !selectedArtist) return []
        return songs
            .filter(s => s.genre_id === selectedGenreId && (s.artist || "Desconocido") === selectedArtist)
            .sort((a, b) => a.title.localeCompare(b.title))
    }, [songs, selectedGenreId, selectedArtist])

    // Derived counts for UI
    const selectedCount = selectedSongIds.size

    // --- Handlers ---

    const handleToggleSong = (songId: string) => {
        const newSet = new Set(selectedSongIds)
        if (newSet.has(songId)) {
            newSet.delete(songId)
        } else {
            newSet.add(songId)
        }
        setSelectedSongIds(newSet)
    }

    const handleSelectGenre = (genreId: string) => {
        setSelectedGenreId(genreId)
        setViewState("artists")
        setSearchTerm("")
    }

    const handleSelectArtist = (artist: string) => {
        setSelectedArtist(artist)
        setViewState("songs")
    }

    const handleBack = () => {
        if (viewState === "songs") {
            setViewState("artists")
            setSelectedArtist(null)
        } else if (viewState === "artists") {
            setViewState("genres")
            setSelectedGenreId(null)
            setSearchTerm("")
        } else if (step === 2) {
            setStep(1)
        }
    }

    const handleCreatePlaylist = async () => {
        if (!playlistName.trim()) {
            toast.error("El nombre de la playlist es obligatorio")
            return
        }
        if (selectedSongIds.size === 0) {
            toast.error("Selecciona al menos una canción")
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/playlists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: playlistName,
                    description: playlistDescription,
                    songIds: Array.from(selectedSongIds),
                    cover_color: "#7C3AED" // Default color
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Error al crear la playlist")
            }

            toast.success(`Playlist "${playlistName}" creada exitosamente`)
            onPlaylistCreated()
            handleClose()
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Error desconocido")
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- Render Helpers ---

    const renderStep1 = () => (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Playlist</Label>
                <Input
                    id="name"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Ej: Mis Favoritas de Salsa"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Input
                    id="description"
                    value={playlistDescription}
                    onChange={(e) => setPlaylistDescription(e.target.value)}
                    placeholder="Ej: Para bailar el fin de semana"
                    className="resize-none"
                />
            </div>
        </div>
    )

    const renderGenresView = () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
            {genres.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)).map(genre => (
                <Button
                    key={genre.id}
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary/50 hover:bg-accent transition-all"
                    onClick={() => handleSelectGenre(genre.id)}
                    style={{ borderColor: genre.color ? `${genre.color}40` : undefined }}
                >
                    <Disc className="w-8 h-8" style={{ color: genre.color || "currentColor" }} />
                    <span className="font-semibold text-center whitespace-break-spaces leading-tight">{genre.name}</span>
                </Button>
            ))}
        </div>
    )

    const renderArtistsView = () => {
        const filteredArtists = artistsInGenre.filter(a => a.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar artista..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredArtists.map(artist => (
                        <Button
                            key={artist}
                            variant="secondary"
                            className="h-auto py-3 px-4 justify-between group"
                            onClick={() => handleSelectArtist(artist)}
                        >
                            <div className="flex items-center gap-3">
                                <Folder className="w-5 h-5 text-purple-500" />
                                <span className="font-medium truncate max-w-[140px] text-left">{artist}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </Button>
                    ))}
                    {filteredArtists.length === 0 && (
                        <p className="col-span-full text-center text-muted-foreground py-8">No se encontraron artistas</p>
                    )}
                </div>
            </div>
        )
    }

    const renderSongsView = () => (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="font-semibold text-sm text-muted-foreground">Canciones de {selectedArtist}</h4>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        const allIds = songsInArtist.map(s => s.id)
                        const allSelected = allIds.every(id => selectedSongIds.has(id))
                        const newSet = new Set(selectedSongIds)
                        if (allSelected) {
                            allIds.forEach(id => newSet.delete(id))
                        } else {
                            allIds.forEach(id => newSet.add(id))
                        }
                        setSelectedSongIds(newSet)
                    }}
                    className="h-6 text-xs"
                >
                    Seleccionar Todo
                </Button>
            </div>
            <div className="space-y-1">
                {songsInArtist.map(song => {
                    const isSelected = selectedSongIds.has(song.id)
                    return (
                        <div
                            key={song.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${isSelected ? 'bg-primary/10 border-primary/50' : 'bg-card border-border hover:bg-accent'
                                }`}
                            onClick={() => handleToggleSong(song.id)}
                        >
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSong(song.id)}
                                className="pointer-events-none" // Handled by div click
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-sm">{song.title}</p>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                                {Math.floor((song.duration || 0) / 60)}:{((song.duration || 0) % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {step === 1 ? "Crear Nueva Playlist" : "Seleccionar Canciones"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 pt-2">
                    {step === 1 ? renderStep1() : (
                        <div className="h-full flex flex-col gap-4">
                            {/* Breadcrumbs / Navigation Header */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleBack} disabled={viewState === 'genres'}>
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-1 font-medium text-foreground">
                                    <span className={viewState === 'genres' ? "font-bold" : ""}>Géneros</span>
                                    {selectedGenreId && (
                                        <>
                                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                            <span className={viewState === 'artists' ? "font-bold" : ""}>
                                                {genres.find(g => g.id === selectedGenreId)?.name}
                                            </span>
                                        </>
                                    )}
                                    {selectedArtist && (
                                        <>
                                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                            <span className="font-bold">{selectedArtist}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <ScrollArea className="flex-1 pr-4 -mr-4">
                                {viewState === "genres" && renderGenresView()}
                                {viewState === "artists" && renderArtistsView()}
                                {viewState === "songs" && renderSongsView()}
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
                    <div className="w-full flex justify-between items-center">
                        {/* Left side info */}
                        <div className="text-sm font-medium">
                            {selectedCount > 0 && step === 2 && (
                                <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {selectedCount} canciones seleccionadas
                                </span>
                            )}
                        </div>

                        {/* Right side buttons */}
                        <div className="flex gap-2">
                            {step === 2 && (
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    Atrás
                                </Button>
                            )}

                            {step === 1 ? (
                                <Button onClick={() => {
                                    if (!playlistName.trim()) {
                                        toast.error("Ingresa un nombre primero");
                                        return;
                                    }
                                    setStep(2);
                                }}>
                                    Siguiente: Seleccionar Canciones
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleCreatePlaylist}
                                    disabled={selectedCount === 0 || isSubmitting}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    {isSubmitting ? (
                                        <>Generando Playlist...</>
                                    ) : (
                                        <>Crear Playlist ({selectedCount})</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
