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

  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>(preselectedArtist ? 'files' : 'folder');
  const [artistNameInput, setArtistNameInput] = useState(preselectedArtist || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [existingFiles, setExistingFiles] = useState(0);

  useEffect(() => {
    if (preselectedArtist) {
      setArtistNameInput(preselectedArtist);
      setUploadMode('files');
    } else {
      setArtistNameInput("");
    }
  }, [preselectedArtist]);

  useEffect(() => {
    setFiles([]);
    setError(null);
    setUploadErrors([]);
    setSuccessCount(0);
    setIsVerifying(false);
    setTotalFiles(0);
    setExistingFiles(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }, [uploadMode]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setUploadErrors([]);
    setSuccessCount(0);
    setTotalFiles(0);
    setExistingFiles(0);

    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const audioFiles = Array.from(selectedFiles).filter((file) => file.name.toLowerCase().endsWith(".mp3"));
    setTotalFiles(audioFiles.length);

    if (uploadMode === 'folder' && audioFiles.length > 0 && audioFiles[0].webkitRelativePath) {
      const artistName = audioFiles[0].webkitRelativePath.split('/')[0];
      if (artistName) {
        setIsVerifying(true);
        setArtistNameInput(artistName);
        try {
          const res = await fetch(`/api/artists/${encodeURIComponent(artistName)}/songs`);
          if (!res.ok) {
            // If artist not found (404) or other error, treat all files as new
            console.warn(`Could not fetch existing songs for ${artistName}. Assuming all files are new.`);
            setFiles(audioFiles);
            setExistingFiles(0);
          } else {
            const { titles: existingTitles } = await res.json();
            const existingTitleSet = new Set(existingTitles.map((t: string) => t.toLowerCase()));
            
            const newFiles = audioFiles.filter(file => {
              const fileTitle = file.name.replace(/\.mp3$/i, "").toLowerCase();
              return !existingTitleSet.has(fileTitle);
            });
            
            setFiles(newFiles);
            setExistingFiles(audioFiles.length - newFiles.length);
          }
        } catch (error) {
          console.error("Error verifying files:", error);
          setError("Error al verificar archivos existentes. Se subirán todos los archivos.");
          setFiles(audioFiles); // Fallback to uploading all files
        } finally {
          setIsVerifying(false);
        }
      } else {
         // Fallback if artist name can't be determined
        setFiles(audioFiles);
      }
    } else {
      setFiles(audioFiles);
    }
  };

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

    const allSavedSongs: any[] = [];
    const allFailedUploads: UploadError[] = [];

    try {
      let processedFileCount = 0;
      for (const file of files) {
        processedFileCount++;
        
        try {
          console.log(`Procesando archivo ${processedFileCount} de ${files.length}: ${file.name}`);

          // Step 1: Get presigned URL
          const presignResponse = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, contentType: file.type }),
          });

          if (!presignResponse.ok) {
            throw new Error(`No se pudo obtener la URL de subida.`);
          }
          const { url, downloadUrl } = await presignResponse.json();

          // Step 2: Upload to R2
          const uploadResponse = await fetch(url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Error al subir archivo a R2.`);
          }

          // Step 3: Get duration
          const audio = new Audio(downloadUrl);
          const duration = await new Promise<number>((resolve) => {
            audio.onloadedmetadata = () => resolve(Math.floor(audio.duration));
            audio.onerror = () => {
              console.warn(`No se pudo cargar metadatos para ${downloadUrl}. Duración será 0.`);
              resolve(0);
            }
          });

          let songArtistName = artistNameInput.trim();
          if (uploadMode === 'folder' && !songArtistName && file.webkitRelativePath) {
              songArtistName = file.webkitRelativePath.split("/")[0];
          }
          if (!songArtistName) {
              songArtistName = "Varios Artistas";
          }
          
          const songData = {
            title: file.name.replace(/\.mp3$/i, ""),
            artist: songArtistName,
            genre_id,
            blob_url: downloadUrl,
            duration,
          };

          // Step 4: Save to Supabase
          const saveRes = await fetch("/api/songs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(songData),
          });

          if (!saveRes.ok) {
            const errorData = await saveRes.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error del servidor al guardar en DB.');
          }

          const savedSong = await saveRes.json();
          allSavedSongs.push(savedSong.songs[0]);
          setSuccessCount(prev => prev + 1);

        } catch (err) {
          const reason = err instanceof Error ? err.message : "Ocurrió un error desconocido";
          console.error(`Fallo el proceso para ${file.name}:`, reason);
          allFailedUploads.push({ fileName: file.name, reason });
          setUploadErrors(prev => [...prev, { fileName: file.name, reason }]);
        } finally {
          // Update progress after each file is processed (success or fail)
          const progress = (processedFileCount / files.length) * 100;
          setUploadProgress(progress);
        }
      }

      console.log("Proceso de subida finalizado.");
      onUploadSuccess?.(allSavedSongs);

    } catch (err) {
      console.error("Error inesperado en el proceso de subida:", err);
      setError("Ocurrió un error general durante la subida. Revisa la consola para más detalles.");
    } finally {
      // Reset form and loading state
      setIsLoading(false);
      setFiles([]);
      setArtistNameInput(preselectedArtist || "");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
      
      // Clear messages after a delay
      setTimeout(() => {
        // Keep progress at 100%
        // setUploadProgress(0); 
        setSuccessCount(0);
        setUploadErrors([]);
        setError(null);
      }, 15000); // Increased timeout to see results longer
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
          {isVerifying && (
            <p className="text-sm text-muted-foreground mt-2">Verificando archivos existentes...</p>
          )}
          {!isVerifying && totalFiles > 0 && uploadMode === 'folder' && (
            <div className="text-sm text-muted-foreground mt-2 space-y-1">
              <p>Carpeta <span className="font-semibold">{artistNameInput}</span> seleccionada.</p>
              <p>{totalFiles} archivos encontrados. {existingFiles} ya existen en la librería.</p>
              <p className="font-bold text-purple-600">{files.length} nuevas canciones para subir.</p>
            </div>
          )}
           {!isVerifying && totalFiles > 0 && uploadMode === 'files' && (
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
          disabled={isLoading || isVerifying || files.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isLoading ? `Subiendo...` : isVerifying ? 'Verificando...' : `Subir ${files.length} ${files.length === 1 ? 'canción' : 'canciones'}`}
        </Button>
      </form>
    </div>
  )
}
