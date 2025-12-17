"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, CheckCircle2, Music, Disc, Folder, ChevronRight, ChevronDown } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { toast } from "sonner"
import type { Song, Genre } from "@/lib/types"

interface PlaylistWizardProps {
    isOpen: boolean
    onClose: () => void
    songs: Song[]
    genres: Genre[]
    onPlaylistCreated: () => void
}

export function PlaylistWizard({ isOpen, onClose, songs, genres, onPlaylistCreated }: PlaylistWizardProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [playlistName, setPlaylistName] = useState("")
    const [playlistDescription, setPlaylistDescription] = useState("")

    // Selection State
    const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set())
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Reset wizard state when closed
    const resetState = () => {
        setStep(1)
        setPlaylistName("")
        setPlaylistDescription("")
        setSelectedSongIds(new Set())
        setSearchTerm("")
    }

    const handleClose = () => {
        resetState()
        onClose()
    }

    // --- Derived Data for Accordion Tree ---

    // 1. Filter songs based on search term (if present)
    const filteredSongs = useMemo(() => {
        if (!searchTerm) return songs
        const lowerTerm = searchTerm.toLowerCase()
        return songs.filter(s =>
            s.title.toLowerCase().includes(lowerTerm) ||
            (s.artist && s.artist.toLowerCase().includes(lowerTerm))
        )
    }, [songs, searchTerm])

    // 2. Group filtered songs by Genre -> Artist
    const treeData = useMemo(() => {
        const sortedGenres = [...genres].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))

        return sortedGenres.map(genre => {
            // Get songs in this genre from the *filtered* list
            const genreSongs = filteredSongs.filter(s => s.genre_id === genre.id)
            if (genreSongs.length === 0) return null // Skip empty genres

            // Group by Artist
            const artistsMap = new Map<string, Song[]>()
            genreSongs.forEach(song => {
                const artistName = song.artist || "Desconocido"
                if (!artistsMap.has(artistName)) {
                    artistsMap.set(artistName, [])
                }
                artistsMap.get(artistName)!.push(song)
            })

            // Sort artists
            const artists = Array.from(artistsMap.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([artistName, artistSongs]) => ({
                    name: artistName,
                    songs: artistSongs.sort((a, b) => a.title.localeCompare(b.title)),
                    selectedCount: artistSongs.filter(s => selectedSongIds.has(s.id)).length
                }))

            // Calculate selected count for genre header
            const genreSelectedCount = genreSongs.filter(s => selectedSongIds.has(s.id)).length

            return {
                ...genre,
                artists,
                selectedCount: genreSelectedCount
            }
        }).filter(Boolean) as (Genre & { artists: { name: string, songs: Song[], selectedCount: number }[], selectedCount: number })[]
    }, [genres, filteredSongs, selectedSongIds]) // Updates when selection changes for counts

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

    const handleToggleArtist = (songsInArtist: Song[]) => {
        const allIds = songsInArtist.map(s => s.id)
        const allSelected = allIds.every(id => selectedSongIds.has(id))
        const newSet = new Set(selectedSongIds)

        if (allSelected) {
            allIds.forEach(id => newSet.delete(id))
        } else {
            allIds.forEach(id => newSet.add(id))
        }
        setSelectedSongIds(newSet)
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
                    cover_color: "#7C3AED"
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

    const selectedCount = selectedSongIds.size

    // --- Render ---

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {step === 1 ? "Crear Nueva Playlist" : "Seleccionar Canciones"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-0 bg-muted/5">
                    {step === 1 ? (
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Playlist</Label>
                                <Input
                                    id="name"
                                    value={playlistName}
                                    onChange={(e) => setPlaylistName(e.target.value)}
                                    placeholder="Ej: Mis Favoritas de Salsa"
                                    className="text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción (Opcional)</Label>
                                <Input
                                    id="description"
                                    value={playlistDescription}
                                    onChange={(e) => setPlaylistDescription(e.target.value)}
                                    placeholder="Ej: Para bailar el fin de semana"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {/* Search Header */}
                            <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar canciones o artistas..."
                                        className="pl-9 bg-background"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <ScrollArea className="flex-1 px-4">
                                <div className="py-2 space-y-2">
                                    <Accordion type="multiple" className="space-y-2">
                                        {treeData.map(genre => (
                                            <AccordionItem key={genre.id} value={genre.id} className="border rounded-lg bg-card px-2">
                                                <AccordionTrigger className="hover:no-underline py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Disc className="w-5 h-5 flex-shrink-0" style={{ color: genre.color || "#666" }} />
                                                        <span className="font-semibold text-base">{genre.name}</span>
                                                        <span className="text-muted-foreground text-xs font-normal">
                                                            ({genre.selectedCount} / {genre.artists.reduce((acc, a) => acc + a.songs.length, 0)})
                                                        </span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-3 pt-1">
                                                    <Accordion type="multiple" className="space-y-1 pl-2">
                                                        {genre.artists.map(artist => (
                                                            <AccordionItem key={artist.name} value={artist.name} className="border-none">
                                                                <div className="flex items-center justify-between py-2 pr-2 hover:bg-muted/50 rounded-md transition-colors">
                                                                    <AccordionTrigger className="py-0 flex-1 hover:no-underline text-sm font-medium">
                                                                        <div className="flex items-center gap-2">
                                                                            <Folder className="w-4 h-4 text-purple-500/70" />
                                                                            {artist.name}
                                                                            {artist.selectedCount > 0 && (
                                                                                <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                                                                                    {artist.selectedCount}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </AccordionTrigger>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 w-6 p-0 ml-2"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleToggleArtist(artist.songs)
                                                                        }}
                                                                        title="Seleccionar todo el artista"
                                                                    >
                                                                        <CheckCircle2 className={`w-4 h-4 ${artist.selectedCount === artist.songs.length ? 'text-primary' : 'text-muted-foreground/30'}`} />
                                                                    </Button>
                                                                </div>

                                                                <AccordionContent className="pl-6 pt-1 pb-2">
                                                                    <div className="space-y-1 border-l-2 border-muted pl-3">
                                                                        {artist.songs.map(song => {
                                                                            const isSelected = selectedSongIds.has(song.id)
                                                                            return (
                                                                                <div
                                                                                    key={song.id}
                                                                                    className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-all ${isSelected ? 'bg-primary/10' : 'hover:bg-accent'
                                                                                        }`}
                                                                                    onClick={() => handleToggleSong(song.id)}
                                                                                >
                                                                                    <Checkbox
                                                                                        checked={isSelected}
                                                                                        className="mt-1"
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className={`text-sm leading-tight ${isSelected ? 'font-medium text-primary' : 'text-foreground'}`}>
                                                                                            {song.title}
                                                                                        </p>
                                                                                        {/* Optional duration/info could go here */}
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        ))}
                                                    </Accordion>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                        {treeData.length === 0 && (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <p>No se encontraron canciones</p>
                                            </div>
                                        )}
                                    </Accordion>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-background">
                    <div className="w-full flex justify-between items-center">
                        <div className="text-sm font-medium">
                            {selectedCount > 0 && (
                                <span className="flex items-center gap-2 text-primary font-bold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {selectedCount} canciones
                                </span>
                            )}
                        </div>

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
                                    Siguiente: Seleccionar
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleCreatePlaylist}
                                    disabled={selectedCount === 0 || isSubmitting}
                                    className="bg-purple-600 hover:bg-purple-700 min-w-[140px]"
                                >
                                    {isSubmitting ? "Guardando..." : "Crear Playlist"}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
