"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Plus, AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import type { Song, Playlist } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import SongSelectionList from "./song-selection-list"

const COLORS = [
  "#7C3AED", "#EC4899", "#F97316", "#EF4444",
  "#06B6D4", "#10B981", "#F59E0B", "#6366F1",
]

interface CreatePlaylistDialogProps {
  onCreate?: () => void
}

export default function CreatePlaylistDialog({ onCreate }: CreatePlaylistDialogProps) {
  const [open, setOpen] = useState(false)
  // Step 1 states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(COLORS[0])
  // Step 2 states
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([])
  // Wizard states
  const [step, setStep] = useState<"details" | "addSongs">("details")
  const [newPlaylist, setNewPlaylist] = useState<Playlist | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch all songs when dialog opens for the first time
  useEffect(() => {
    if (open && allSongs.length === 0) {
      const fetchSongs = async () => {
        try {
          const res = await fetch("/api/songs")
          if (!res.ok) throw new Error("Failed to fetch songs")
          const data = await res.json()
          setAllSongs(data.songs || [])
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not load songs.")
        }
      }
      fetchSongs()
    }
  }, [open, allSongs.length])

  const resetState = useCallback(() => {
    setName("")
    setDescription("")
    setColor(COLORS[0])
    setStep("details")
    setNewPlaylist(null)
    setSelectedSongIds([])
    setError(null)
    setIsLoading(false)
  }, [])
  
  // Reset state when dialog is closed
  useEffect(() => {
    if (!open) {
      // Delay reset to allow for closing animation
      const timer = setTimeout(() => {
        resetState()
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, resetState])


  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError("El nombre de la playlist es requerido")
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, cover_color: color }),
      })
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al crear la playlist")
      }
      const data = await res.json()
      setNewPlaylist(data.playlist)
      setStep("addSongs")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la playlist")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStep2Submit = async () => {
    if (!newPlaylist || selectedSongIds.length === 0) {
      // No songs selected, just close and consider it done
      onCreate?.()
      setOpen(false)
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/${newPlaylist.id}/songs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song_ids: selectedSongIds }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al añadir canciones")
      }
      onCreate?.();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al añadir canciones");
    } finally {
      setIsLoading(false);
    }
  }

  const renderStep1 = () => (
    <>
      <DialogHeader>
        <DialogTitle>Crear nueva playlist</DialogTitle>
        <DialogDescription>Paso 1 de 2: Dale un nombre a tu playlist.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleStep1Submit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nombre de la playlist *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi playlist favorita" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="description">Descripción</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe tu playlist..." className="mt-1" />
        </div>
        <div>
          <Label>Color de portada</Label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={`w-full h-10 rounded-lg transition-all ${color === c ? "ring-2 ring-offset-2 ring-foreground" : ""}`} style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        </div>
        {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</> : "Siguiente"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )

  const renderStep2 = () => (
     <>
      <DialogHeader>
        <DialogTitle>Añadir canciones a "{name}"</DialogTitle>
        <DialogDescription>Paso 2 de 2: Selecciona las canciones que quieres en tu playlist.</DialogDescription>
      </DialogHeader>
      <SongSelectionList songs={allSongs} onSelectionChange={setSelectedSongIds} />
       {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={() => setStep('details')} disabled={isLoading}>Atrás</Button>
        <Button type="button" onClick={handleStep2Submit} disabled={isLoading} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Añadiendo...</> : `Añadir ${selectedSongIds.length} canciones`}
        </Button>
      </DialogFooter>
    </>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2">
          <Plus className="w-4 h-4" />
          Nueva playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        {step === 'details' ? renderStep1() : renderStep2()}
      </DialogContent>
    </Dialog>
  )
}
