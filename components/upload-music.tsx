"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, Music, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Genre {
  id: string
  name: string
  color: string
}

interface UploadMusicProps {
  genres: Genre[]
  onUploadSuccess?: (songs: any[]) => void
}

export default function UploadMusic({ genres, onUploadSuccess }: UploadMusicProps) {
  const [genre_id, setGenreId] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      const audioFiles = Array.from(selectedFiles).filter((file) => {
        if (!file.type.startsWith("audio/")) {
          setError(`El archivo "${file.name}" no es un audio y será ignorado.`)
          return false
        }
        return true
      })
      setFiles(audioFiles)
      if (audioFiles.length > 0) {
        setError(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (files.length === 0 || !genre_id) {
      setError("Por favor selecciona archivos de audio y un género")
      return
    }

    setIsLoading(true)

    try {
      // Step 1: Upload all files to Blob storage in parallel
      const uploadPromises = files.map((file) => {
        const formData = new FormData()
        formData.append("file", file)
        return fetch("/api/upload", { method: "POST", body: formData }).then((res) => {
          if (!res.ok) throw new Error(`Error al subir ${file.name}`)
          return res.json()
        })
      })

      const uploadedBlobs = await Promise.all(uploadPromises)

      // Step 2: Get duration for each uploaded file and prepare song data
      const songsDataPromises = uploadedBlobs.map(async (blob, index) => {
        const audio = new Audio(blob.url)
        const duration = await new Promise<number>((resolve) => {
          audio.onloadedmetadata = () => resolve(Math.floor(audio.duration))
          audio.onerror = () => resolve(0) // Resolve with 0 if duration can't be read
        })

        return {
          title: files[index].name.replace(/\.[^/.]+$/, ""), // Title from filename
          artist: "", // Artist can be added later
          genre_id,
          blob_url: blob.url,
          duration,
        }
      })

      const songsData = await Promise.all(songsDataPromises)

      // Step 3: Send song data to be saved in the database
      const saveRes = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(songsData), // Sending an array of songs
      })

      if (!saveRes.ok) {
        throw new Error("Error al guardar las canciones en la base de datos")
      }

      const savedSongs = await saveRes.json()

      onUploadSuccess?.(savedSongs.songs)

      // Reset form
      setGenreId("")
      setFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error durante la subida")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-purple-600" />
        Subir Canciones por Lote
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="genre">Género para todas las canciones *</Label>
          <Select value={genre_id} onValueChange={setGenreId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecciona un género" />
            </SelectTrigger>
            <SelectContent>
              {genres.map((genre) => (
                <SelectItem key={genre.id} value={genre.id}>
                  {genre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="file">Archivos de audio *</Label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="cursor-pointer"
              multiple // Allow multiple files
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
            >
              Seleccionar Archivos
            </Button>
          </div>
          {files.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {files.length} {files.length === 1 ? "archivo seleccionado" : "archivos seleccionados"} (
              {(files.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="flex gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm dark:bg-green-950 dark:text-green-200">
            <Music className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>¡{files.length} {files.length === 1 ? "canción subida" : "canciones subidas"} exitosamente!</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || files.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isLoading ? `Subiendo ${files.length} canciones...` : `Subir ${files.length} canciones`}
        </Button>
      </form>
    </div>
  )
}
