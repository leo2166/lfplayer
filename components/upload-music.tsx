// force redeploy #2
"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, Music, AlertCircle, FileCheck, FileX, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"


interface Genre {
  id: string
  name: string
  color: string
}

interface UploadMusicProps {
  genres: Genre[]
  onUploadSuccess?: (songs: any[]) => void
  preselectedArtist?: string
  preselectedGenreId?: string
}

interface UploadStatus {
  fileName: string;
  status: 'Pendiente' | 'Subiendo a R2...' | 'Guardando en DB...' | 'Éxito' | 'Error';
  message: string;
  color: 'text-muted-foreground' | 'text-purple-600' | 'text-blue-600' | 'text-green-600' | 'text-red-600';
}

export default function UploadMusic({ genres, onUploadSuccess, preselectedArtist, preselectedGenreId }: UploadMusicProps) {
  const [genre_id, setGenreId] = useState(preselectedGenreId || "")
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [debugLog, setDebugLog] = useState<string[]>([]); // New state for debug logs

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>(preselectedArtist ? 'files' : 'folder');
  const [artistNameInput, setArtistNameInput] = useState(preselectedArtist || "");
  
  useEffect(() => {
    if (preselectedArtist) {
      setArtistNameInput(preselectedArtist);
      setUploadMode('files');
    }
  }, [preselectedArtist]);

  useEffect(() => {
    if (preselectedGenreId) {
      setGenreId(preselectedGenreId);
    }
  }, [preselectedGenreId]);

  const resetState = () => {
      setFiles([]);
      setError(null);
      setUploadStatuses([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
      // Only reset genre if it's NOT pre-selected.
      if (!preselectedGenreId) {
        setGenreId("");
      }
  }

  useEffect(() => {
    resetState();
  }, [uploadMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // First, capture the files from the event.
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    
    // Manually reset UI states from previous uploads without clearing the input field yet.
    setError(null);
    setUploadStatuses([]);

    // Now, update the component's state with the new files.
    setFiles(selectedFiles);

    // If folder upload, automatically extract artist name from the relative path.
    if (uploadMode === 'folder') {
        if (selectedFiles.length > 0 && selectedFiles[0].webkitRelativePath) {
            const artistName = selectedFiles[0].webkitRelativePath.split('/')[0];
            if (artistName) {
                setArtistNameInput(artistName);
            }
        } else {
             // If no files are selected (e.g., user cancels), reset artist name
            setArtistNameInput(preselectedArtist || "");
        }
    }
    
    // It's important to clear the input value to allow selecting the same file(s) again.
    // The event target is the specific input that was used.
    e.target.value = '';
  };

  const log = (message: string) => {
    setDebugLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }

  const updateStatus = (fileName: string, status: UploadStatus['status'], message: string, color: UploadStatus['color']) => {
    setUploadStatuses(prevStatuses => {
      const newStatuses = [...prevStatuses];
      const index = newStatuses.findIndex(s => s.fileName === fileName);
      if (index !== -1) {
        newStatuses[index] = { ...newStatuses[index], status, message, color };
      }
      return newStatuses;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadProgress(0);
    setDebugLog([]);

    setIsLoading(true);
    setUploadStatuses(files.map(f => ({ fileName: f.name, status: 'Pendiente', message: 'En espera para procesar', color: 'text-muted-foreground' })));

    const allSavedSongs: any[] = [];
    let processedFileCount = 0;

    try { // Outer try-catch to stop the entire process
      for (const file of files) {
        const currentFileName = file.name;

        try { // Inner try-catch for individual file processing
          log(`[${currentFileName}] Iniciando proceso...`);
          
          if (!file.name.toLowerCase().endsWith(".mp3")) throw new Error("Formato de archivo no válido. Solo se admiten MP3.");
          if (!genre_id) throw new Error("Género no seleccionado.");
          if (!artistNameInput.trim()) throw new Error("Artista no especificado.");

          // 1. Get Presigned URL
          updateStatus(currentFileName, 'Subiendo a R2...', 'Paso 1/4: Obteniendo URL firmada', 'text-purple-600');
          log(`[${currentFileName}] Solicitando URL firmada...`);
          const presignResponse = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: currentFileName, contentType: file.type }),
          });
          if (!presignResponse.ok) throw new Error(`No se pudo obtener la URL de subida (${presignResponse.status})`);
          const { url, downloadUrl } = await presignResponse.json();
          log(`[${currentFileName}] URL obtenida.`);

          // 2. Upload to R2
          updateStatus(currentFileName, 'Subiendo a R2...', 'Paso 2/4: Subiendo archivo a R2', 'text-purple-600');
          log(`[${currentFileName}] Subiendo a R2...`);
          const uploadResponse = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
          if (!uploadResponse.ok) throw new Error(`Error al subir archivo a R2 (${uploadResponse.status})`);
          log(`[${currentFileName}] Subida a R2 exitosa.`);
          
          // 3. Get Duration
          updateStatus(currentFileName, 'Guardando en DB...', 'Paso 3/4: Obteniendo metadatos', 'text-blue-600');
          log(`[${currentFileName}] Obteniendo duración...`);
          const audio = new Audio(downloadUrl);
          const duration = await new Promise<number>((resolve) => {
            audio.onloadedmetadata = () => resolve(Math.floor(audio.duration));
            audio.onerror = () => {
              log(`[${currentFileName}] ADVERTENCIA: No se pudo cargar metadatos. Duración será 0.`);
              resolve(0);
            }
          });
          log(`[${currentFileName}] Duración: ${duration}s`);
          
          const songData = {
            title: currentFileName.replace(/\.mp3$/i, ""),
            artist: artistNameInput.trim(),
            genre_id,
            blob_url: downloadUrl,
            duration,
          };
          
          // 4. Save to DB
          updateStatus(currentFileName, 'Guardando en DB...', 'Paso 4/4: Registrando canción en DB', 'text-blue-600');
          log(`[${currentFileName}] Guardando en DB...`);
          const saveRes = await fetch("/api/songs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(songData),
          });
          
          // 5. VERIFICATION
          const savedSongResponse = await saveRes.json();
          if (!saveRes.ok || !savedSongResponse.songs || savedSongResponse.songs.length === 0) {
            log(`[${currentFileName}] ¡VERIFICACIÓN FALLIDA! La DB no devolvió la canción guardada.`);
            log(`[${currentFileName}] Iniciando limpieza: eliminando archivo huérfano de R2...`);
            await fetch("/api/songs", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blob_url: downloadUrl }),
            });
            log(`[${currentFileName}] Limpieza completada.`);
            throw new Error(savedSongResponse.error || "Verificación fallida: DB no registró la canción.");
          }
          
          allSavedSongs.push(savedSongResponse.songs[0]);
          log(`[${currentFileName}] ÉXITO: Verificación completada.`);
          updateStatus(currentFileName, 'Éxito', 'La canción fue procesada correctamente.', 'text-green-600');

        } catch (err) {
          const reason = err instanceof Error ? err.message : "Ocurrió un error desconocido";
          log(`[${currentFileName}] FALLO: ${reason}`);
          updateStatus(currentFileName, 'Error', reason, 'text-red-600');
          throw err; // Re-throw to be caught by the outer catch, stopping the process
        } finally {
          processedFileCount++;
          const progress = files.length > 0 ? (processedFileCount / files.length) * 100 : 100;
          setUploadProgress(progress);
        }
      }
      onUploadSuccess?.(allSavedSongs);
      
    } catch (finalError) {
      console.error("Proceso de subida detenido por un error:", finalError);
      setError(`El proceso se detuvo debido a un error en el archivo: ${(finalError as any).fileName || files[processedFileCount]?.name || 'desconocido'}. Detalles en el registro.`);
    } finally {
      setIsLoading(false);
      // No auto-resetting here to allow user to see the logs
      // setTimeout(() => {
      //   resetState();
      //   setUploadProgress(0);
      // }, 30000); 
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-purple-600" />
        Subir Música
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {preselectedArtist ? (
            <div>
                <Label htmlFor="artistName">Añadir canciones a</Label>
                <Input id="artistName" value={artistNameInput} className="mt-1" disabled />
            </div>
        ) : (
           uploadMode === 'folder' && artistNameInput && 
           <div className="space-y-1">
               <Label>Carpeta a subir (artista):</Label>
               <p className="font-bold text-green-600 text-lg">{artistNameInput}</p>
           </div>
        )}

        <div>
          <Label htmlFor="genre">Género para todas las canciones *</Label>
          <Select value={genre_id} onValueChange={setGenreId} disabled={isLoading || !!preselectedGenreId}>
            <SelectTrigger id="genre" className="mt-1">
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
          <Label htmlFor={uploadMode === 'files' ? "file-upload" : "folder-upload"}>{uploadMode === 'files' ? "Archivos de Audio para Subir:" : "Carpeta de Audio para Subir:"}</Label>
          <div className="hidden">
            <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp3,audio/mpeg" multiple disabled={isLoading}/>
            <Input id="folder-upload" type="file" ref={folderInputRef} onChange={handleFileChange} accept=".mp3,audio/mpeg" multiple webkitdirectory="" disabled={isLoading}/>
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
            <div className="text-sm text-muted-foreground mt-2 space-y-1 bg-accent/50 p-3 rounded-lg">
                <p className="font-bold text-purple-600">{files.length} archivos seleccionados.</p>
            </div>
           )}
        </div>

        {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
                <Label>Procesando {files.length} {files.length === 1 ? 'archivo' : 'archivos'}...</Label>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 rounded-lg border bg-background p-3">
              {uploadStatuses.map(s => (
                <div key={s.fileName} className="flex items-center gap-3 text-sm">
                  <div>
                    {s.status === 'Pendiente' && <Loader2 className={cn("w-4 h-4 animate-spin", s.color)} />}
                    {s.status === 'Subiendo a R2...' && <Loader2 className={cn("w-4 h-4 animate-spin", s.color)} />}
                    {s.status === 'Guardando en DB...' && <Loader2 className={cn("w-4 h-4 animate-spin", s.color)} />}
                    {s.status === 'Éxito' && <CheckCircle2 className={cn("w-4 h-4", s.color)} />}
                    {s.status === 'Error' && <XCircle className={cn("w-4 h-4", s.color)} />}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="font-medium truncate" title={s.fileName}>{s.fileName}</p>
                    <p className={cn("text-xs", s.color)}>{s.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && uploadStatuses.length > 0 && (
           <div className="space-y-2 pt-2">
            <h4 className="font-semibold">Resumen de la Subida</h4>
             <div className="flex gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm dark:bg-green-950 dark:text-green-200">
                <FileCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{uploadStatuses.filter(s => s.status === 'Éxito').length} archivos procesados exitosamente.</p>
             </div>
             {uploadStatuses.some(s => s.status === 'Error') && (
                <div className="flex gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm dark:bg-red-950 dark:text-red-200">
                    <FileX className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{uploadStatuses.filter(s => s.status === 'Error').length} archivos fallaron.</p>
                </div>
             )}
             <p className="text-xs text-muted-foreground">El formulario se reiniciará en 30 segundos.</p>
           </div>
        )}

        {debugLog.length > 0 && (
          <div className="space-y-2 pt-4">
            <h4 className="font-semibold text-sm">Registro de Diagnóstico Detallado</h4>
            <div className="max-h-64 overflow-y-auto bg-gray-900 text-white font-mono text-xs rounded-lg p-3 space-y-1">
              {debugLog.map((msg, index) => (
                <p key={index} className="whitespace-pre-wrap break-words">{msg}</p>
              ))}
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading} // Only disabled when loading, always clickable otherwise
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isLoading ? `Procesando...` : `Subir ${files.length} ${files.length === 1 ? 'archivo' : 'archivos'}`}
        </Button>
      </form>
    </div>
  )
}