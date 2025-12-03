"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Edit, Trash2, Check, X, AlertCircle, Settings, Music, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import type { Genre } from "@/lib/types"

const COLORS = [
  "#7C3AED", "#EC4899", "#F97316", "#EF4444",
  "#06B6D4", "#10B981", "#F59E0B", "#6366F1",
]

export default function GenreManagementDialog() {
  const [open, setOpen] = useState(false)
  const [genres, setGenres] = useState<Genre[]>([])
  const [newGenreName, setNewGenreName] = useState("")
  const [newGenreColor, setNewGenreColor] = useState(COLORS[0])
  const [editingGenreId, setEditingGenreId] = useState<string | null>(null)
  const [editingGenreName, setEditingGenreName] = useState("")
  const [editingGenreColor, setEditingGenreColor] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const fetchGenres = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch("/api/genres")
      if (!res.ok) {
        throw new Error("Error al cargar los géneros.")
      }
      const data = await res.json()
      setGenres(data.genres || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al cargar géneros.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchGenres()
    } else {
      // Reset state when dialog closes
      setError(null)
      setNewGenreName("")
      setNewGenreColor(COLORS[0])
      setEditingGenreId(null)
      setEditingGenreName("")
      setEditingGenreColor("")
    }
  }, [open, fetchGenres])

  const handleAddGenre = async () => {
    setError(null)
    if (!newGenreName.trim()) {
      setError("El nombre del género es requerido.")
      return
    }
    setIsAdding(true)
    try {
      const res = await fetch("/api/genres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGenreName, color: newGenreColor }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Error al añadir el género.")
      }
      toast.success("Género añadido correctamente.")
      setNewGenreName("")
      setNewGenreColor(COLORS[0])
      fetchGenres() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al añadir el género.")
      toast.error(err instanceof Error ? err.message : "Error al añadir el género.")
    } finally {
      setIsAdding(false)
    }
  }

  const handleEditGenre = async (id: string) => {
    setError(null)
    const originalGenre = genres.find(g => g.id === id)
    if (!originalGenre) {
      setError("Género original no encontrado para edición.")
      return
    }

    const trimmedName = editingGenreName.trim()
    if (!trimmedName) {
      setError("El nombre del género es requerido.")
      return
    }

    const updatePayload: { name?: string; color?: string } = {}
    if (trimmedName !== originalGenre.name) {
      updatePayload.name = trimmedName
    }
    if (editingGenreColor !== originalGenre.color) {
      updatePayload.color = editingGenreColor
    }

    if (Object.keys(updatePayload).length === 0) {
      setError("No se realizaron cambios en el género.")
      setEditingGenreId(null) // Exit edit mode
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/genres/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Error al actualizar el género.")
      }
      toast.success("Género actualizado correctamente.")
      setEditingGenreId(null)
      setEditingGenreName("")
      setEditingGenreColor("")
      fetchGenres() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el género.")
      toast.error(err instanceof Error ? err.message : "Error al actualizar el género.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGenre = async (id: string) => {
    setError(null)
    if (!confirm("¿Estás seguro de que quieres eliminar este género? Esta acción no se puede deshacer.")) {
      return
    }
    setIsLoading(true) // Using general isLoading for delete operation
    try {
      const res = await fetch(`/api/genres/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Error al eliminar el género.")
      }
      toast.success("Género eliminado correctamente.")
      fetchGenres() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el género.")
      toast.error(err instanceof Error ? err.message : "Error al eliminar el género.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5 mr-3 flex-shrink-0" />
          <span className="font-medium">Gestionar Géneros</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gestionar Géneros Musicales</DialogTitle>
          <DialogDescription>
            Añade, edita o elimina géneros musicales de tu biblioteca.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {isLoading && !isAdding && (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="ml-2 text-muted-foreground">Cargando géneros...</span>
            </div>
        )}

        <div className="space-y-4">
          {/* Add New Genre Section */}
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-2">Añadir Nuevo Género</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del género"
                value={newGenreName}
                onChange={(e) => setNewGenreName(e.target.value)}
                className="flex-1"
                disabled={isAdding}
              />
              <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: newGenreColor }} />
              <Button onClick={() => {
                const currentIndex = COLORS.indexOf(newGenreColor);
                const nextIndex = (currentIndex + 1) % COLORS.length;
                setNewGenreColor(COLORS[nextIndex]);
              }} variant="outline" size="icon" disabled={isAdding}>
                <Music className="h-4 w-4" />
              </Button>
              <Button onClick={handleAddGenre} disabled={isAdding || isLoading}>
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Añadir
              </Button>
            </div>
          </div>

          {/* Existing Genres List */}
          <h4 className="font-semibold">Géneros Existentes</h4>
          {genres.length === 0 && !isLoading ? (
            <p className="text-muted-foreground text-sm">No hay géneros creados aún.</p>
          ) : (
            <ScrollArea className="h-40 max-h-40 rounded-md border">
              <div className="p-2">
                {genres.map((genre) => (
                  <div key={genre.id} className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                    {editingGenreId === genre.id ? (
                      // Edit Form
                      <>
                        <Input
                          value={editingGenreName}
                          onChange={(e) => setEditingGenreName(e.target.value)}
                          className="flex-1"
                        />
                        <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: editingGenreColor }} />
                        <Button onClick={() => {
                            const currentIndex = COLORS.indexOf(editingGenreColor);
                            const nextIndex = (currentIndex + 1) % COLORS.length;
                            setEditingGenreColor(COLORS[nextIndex]);
                        }} variant="outline" size="icon" className="h-7 w-7">
                            <Music className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEditGenre(genre.id)} disabled={isLoading}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingGenreId(null)} disabled={isLoading}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      // Display Mode
                      <>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: genre.color || '#CCCCCC' }} />
                        <span className="flex-1">{genre.name}</span>
                        <Button size="icon" variant="ghost" onClick={() => {
                          setEditingGenreId(genre.id)
                          setEditingGenreName(genre.name)
                          setEditingGenreColor(genre.color || COLORS[0])
                        }} disabled={isLoading}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteGenre(genre.id)} disabled={isLoading}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
