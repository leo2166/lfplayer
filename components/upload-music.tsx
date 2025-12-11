"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, Music, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group" // NEW IMPORT

interface Genre {
  id: string
  name: string
  color: string
}

interface UploadMusicProps {
  genres: Genre[]
  onUploadSuccess?: (songs: any[]) => void
  preselectedArtist?: string // NEW PROP
}

interface UploadError {
  fileName: string
  reason: string
}

export default function UploadMusic({ genres, onUploadSuccess, preselectedArtist }: UploadMusicProps) {
  const [genre_id, setGenreId] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
  const [successCount, setSuccessCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>(preselectedArtist ? 'files' : 'folder'); // NEW STATE
  const [artistNameInput, setArtistNameInput] = useState(preselectedArtist || ""); // NEW STATE

  useEffect(() => {
    if (preselectedArtist) {
      setArtistNameInput(preselectedArtist);
      setUploadMode('files'); // Force files mode if artist pre-selected
    } else {
      setArtistNameInput(""); // Clear artist input if no preselected artist
      // uploadMode is not explicitly set here, it defaults to 'folder' initially
    }
  }, [preselectedArtist]); // Only run when preselectedArtist changes

  useEffect(() => {
    // Clear files if mode changes
    setFiles([]);
    setError(null);
    setUploadErrors([]);
    setSuccessCount(0);
    // Clear input refs when mode changes to prevent accidental re-upload
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }, [uploadMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Removed: setFiles([]) - This was redundant and potentially causing issues.
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

    if (uploadMode === 'files' && !artistNameInput.trim()) { // Validate artist name for individual files
      setError("Por favor ingresa el nombre del artista para los archivos individuales.")
      return
    }

    setIsLoading(true)
    setUploadProgress(0)

    const CHUNK_SIZE = 5; // Process 5 files at a time
    const allSuccessfulUploads: { downloadUrl: string, originalFile: File }[] = [];
    const allFailedUploads: UploadError[] = [];

    try {
      console.log("Paso 1: Iniciando el proceso de subida...");
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
          const chunk = files.slice(i, i + CHUNK_SIZE);
          const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
          const totalChunks = Math.ceil(files.length / CHUNK_SIZE);

          console.log(`Paso 2: Procesando chunk ${chunkNumber} de ${totalChunks}...`);

          const uploadPromises = chunk.map(async (file) => {
              try {
                  console.log(`  - Obteniendo URL prefirmada para ${file.name}`);
                  const presignResponse = await fetch("/api/upload", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ filename: file.name, contentType: file.type }),
                  });

                  if (!presignResponse.ok) {
                      throw new Error(`No se pudo obtener la URL de subida para ${file.name}`);
                  }
                  const { url, downloadUrl } = await presignResponse.json();

                  console.log(`  - Subiendo ${file.name} a R2...`);
                  const uploadResponse = await fetch(url, {
                      method: "PUT",
                      body: file,
                      headers: { "Content-Type": file.type },
                  });

                  if (!uploadResponse.ok) {
                      throw new Error(`Error al subir ${file.name} a R2`);
                  }
                  
                  console.log(`  - Subida de ${file.name} completada.`);
                  return { downloadUrl, originalFile: file };
              } catch (error) {
                  throw new Error(error instanceof Error ? error.message : String(error));
              }
          });

          const chunkResults = await Promise.allSettled(uploadPromises);

          chunkResults.forEach((result, index) => {
              const originalFile = chunk[index];
              if (result.status === 'fulfilled') {
                  allSuccessfulUploads.push(result.value);
              } else {
                  allFailedUploads.push({
                      fileName: originalFile.name,
                      reason: result.reason.message,
                  });
              }
          });

          const processedFiles = i + chunk.length;
          setUploadProgress((processedFiles / files.length) * 70);
      }

      console.log("Paso 3: Todas las subidas a R2 completadas.");
      setUploadErrors(allFailedUploads);

      if (allSuccessfulUploads.length === 0) {
        throw new Error("Ninguna canción pudo ser subida.")
      }

      console.log("Paso 4: Iniciando obtención de metadatos (duración) para canciones subidas...");
      const songsDataPromises = allSuccessfulUploads.map(async ({ downloadUrl, originalFile }) => {
        const audio = new Audio(downloadUrl)
        const duration = await new Promise<number>((resolve) => {
          audio.onloadedmetadata = () => resolve(Math.floor(audio.duration))
          audio.onerror = () => {
            console.warn(`Could not load metadata for ${downloadUrl}. Duration will be 0.`)
            resolve(0)
          }
        })

        let songArtistName = artistNameInput.trim();
        if (uploadMode === 'folder' && !songArtistName && originalFile.webkitRelativePath) {
            songArtistName = originalFile.webkitRelativePath.split("/")[0];
        }
        if (!songArtistName) {
            songArtistName = "Varios Artistas";
        }

        return {
          title: originalFile.name.replace(/\.mp3$/i, ""),
          artist: songArtistName,
          genre_id,
          blob_url: downloadUrl,
          duration,
        }
      })

      const songsData = await Promise.all(songsDataPromises)
      setUploadProgress(85)
      console.log("Paso 5: Metadatos obtenidos. Guardando en la base de datos en lotes...");

      const DB_CHUNK_SIZE = 15;
      let allSavedSongs = [];

      for (let i = 0; i < songsData.length; i += DB_CHUNK_SIZE) {
        const chunk = songsData.slice(i, i + DB_CHUNK_SIZE);
        const chunkNumber = Math.floor(i / DB_CHUNK_SIZE) + 1;
        const totalChunks = Math.ceil(songsData.length / DB_CHUNK_SIZE);

        console.log(`  - Enviando lote ${chunkNumber} de ${totalChunks} a /api/songs...`);
        try {
          const saveRes = await fetch("/api/songs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chunk),
          });

          if (!saveRes.ok) {
            const errorData = await saveRes.json().catch(() => ({}));
            console.error(`Error al guardar el lote ${chunkNumber}:`, errorData.error || 'Error desconocido del servidor');
            // Don't throw, just log. Verification step will handle this.
            chunk.forEach(failedSong => {
              allFailedUploads.push({
                fileName: `${failedSong.artist} - ${failedSong.title}`,
                reason: `El lote no se pudo guardar en la base de datos (Error ${saveRes.status})`
              });
            });

          } else {
            const savedSongsChunk = await saveRes.json();
            allSavedSongs.push(...savedSongsChunk.songs);
          }
        } catch (chunkError) {
           console.error(`Error de red al guardar el lote ${chunkNumber}:`, chunkError);
           chunk.forEach(failedSong => {
              allFailedUploads.push({
                fileName: `${failedSong.artist} - ${failedSong.title}`,
                reason: `Error de red al intentar guardar en la base de datos.`
              });
            });
        }
        
        // Update progress after each DB chunk
        const dbProgress = ((i + chunk.length) / songsData.length) * 15; // This part of progress is from 85 to 100
        setUploadProgress(85 + dbProgress);
      }
      
      console.log("Paso 6: Todas las peticiones a /api/songs han finalizado.");
      setUploadErrors(allFailedUploads); // Update errors with any DB failures

      if (allSavedSongs.length === 0 && allSuccessfulUploads.length > 0) {
        throw new Error("Las canciones se subieron pero ninguna pudo ser guardada en la base de datos.")
      }
      
      onUploadSuccess?.(allSavedSongs)
      setSuccessCount(allSavedSongs.length);

      // Reset form
      setFiles([])
      setArtistNameInput(preselectedArtist || "");
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (folderInputRef.current) folderInputRef.current.value = ""
      
    } catch (err) {
      console.error("Error detallado en handleSubmit:", err);
      setError(err instanceof Error ? err.message : "Ocurrió un error durante la subida")
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setUploadProgress(0)
        setSuccessCount(0)
        setUploadErrors([])
        setError(null)
      }, 7000) // Increased timeout to see results
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-purple-600" />
        Subir Música
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Artist Input - Rendered only when adding to an existing artist */}
        {preselectedArtist && (
            <div>
                <Label htmlFor="artistName">Añadir canciones a</Label>
                <Input
                    id="artistName"
                    value={artistNameInput}
                    className="mt-1"
                    disabled
                />
            </div>
        )}

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
          <Label>
            {uploadMode === 'files' ? "Archivos de Audio para Subir:" : "Carpeta de Audio para Subir:"}
          </Label>
          <div className="hidden">
            <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp3" multiple />
            <Input id="folder-upload" type="file" ref={folderInputRef} onChange={handleFileChange} accept=".mp3" multiple webkitdirectory="" />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {uploadMode === 'files' ? (
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Seleccionar Archivos
                </Button>
            ) : (
                <Button type="button" variant="outline" onClick={() => folderInputRef.current?.click()}>
                    Seleccionar Carpeta
                </Button>
            )}
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
