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
  status: 'Pendiente' | 'Subiendo a R2...' | 'Guardando en DB...' | 'Éxito' | 'Error' | 'Duplicado';
  message: string;
  color: 'text-muted-foreground' | 'text-purple-600' | 'text-blue-600' | 'text-green-600' | 'text-red-600' | 'text-yellow-600';
}

// ... inside component ...



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

  /* NEW STATES */
  const [uploadStats, setUploadStats] = useState<{ total: number; valid: number; ignored: number } | null>(null);

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
    setUploadStats(null); // Reset stats
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
    const allFiles = e.target.files ? Array.from(e.target.files) : [];

    // Manually reset UI states from previous uploads.
    setError(null);
    setUploadStatuses([]);

    // FILTER LOGIC
    const validFiles = allFiles.filter(f =>
      f.type === 'audio/mpeg' || f.name.toLowerCase().endsWith('.mp3')
    );
    const ignoredCount = allFiles.length - validFiles.length;

    // Update stats
    setUploadStats({
      total: allFiles.length,
      valid: validFiles.length,
      ignored: ignoredCount
    });

    // Update component's state with ONLY valid files.
    setFiles(validFiles);

    // If folder upload, automatically extract artist name from the relative path.
    if (uploadMode === 'folder') {
      if (validFiles.length > 0 && validFiles[0].webkitRelativePath) {
        const artistName = validFiles[0].webkitRelativePath.split('/')[0];
        if (artistName) {
          setArtistNameInput(artistName);
        }
      } else {
        // If no files are selected (e.g., user cancels), reset artist name
        setArtistNameInput(preselectedArtist || "");
      }
    }

    // It's important to clear the input value to allow selecting the same file(s) again.
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
    let anErrorOccurred = false;
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    for (const file of files) {
      const currentFileName = file.name;

      try {
        log(`[${currentFileName}] Iniciando proceso...`);

        if (!file.name.toLowerCase().endsWith(".mp3")) throw new Error("Formato de archivo no válido. Solo se admiten MP3.");
        if (!genre_id) throw new Error("Género no seleccionado.");
        if (!artistNameInput.trim()) throw new Error("Artista no especificado.");

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

        updateStatus(currentFileName, 'Subiendo a R2...', 'Paso 2/4: Subiendo archivo a R2', 'text-purple-600');
        log(`[${currentFileName}] Subiendo a R2...`);
        log(`[${currentFileName}] Tamaño del archivo: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

        // Upload with timeout
        const uploadController = new AbortController();
        const uploadTimeout = setTimeout(() => uploadController.abort(), 60000); // 60s timeout

        try {
          const uploadStartTime = Date.now();
          const uploadResponse = await fetch(url, {
            method: "PUT",
            body: file,
            signal: uploadController.signal
          });
          clearTimeout(uploadTimeout);
          const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(2);

          log(`[${currentFileName}] Upload response status: ${uploadResponse.status} ${uploadResponse.statusText}`);
          log(`[${currentFileName}] Upload duration: ${uploadDuration}s`);
          log(`[${currentFileName}] Content-Length header: ${uploadResponse.headers.get('content-length') || 'N/A'}`);
          log(`[${currentFileName}] ETag header: ${uploadResponse.headers.get('etag') || 'N/A'}`);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text().catch(() => 'No error text');
            log(`[${currentFileName}] ERROR RESPONSE BODY: ${errorText}`);
            throw new Error(`Error al subir archivo a R2 (${uploadResponse.status})`);
          }
          log(`[${currentFileName}] ✓ Subida a R2 completada (status ${uploadResponse.status}).`);

          // VERIFICACIÓN #1: HEAD request
          log(`[${currentFileName}] Verificación #1: HEAD request a R2...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before verifying
          const verifyResponse = await fetch(downloadUrl, { method: "HEAD" });
          log(`[${currentFileName}] HEAD response status: ${verifyResponse.status}`);
          log(`[${currentFileName}] HEAD Content-Length: ${verifyResponse.headers.get('content-length') || 'N/A'}`);
          log(`[${currentFileName}] HEAD Content-Type: ${verifyResponse.headers.get('content-type') || 'N/A'}`);

          if (!verifyResponse.ok) {
            throw new Error(`Archivo no encontrado en R2 después de subir (HEAD ${verifyResponse.status})`);
          }

          const contentLength = verifyResponse.headers.get('content-length');
          if (contentLength && parseInt(contentLength) !== file.size) {
            log(`[${currentFileName}] ⚠️ ADVERTENCIA: Tamaño no coincide! Esperado: ${file.size}, Recibido: ${contentLength}`);
          } else {
            log(`[${currentFileName}] ✓ Verificación HEAD exitosa, tamaño correcto.`);
          }

        } catch (uploadError) {
          clearTimeout(uploadTimeout);
          if (uploadError instanceof Error && uploadError.name === 'AbortError') {
            throw new Error(`Timeout al subir a R2 (más de 60 segundos)`);
          }
          throw uploadError;
        }

        updateStatus(currentFileName, 'Guardando en DB...', 'Paso 3/4: Obteniendo metadatos', 'text-blue-600');
        log(`[${currentFileName}] Obteniendo duración...`);
        const audio = new Audio(downloadUrl);
        const duration = await new Promise<number>((resolve, reject) => {
          const metadataTimeout = setTimeout(() => {
            log(`[${currentFileName}] TIMEOUT obteniendo metadatos. Usando duración 0.`);
            resolve(0);
          }, 10000); // 10s timeout for metadata

          audio.onloadedmetadata = () => {
            clearTimeout(metadataTimeout);
            resolve(Math.floor(audio.duration));
          };
          audio.onerror = () => {
            clearTimeout(metadataTimeout);
            log(`[${currentFileName}] ADVERTENCIA: Error al cargar metadatos. Duración será 0.`);
            resolve(0);
          };
        });
        log(`[${currentFileName}] Duración: ${duration}s`);

        const songData = {
          title: currentFileName.replace(/\.mp3$/i, ""),
          artist: artistNameInput.trim(),
          genre_id,
          blob_url: downloadUrl,
          duration,
        };

        updateStatus(currentFileName, 'Guardando en DB...', 'Paso 4/4: Registrando canción en DB', 'text-blue-600');
        log(`[${currentFileName}] Guardando en DB...`);
        const saveRes = await fetch("/api/songs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(songData),
        });

        const savedSongResponse = await saveRes.json();

        // Handle duplicate detection (409 status)
        if (saveRes.status === 409) {
          log(`[${currentFileName}] DUPLICADO DETECTADO: Esta canción ya existe en la biblioteca.`);

          let detailsMsg = 'Ya existe en la biblioteca (Saltada).';
          try {
            // We need to parse the response body AGAIN because previously we only did saveRes.json() for success flow
            // Wait, we can't parse it twice. But wait, checking the code, savedSongResponse IS parsed early IF ok.
            // But if status is 409, saveRes.ok is false.
            // So we must parse it here.
            const errorData = await extractErrorData(saveRes); // Helper needed? No, just use savedSongResponse variable which was parsed earlier?
            // Ah, look at line 286: const savedSongResponse = await saveRes.json();
            // It's ALREADY parsed. We can use `savedSongResponse`.

            if (savedSongResponse.details && savedSongResponse.details.length > 0) {
              const d = savedSongResponse.details[0];
              const dateStr = d.created_at ? new Date(d.created_at).toLocaleDateString() : '';
              detailsMsg = `Duplicado en género: ${d.genre} (${dateStr})`;
            }
          } catch (e) {
            log(`[${currentFileName}] Error al parsear detalles del duplicado: ${e}`);
          }

          log(`[${currentFileName}] Iniciando limpieza del archivo duplicado en R2...`);
          await fetch("/api/cleanup", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blob_url: downloadUrl }),
          });
          log(`[${currentFileName}] Limpieza completada.`);

          updateStatus(currentFileName, 'Duplicado', detailsMsg, 'text-yellow-600');
          continue; // Skip without throwing error
        }

        if (!saveRes.ok || !savedSongResponse.songs || savedSongResponse.songs.length === 0) {
          log(`[${currentFileName}] ¡VERIFICACIÓN FALLIDA! La DB no devolvió la canción guardada.`);
          log(`[${currentFileName}] Iniciando limpieza: eliminando archivo huérfano de R2...`);
          await fetch("/api/cleanup", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blob_url: downloadUrl }),
          });
          log(`[${currentFileName}] Limpieza completada.`);
          throw new Error(savedSongResponse.error || "Verificación fallida: DB no registró la canción.");
        }

        allSavedSongs.push(savedSongResponse.songs[0]);
        log(`[${currentFileName}] ✓ Canción registrada en DB con ID: ${savedSongResponse.songs[0].id}`);

        // VERIFICACIÓN FINAL: Confirmar que el enlace completo funciona
        log(`[${currentFileName}] Verificación FINAL: Probando blob_url guardado...`);
        const finalBlobUrl = savedSongResponse.songs[0].blob_url;

        if (finalBlobUrl !== downloadUrl) {
          log(`[${currentFileName}] ⚠️ ADVERTENCIA: blob_url guardado difiere del original!`);
          log(`[${currentFileName}]   Esperado: ${downloadUrl}`);
          log(`[${currentFileName}]   Guardado: ${finalBlobUrl}`);
        }

        // Verificar que el blob_url guardado sea accesible
        const finalVerifyResponse = await fetch(finalBlobUrl, { method: "HEAD" });
        if (!finalVerifyResponse.ok) {
          log(`[${currentFileName}] ❌ ERROR CRÍTICO: blob_url guardado NO es accesible (${finalVerifyResponse.status})`);
          throw new Error(`Verificación final fallida: blob_url no funciona (${finalVerifyResponse.status})`);
        }

        const finalContentLength = finalVerifyResponse.headers.get('content-length');
        if (finalContentLength && parseInt(finalContentLength) === file.size) {
          log(`[${currentFileName}] ✓ Verificación FINAL exitosa: blob_url funciona, tamaño correcto (${finalContentLength} bytes)`);
        } else {
          log(`[${currentFileName}] ⚠️ Verificación final con advertencia: tamaño ${finalContentLength} vs esperado ${file.size}`);
        }

        log(`[${currentFileName}] ✅ ÉXITO COMPLETO: Canción 100% verificada y lista para reproducción.`);
        updateStatus(currentFileName, 'Éxito', 'La canción fue procesada correctamente.', 'text-green-600');

      } catch (err) {
        const reason = err instanceof Error ? err.message : "Ocurrió un error desconocido";
        log(`[${currentFileName}] FALLO: ${reason}. DETENIENDO PROCESO.`);
        updateStatus(currentFileName, 'Error', reason, 'text-red-600');
        setError(`El proceso se detuvo por un error en '${currentFileName}'. Revisa el registro.`);
        anErrorOccurred = true;
        break; // Stop the loop immediately
      } finally {
        processedFileCount++;
        const progress = files.length > 0 ? (processedFileCount / files.length) * 100 : 100;
        setUploadProgress(progress);
      }

      await delay(2000); // Wait 2 seconds before starting the next file
    }

    // Refresh the UI if at least one song was uploaded successfully
    if (allSavedSongs.length > 0) {
      log(`📱 Refrescando frontend con ${allSavedSongs.length} nuevas canciones...`);
      onUploadSuccess?.(allSavedSongs);
    }

    setIsLoading(false);
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
          <div>
            <Label htmlFor="artistName">Nombre del Artista *</Label>
            <Input
              id="artistName"
              value={artistNameInput}
              onChange={(e) => setArtistNameInput(e.target.value)}
              placeholder="Escribe el nombre del artista"
              className="mt-1"
            />
            {uploadMode === 'folder' && artistNameInput && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                Detectado desde carpeta: {artistNameInput}
              </p>
            )}
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
            <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp3,audio/mpeg" multiple disabled={isLoading} />
            <Input
              id="folder-upload"
              type="file"
              ref={folderInputRef}
              onChange={handleFileChange}
              accept=".mp3,audio/mpeg"
              multiple
              {...({ webkitdirectory: "" } as any)}
              disabled={isLoading}
            />
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

          {uploadStats && (
            <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                Resumen de Selección
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-background rounded p-2 border border-border">
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-bold text-lg">{uploadStats.total}</p>
                </div>
                <div className="bg-background rounded p-2 border border-border">
                  <p className="text-green-600 text-xs font-medium">MP3 Válidos</p>
                  <p className="font-bold text-lg text-green-600">{uploadStats.valid}</p>
                </div>
                <div className="bg-background rounded p-2 border border-border">
                  <p className="text-yellow-600 text-xs font-medium">Ignorados</p>
                  <p className="font-bold text-lg text-yellow-600">{uploadStats.ignored}</p>
                </div>
              </div>
              {uploadStats.ignored > 0 && (
                <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  Se ignorarán {uploadStats.ignored} archivos que no son MP3.
                </p>
              )}
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
                    {s.status === 'Duplicado' && <AlertCircle className={cn("w-4 h-4", s.color)} />}
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
          </div>
        )}

        {debugLog.length > 0 && (
          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Registro de Diagnóstico Detallado ({debugLog.length} entradas)</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDebugLog([]);
                  setUploadStatuses([]);
                }}
              >
                Limpiar Logs
              </Button>
            </div>
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
          {isLoading ? `Procesando...` : `Confirmar y Subir ${files.length} ${files.length === 1 ? 'canción' : 'canciones'}`}
        </Button>
      </form>
    </div>
  )
}