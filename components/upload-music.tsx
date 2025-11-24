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
  onUploadSuccess?: (song: {
    title: string
    artist: string
    genre_id: string
    blob_url: string
    duration: number
  }) => void
}

export default function UploadMusic({ genres, onUploadSuccess }: UploadMusicProps) {
  const [title, setTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [genre_id, setGenreId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith("audio/")) {
        setError("Por favor selecciona un archivo de audio")
        return
      }
      setFile(selectedFile)
      setError(null)
      // Auto-fill title from filename if empty
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title || !file || !genre_id) {
      setError("Por favor completa todos los campos requeridos")
      return
    }

    setIsLoading(true)

    try {
      // Upload file to Blob
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error("Error al subir el archivo")
      }

      const { url, type } = await uploadRes.json()

      // Get audio duration
      const audio = new Audio(url)
      const duration = await new Promise<number>((resolve) => {
        audio.onloadedmetadata = () => {
          resolve(Math.floor(audio.duration))
        }
        audio.onerror = () => {
          resolve(0)
        }
      })

      // Call success callback with song data
      onUploadSuccess?.({
        title,
        artist,
        genre_id,
        blob_url: url,
        duration,
      })

      // Reset form
      setTitle("")
      setArtist("")
      setGenreId("")
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la canción")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-purple-600" />
        Subir canción
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Título de la canción *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mi Canción"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="artist">Artista</Label>
            <Input
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Nombre del artista"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="genre">Género *</Label>
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
          <Label htmlFor="file">Archivo de audio *</Label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="cursor-pointer"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
            >
              Seleccionar
            </Button>
          </div>
          {file && (
            <p className="text-sm text-muted-foreground mt-2">
              Archivo: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
            <p>Canción subida exitosamente</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !file}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isLoading ? "Subiendo..." : "Subir canción"}
        </Button>
      </form>
    </div>
  )
}
