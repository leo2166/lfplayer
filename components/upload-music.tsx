"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, Music, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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

interface UploadError {
  fileName: string
  reason: string
}

export default function UploadMusic({ genres, onUploadSuccess }: UploadMusicProps) {
  const [genre_id, setGenreId] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
  const [successCount, setSuccessCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles([])
    setError(null)
    setUploadErrors([])
    setSuccessCount(0)
    const selectedFiles = e.target.files
    if (selectedFiles) {
      const audioFiles = Array.from(selectedFiles).filter((file) => file.name.toLowerCase().endsWith(".mp3"))
      setFiles(audioFiles)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setUploadErrors([])
    setSuccessCount(0)

    if (files.length === 0 || !genre_id) {
      setError("Por favor selecciona archivos de audio y un género")
      return
    }

    setIsLoading(true)
    setUploadProgress(0)

    try {
      const uploadPromises = files.map(async (file, index) => {
        try {
          // Step 1: Get a pre-signed URL from our API
          const presignResponse = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
            }),
          });

          if (!presignResponse.ok) {
            throw new Error(`No se pudo obtener la URL de subida para ${file.name}`);
          }
          const { url, downloadUrl } = await presignResponse.json();
          
          setUploadProgress((prev) => prev + (10 / files.length));

          // Step 2: Upload the file directly to R2 using the pre-signed URL
          const uploadResponse = await fetch(url, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Error al subir ${file.name} a R2`);
          }

          setUploadProgress((prev) => prev + (60 / files.length));
          
          return { downloadUrl, originalFile: file };
        } catch (error) {
          // We re-throw the error to be caught by Promise.allSettled
          throw new Error(error instanceof Error ? error.message : String(error));
        }
      });

      const uploadResults = await Promise.allSettled(uploadPromises);
      setUploadProgress(70)

      const successfulUploads: { downloadUrl: string, originalFile: File }[] = [];
      const failedUploads: UploadError[] = [];

      uploadResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value);
        } else {
          failedUploads.push({
            fileName: files[index].name,
            reason: result.reason.message,
          });
        }
      });
      
      if (successfulUploads.length === 0) {
        setUploadErrors(failedUploads)
        throw new Error("Ninguna canción pudo ser subida.")
      }

      const songsDataPromises = successfulUploads.map(async ({ downloadUrl, originalFile }) => {
        const audio = new Audio(downloadUrl)
        const duration = await new Promise<number>((resolve) => {
          audio.onloadedmetadata = () => resolve(Math.floor(audio.duration))
          audio.onerror = () => {
            console.warn(`Could not load metadata for ${downloadUrl}. Duration will be 0.`)
            resolve(0)
          }
        })

        const artistName = originalFile.webkitRelativePath
          ? originalFile.webkitRelativePath.split("/")[0]
          : "Varios Artistas"

        return {
          title: originalFile.name.replace(/\.mp3$/i, ""),
          artist: artistName,
          genre_id,
          blob_url: downloadUrl,
          duration,
        }
      })

      const songsData = await Promise.all(songsDataPromises)
      setUploadProgress(85)
      
      const saveRes = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(songsData),
      })

      if (!saveRes.ok) {
        const errorData = await saveRes.json().catch(() => ({}))
        throw new Error(errorData.error || "Error al guardar las canciones en la base de datos")
      }

      const savedSongs = await saveRes.json()
      setUploadProgress(100)
      
      onUploadSuccess?.(savedSongs.songs)
      setSuccessCount(savedSongs.songs.length);
      setUploadErrors(failedUploads);

      // Reset form
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (folderInputRef.current) folderInputRef.current.value = ""
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error durante la subida")
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setUploadProgress(0)
        setSuccessCount(0)
        setUploadErrors([])
        setError(null)
      }, 5000)
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
              {genres.sort((a, b) => a.name.localeCompare(b.name)).map((genre) => (
                <SelectItem key={genre.id} value={genre.id}>
                  {genre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="file">Archivos o Carpetas de Audio *</Label>
          <div className="hidden">
            <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp3" multiple />
            <Input id="folder-upload" type="file" ref={folderInputRef} onChange={handleFileChange} accept=".mp3" multiple webkitdirectory="" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()} className="flex-shrink-0">
              Seleccionar Archivos
            </Button>
            <Button type="button" variant="outline" onClick={() => document.getElementById('folder-upload')?.click()} className="flex-shrink-0">
              Seleccionar Carpeta
            </Button>
          </div>
          {files.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {files.length} {files.length === 1 ? "archivo seleccionado" : "archivos seleccionados"} (
              {(files.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Label>Subiendo {files.length} {files.length === 1 ? "canción" : "canciones"}...</Label>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
          </div>
        )}

        {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {successCount > 0 && (
          <div className="flex gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm dark:bg-green-950 dark:text-green-200">
            <Music className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>¡{successCount} {successCount === 1 ? "canción subida" : "canciones subidas"} exitosamente!</p>
          </div>
        )}
        
        {uploadErrors.length > 0 && (
          <div className="space-y-2 pt-2">
             <Label className="text-red-600">Archivos con errores:</Label>
             <ul className="text-xs text-red-600/90 list-disc list-inside bg-red-50 dark:bg-red-950/50 p-2 rounded-md">
              {uploadErrors.map(err => <li key={err.fileName}><strong>{err.fileName}:</strong> {err.reason}</li>)}
             </ul>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || files.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isLoading ? `Subiendo...` : `Subir ${files.length} canciones`}
        </Button>
      </form>
    </div>
  )
}
