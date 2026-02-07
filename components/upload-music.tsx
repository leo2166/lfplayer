// force redeploy #3 - Multi-folder Drag & Drop support
"use client"

import { toast } from "sonner"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Upload, Music, AlertCircle, FileCheck, FileX, Loader2, CheckCircle2, XCircle, Folder, FileAudio } from "lucide-react"
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

export default function UploadMusic({ genres, onUploadSuccess, preselectedArtist, preselectedGenreId }: UploadMusicProps) {
  const [genre_id, setGenreId] = useState(preselectedGenreId || "")
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Combined mode: user can drag anything. "files" vs "folder" purely for manual button trigger.
  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>(preselectedArtist ? 'files' : 'folder');
  const [artistNameInput, setArtistNameInput] = useState(preselectedArtist || "");
  const [isDragActive, setIsDragActive] = useState(false);

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
    setUploadStats(null);
    setError(null);
    setUploadStatuses([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
    if (!preselectedGenreId) {
      setGenreId("");
    }
  }

  useEffect(() => {
    resetState();
  }, [uploadMode]);

  // --- DRAG AND DROP LOGIC START ---

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  // Helper to traverse FileSystemDirectoryEntry
  const traverseFileTree = async (item: any, path = ""): Promise<File[]> => {
    if (item.isFile) {
      return new Promise((resolve) => {
        item.file((file: File) => {
          // Manually attach the full path relative to the root drop
          // @ts-ignore - we are monkey-patching webkitRelativePath for logic consistency
          file.path_override = path + file.name;
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            writable: true
          });
          resolve([file]);
        });
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      return new Promise((resolve) => {
        dirReader.readEntries(async (entries: any[]) => {
          const promises = entries.map((entry) => traverseFileTree(entry, path + item.name + "/"));
          const results = await Promise.all(promises);
          resolve(results.flat());
        });
      });
    }
    return [];
  };

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setIsLoading(true); // Temporary loading state while scanning

    try {
      const items = e.dataTransfer.items;
      let allFiles: File[] = [];

      // Use webkitGetAsEntry for recursive folder support
      if (items && items.length > 0) {
        const promises = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i].webkitGetAsEntry();
          if (item) {
            promises.push(traverseFileTree(item));
          }
        }
        const results = await Promise.all(promises);
        allFiles = results.flat();
      } else {
        // Fallback for browsers not supporting webkitGetAsEntry (rare nowadays)
        allFiles = Array.from(e.dataTransfer.files);
      }

      processFiles(allFiles);
    } catch (err) {
      console.error("Error scanning files:", err);
      setError("Error al leer los archivos arrastrados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Shared processing logic for both Drop and Input change
  const processFiles = (allFiles: File[]) => {
    setError(null);
    setUploadStatuses([]);

    // FILTER LOGIC - Only .mp3
    const validFiles = allFiles.filter(f =>
      f.name.toLowerCase().endsWith('.mp3')
    );
    const ignoredCount = allFiles.length - validFiles.length;

    // DETECT DUPLICATES within this batch
    const filesByFolder = new Map<string, Set<string>>();
    const deduplicatedFiles: File[] = [];
    let duplicateCount = 0;

    for (const file of validFiles) {
      // Use our override/shim or standard prop
      const relativePath = (file as any).path_override || file.webkitRelativePath || file.name;
      const folderPath = relativePath.includes('/')
        ? relativePath.substring(0, relativePath.lastIndexOf('/'))
        : 'root';

      const normalizedFileName = file.name.toLowerCase();

      if (!filesByFolder.has(folderPath)) {
        filesByFolder.set(folderPath, new Set<string>());
      }

      const filesInFolder = filesByFolder.get(folderPath)!;

      if (filesInFolder.has(normalizedFileName)) {
        duplicateCount++;
        continue;
      }

      filesInFolder.add(normalizedFileName);
      deduplicatedFiles.push(file);
    }

    setUploadStats({
      total: allFiles.length,
      valid: deduplicatedFiles.length,
      ignored: ignoredCount + duplicateCount
    });

    setFiles(deduplicatedFiles);

    if (duplicateCount > 0) {
      toast.warning(`Se encontraron ${duplicateCount} archivos duplicados en las mismas carpetas y fueron omitidos.`);
    }

    // Attempt to guess artist from the first valid file if in Folder mode or Drag mode
    if (deduplicatedFiles.length > 0) {
      const firstFile = deduplicatedFiles[0];
      const path = (firstFile as any).path_override || firstFile.webkitRelativePath;
      if (path && path.includes('/')) {
        const parts = path.split('/');
        // If dragging "Artist/Song.mp3", current input defaults to "Artist".
        setArtistNameInput(parts[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  // --- DRAG AND DROP LOGIC END ---


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

        // AUTO-DETECT ARTIST PER FILE
        // This is critical for mass uploads of different folders
        let finalArtistName = artistNameInput.trim();

        // Check file specific path
        const relativePath = (file as any).path_override || file.webkitRelativePath;

        if (relativePath && relativePath.includes('/')) {
          const pathParts = relativePath.split('/');
          // E.g. "Marc Anthony/Vivir.mp3" -> pathParts ["Marc Anthony", "Vivir.mp3"] -> Artist: Marc Anthony
          // E.g. "Music/Salsa/Marc Anthony/Vivir.mp3" -> Artist?

          // Heuristic:
          // 1. If length is 2 (Artist/Song), use part 0.
          // 2. If length >= 3 (Collection/Artist/Song), use part 1 (assuming user dropped a collection folder).
          // But if user dropped MULTIPLE folders directly (Artist A/..., Artist B/...), each file has path "Artist A/..." (len 2).

          if (pathParts.length === 2) {
            finalArtistName = pathParts[0];
          } else if (pathParts.length >= 3) {
            // If it looks like Collection/Artist/Song, take Artist.
            // But what if it's Artist/Album/Song (len 3)? Then Artist is part 0.
            // This is ambiguous. 
            // Let's stick to the previous logic which seemed to favor part 1 for deep structures, 
            // but let's prefer the "Folder Name" directly above the file? No, usually Artist is higher.

            // Let's assume standard "Artist/Album/Song" or "Artist/Song" implies Artist is mostly dominant.
            // User complaint suggests they want "Select Multiple Folders". 
            // If I select "Marc", "Gilberto". 
            // File 1: "Marc/Song1.mp3" -> Artist "Marc".
            // File 2: "Gilberto/Song2.mp3" -> Artist "Gilberto".

            // If I prioritize the TOP level folder for that specific file chain:
            finalArtistName = pathParts[0];

            // NOTE: Previous code used pathParts[1] for len >= 3. 
            // If user organized as "Salsa/Marc/Song", then "Salsa" is [0], "Marc" is [1].
            // If user drags "Salsa" folder, then [1] is correct.
            // If user drags "Marc" and "Gilberto" folders directly, then they are [0].

            // FIX: If we detected drag/multiple folders, we probably want the immediate parent of the tree?
            // Let's check `artistNameInput`. If the user manually edited the input to "Various", we might respect it?
            // But for "Mass Upload", auto-detection is key.

            // Let's use a smarter heuristic:
            // If the input field still matches the default detection (first folder name), then strictly use per-file folder [0].
            // If user changed input, maybe they want to override?
            // Actually, for mass upload, per-file is best.

            // Reverting to robust check:
            // If path has > 2 parts, check if part[0] is in our 'selection' list... too complex.
            // Let's default to part[0] (Top Level Folder Name) for this mass upload feature change.
            finalArtistName = pathParts[0];
          }
        }

        if (!finalArtistName) throw new Error("Artista no especificado.");

        updateStatus(currentFileName, 'Subiendo a R2...', `Artista: ${finalArtistName} | Paso 1/4: Obteniendo URL`, 'text-purple-600');

        // ... (Same upload logic as before) ...
        const presignResponse = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: currentFileName, contentType: file.type }),
        });
        if (!presignResponse.ok) throw new Error(`No se pudo obtener la URL de subida (${presignResponse.status})`);
        const { url, downloadUrl, accountNumber } = await presignResponse.json();

        // Upload to R2
        const uploadResponse = await fetch(url, { method: "PUT", body: file });
        if (!uploadResponse.ok) throw new Error(`Error al subir a R2 (${uploadResponse.status})`);

        // Metadata
        const audio = new Audio(downloadUrl);
        const duration = await new Promise<number>((resolve) => {
          const t = setTimeout(() => resolve(0), 5000);
          audio.onloadedmetadata = () => { clearTimeout(t); resolve(Math.floor(audio.duration)); };
          audio.onerror = () => { clearTimeout(t); resolve(0); };
        });

        const songData = {
          title: currentFileName.replace(/\.mp3$/i, ""),
          artist: finalArtistName,
          genre_id,
          blob_url: downloadUrl,
          duration,
          storage_account_number: accountNumber,
        };

        const saveRes = await fetch("/api/songs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(songData),
        });

        const savedSongResponse = await saveRes.json();

        if (saveRes.status === 409) {
          updateStatus(currentFileName, 'Duplicado', 'Ya existe en la biblioteca', 'text-yellow-600');
          await fetch("/api/cleanup", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blob_url: downloadUrl }) });
          continue;
        }

        if (!saveRes.ok) throw new Error(savedSongResponse.error || "Error DB");

        allSavedSongs.push(savedSongResponse.songs[0]);
        updateStatus(currentFileName, 'Éxito', 'OK', 'text-green-600');

      } catch (err) {
        const reason = err instanceof Error ? err.message : "Error desconocido";
        updateStatus(currentFileName, 'Error', reason, 'text-red-600');
        anErrorOccurred = true;
        // Don't break loop, try next file! (Better for mass upload)
      } finally {
        processedFileCount++;
        setUploadProgress((processedFileCount / files.length) * 100);
      }
    }

    if (allSavedSongs.length > 0) {
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

      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer mb-6",
          isDragActive ? "border-purple-500 bg-purple-50/50 dark:bg-purple-900/20" : "border-border hover:border-purple-400 bg-secondary/20",
          isLoading && "opacity-50 pointer-events-none"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => uploadMode === 'files' ? fileInputRef.current?.click() : folderInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-full bg-background border shadow-sm">
            {uploadMode === 'files' ? <FileAudio className="w-8 h-8 text-purple-500" /> : <Folder className="w-8 h-8 text-purple-500" />}
          </div>
          <div>
            <p className="font-medium text-lg">
              {isDragActive ? "¡Suelta las carpetas aquí!" : "Arrastra y suelta carpetas o archivos aquí"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Soporta múltiples carpetas a la vez. <br />
              Se detectará el artista automáticamente del nombre de la carpeta.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Genre Selection */}
        <div>
          <Label htmlFor="genre">Género para todas las canciones *</Label>
          <Select value={genre_id} onValueChange={setGenreId} disabled={isLoading || !!preselectedGenreId}>
            <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
            <SelectContent>
              {genres.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Hidden Inputs */}
        <div className="hidden">
          <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp3,audio/mpeg" multiple disabled={isLoading} />
          <Input id="folder-upload" type="file" ref={folderInputRef} onChange={handleFileChange} accept=".mp3,audio/mpeg" multiple {...({ webkitdirectory: "" } as any)} disabled={isLoading} />
        </div>

        {/* Mode Toggle (Secondary) */}
        <div className="flex gap-2 justify-center text-sm text-muted-foreground">
          <span>O selecciona manualmente:</span>
          <button type="button" onClick={() => setUploadMode('folder')} className={cn("hover:text-foreground underline", uploadMode === 'folder' && "font-bold text-foreground")}>Carpeta</button>
          <button type="button" onClick={() => setUploadMode('files')} className={cn("hover:text-foreground underline", uploadMode === 'files' && "font-bold text-foreground")}>Archivos</button>
        </div>

        {/* Stats Summary */}
        {uploadStats && (
          <div className="bg-secondary/30 p-3 rounded-lg text-sm grid grid-cols-3 gap-2 text-center">
            <div><span className="block font-bold mb-1">{uploadStats.total}</span>Total</div>
            <div><span className="block font-bold text-green-600 mb-1">{uploadStats.valid}</span>Válidos</div>
            <div><span className="block font-bold text-yellow-600 mb-1">{uploadStats.ignored}</span>Ignorados</div>
          </div>
        )}

        {/* Status List */}
        {isLoading && (
          <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded bg-background">
            {uploadStatuses.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {s.status === 'Éxito' ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                <span className="truncate flex-1">{s.fileName}</span>
                <span className={s.color}>{s.message}</span>
              </div>
            ))}
          </div>
        )}

        <Button type="submit" disabled={isLoading || files.length === 0 || !genre_id} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
          {isLoading ? `Procesando...` : `Subir ${files.length} Canciones`}
        </Button>

        {debugLog.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground font-mono">Registro de operaciones:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    const text = debugLog.join('\n');
                    navigator.clipboard.writeText(text);
                    toast.success("Logs copiados al portapapeles");
                  }}
                >
                  Copiar Logs
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-destructive hover:text-destructive"
                  onClick={() => setDebugLog([])}
                >
                  Limpiar
                </Button>
              </div>
            </div>
            <div className="bg-black/80 p-2 rounded text-xs font-mono text-green-400 h-24 overflow-y-auto whitespace-pre-wrap">
              {debugLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}