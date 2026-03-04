// force redeploy #4 - Folder-by-folder upload with integrity verification
"use client"

import { toast } from "sonner"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Upload, Music, AlertCircle, FileCheck, FileX, Loader2, CheckCircle2, XCircle, Folder, FileAudio, AlertTriangle, ShieldCheck } from "lucide-react"
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

// State for each folder's upload progress and verification result
interface FolderStatus {
  name: string;
  expected: number;       // valid .mp3 count detected before upload
  uploaded: number;       // successfully uploaded in this session
  errors: number;         // failed uploads
  duplicates: number;     // skipped as duplicates
  verified: number | null; // confirmed count in Supabase after upload (null = not yet verified)
  status: 'pending' | 'uploading' | 'verifying' | 'complete' | 'incomplete' | 'warning';
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
  const formRef = useRef<HTMLFormElement>(null)

  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>(preselectedArtist ? 'files' : 'folder');
  const [artistNameInput, setArtistNameInput] = useState(preselectedArtist || "");
  const [isDragActive, setIsDragActive] = useState(false);

  /* Folder-level status tracking */
  const [folderStatuses, setFolderStatuses] = useState<FolderStatus[]>([]);
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
    setFolderStatuses([]);
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
          // @ts-ignore
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
    setIsLoading(true);

    try {
      const items = e.dataTransfer.items;
      let allFiles: File[] = [];

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
        allFiles = Array.from(e.dataTransfer.files);
      }

      processFiles(allFiles, false);
    } catch (err) {
      console.error("Error scanning files:", err);
      setError("Error al leer los archivos arrastrados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Shared processing logic - ACCUMULATIVE
  const processFiles = (newFiles: File[], accumulate = false) => {
    setError(null);
    setUploadStatuses([]);
    setFolderStatuses([]);

    const validNewFiles = newFiles.filter(f =>
      f.name.toLowerCase().endsWith('.mp3')
    );
    const ignoredCount = newFiles.length - validNewFiles.length;

    const baseFiles = accumulate ? files : [];

    const filesByFolder = new Map<string, Set<string>>();

    for (const file of baseFiles) {
      const relativePath = (file as any).path_override || file.webkitRelativePath || file.name;
      const folderPath = relativePath.includes('/')
        ? relativePath.substring(0, relativePath.lastIndexOf('/'))
        : 'root';
      const normalizedFileName = file.name.toLowerCase();
      if (!filesByFolder.has(folderPath)) filesByFolder.set(folderPath, new Set());
      filesByFolder.get(folderPath)!.add(normalizedFileName);
    }

    const addedFiles: File[] = [];
    let duplicateCount = 0;

    for (const file of validNewFiles) {
      const relativePath = (file as any).path_override || file.webkitRelativePath || file.name;
      const folderPath = relativePath.includes('/')
        ? relativePath.substring(0, relativePath.lastIndexOf('/'))
        : 'root';
      const normalizedFileName = file.name.toLowerCase();

      if (!filesByFolder.has(folderPath)) filesByFolder.set(folderPath, new Set());
      const filesInFolder = filesByFolder.get(folderPath)!;

      if (filesInFolder.has(normalizedFileName)) {
        duplicateCount++;
        continue;
      }

      filesInFolder.add(normalizedFileName);
      addedFiles.push(file);
    }

    const combined = [...baseFiles, ...addedFiles];

    setUploadStats({
      total: combined.length,
      valid: combined.length,
      ignored: ignoredCount + duplicateCount
    });

    setFiles(combined);

    if (duplicateCount > 0) {
      toast.warning(`Se encontraron ${duplicateCount} archivos duplicados y fueron omitidos.`);
    }

    if (addedFiles.length > 0) {
      toast.success(`${addedFiles.length} canciones añadidas.`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files), true);
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

  const updateFolderStatus = (folderName: string, update: Partial<FolderStatus>) => {
    setFolderStatuses(prev => prev.map(fs =>
      fs.name === folderName ? { ...fs, ...update } : fs
    ));
  };

  /**
   * Verifies that the number of songs in Supabase for a given artist+genre
   * matches the expected count. Returns actual count from DB.
   */
  const verifyFolderIntegrity = async (artistName: string, genreId: string, expectedCount: number): Promise<{ actual: number; ok: boolean }> => {
    try {
      const res = await fetch(`/api/songs?artist=${encodeURIComponent(artistName)}&genre_id=${encodeURIComponent(genreId)}&count_only=true`);
      if (!res.ok) return { actual: -1, ok: false };
      const data = await res.json();
      const actual = data.count ?? 0;
      return { actual, ok: actual === expectedCount };
    } catch {
      return { actual: -1, ok: false };
    }
  };

  /**
   * Upload a single file to R2 and save its metadata to Supabase.
   * Returns 'success' | 'duplicate' | 'error'
   */
  const uploadSingleFile = async (
    file: File,
    finalArtistName: string,
    genreId: string,
    allSavedSongs: any[],
    attempt = 1
  ): Promise<'success' | 'duplicate' | 'error'> => {
    const currentFileName = file.name;
    try {
      log(`[${currentFileName}] Intento ${attempt}...`);

      updateStatus(currentFileName, 'Subiendo a R2...', `Artista: ${finalArtistName} | Paso 1/4: Obteniendo URL`, 'text-purple-600');

      const presignResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: currentFileName, contentType: file.type, fileSize: file.size }),
      });
      if (!presignResponse.ok) throw new Error(`No se pudo obtener la URL de subida (${presignResponse.status})`);
      const { url, downloadUrl, accountNumber } = await presignResponse.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            const loadedMB = (event.loaded / 1048576).toFixed(1);
            const totalMB = (event.total / 1048576).toFixed(1);
            updateStatus(currentFileName, 'Subiendo a R2...', `Subiendo... ${percent}% (${loadedMB}/${totalMB} MB)`, 'text-purple-600');
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Error al subir a R2 (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error('Error de red al subir el archivo. Verifica tu conexión.'));
        xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado al subir el archivo.'));
        xhr.timeout = 600000; // 10 minutes

        xhr.send(file);
      });

      updateStatus(currentFileName, 'Guardando en DB...', 'Paso 2/4: Obteniendo duración...', 'text-blue-600');

      const audio = new Audio(downloadUrl);
      const duration = await new Promise<number>((resolve) => {
        const t = setTimeout(() => resolve(0), 5000);
        audio.onloadedmetadata = () => { clearTimeout(t); resolve(Math.floor(audio.duration)); };
        audio.onerror = () => { clearTimeout(t); resolve(0); };
      });

      const songData = {
        title: currentFileName.replace(/\.mp3$/i, ""),
        artist: finalArtistName,
        genre_id: genreId,
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
        return 'duplicate';
      }

      if (!saveRes.ok) throw new Error(savedSongResponse.error || "Error DB");

      allSavedSongs.push(savedSongResponse.songs[0]);
      updateStatus(currentFileName, 'Éxito', 'OK', 'text-green-600');
      return 'success';

    } catch (err) {
      const reason = err instanceof Error ? err.message : "Error desconocido";
      updateStatus(currentFileName, 'Error', reason, 'text-red-600');
      log(`[${currentFileName}] Error: ${reason}`);
      return 'error';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadProgress(0);
    setDebugLog([]);
    setFolderStatuses([]);

    setIsLoading(true);
    setUploadStatuses(files.map(f => ({ fileName: f.name, status: 'Pendiente', message: 'En espera para procesar', color: 'text-muted-foreground' })));

    // ── STEP 1: Group files by folder ──────────────────────────────────────
    const folderMap = new Map<string, File[]>();
    for (const file of files) {
      const relativePath = (file as any).path_override || file.webkitRelativePath || '';
      let folderName: string;
      if (relativePath.includes('/')) {
        const parts = relativePath.split('/');
        folderName = parts[parts.length - 2];
      } else {
        folderName = artistNameInput.trim() || 'Archivos sueltos';
      }
      if (!folderMap.has(folderName)) folderMap.set(folderName, []);
      folderMap.get(folderName)!.push(file);
    }

    // Initialize folder statuses
    const initialFolderStatuses: FolderStatus[] = Array.from(folderMap.entries()).map(([name, folderFiles]) => ({
      name,
      expected: folderFiles.length,
      uploaded: 0,
      errors: 0,
      duplicates: 0,
      verified: null,
      status: 'pending'
    }));
    setFolderStatuses(initialFolderStatuses);

    // Local tracker to avoid stale React state in async closure
    let localCompletedCount = 0;

    const allSavedSongs: any[] = [];
    let totalProcessed = 0;

    // ── STEP 2: Process folder by folder ──────────────────────────────────
    for (const [folderName, folderFiles] of folderMap.entries()) {
      log(`\n📁 Procesando carpeta: ${folderName} (${folderFiles.length} archivos)`);
      updateFolderStatus(folderName, { status: 'uploading' });

      let folderUploaded = 0;
      let folderErrors = 0;
      let folderDuplicates = 0;

      // Upload each file in this folder
      for (const file of folderFiles) {
        const result = await uploadSingleFile(file, folderName, genre_id, allSavedSongs);

        if (result === 'success') {
          folderUploaded++;
        } else if (result === 'duplicate') {
          folderDuplicates++;
        } else {
          folderErrors++;
        }

        totalProcessed++;
        setUploadProgress((totalProcessed / files.length) * 100);
        updateFolderStatus(folderName, { uploaded: folderUploaded, errors: folderErrors, duplicates: folderDuplicates });
      }

      // ── STEP 3: Retry failed files (max 2 attempts) ──────────────────────
      if (folderErrors > 0) {
        log(`⚠️ ${folderErrors} errores en ${folderName}. Reintentando archivos fallidos...`);
        toast.loading(`Reintentando archivos fallidos de "${folderName}"...`, { id: `retry-${folderName}` });

        const failedFiles = folderFiles.filter(file => {
          const status = uploadStatuses.find(s => s.fileName === file.name);
          return status?.status === 'Error';
        });

        let retriedSuccess = 0;
        for (const file of failedFiles) {
          const result = await uploadSingleFile(file, folderName, genre_id, allSavedSongs, 2);
          if (result === 'success') {
            retriedSuccess++;
            folderUploaded++;
            folderErrors--;
          }
        }

        toast.dismiss(`retry-${folderName}`);
        if (retriedSuccess > 0) {
          log(`✅ ${retriedSuccess} archivos recuperados en el reintento.`);
          updateFolderStatus(folderName, { uploaded: folderUploaded, errors: folderErrors });
        }
      }

      // ── STEP 4: Verify folder integrity (origin == destination) ──────────
      log(`🔍 Verificando integridad de "${folderName}"...`);
      updateFolderStatus(folderName, { status: 'verifying' });

      // Expected = files uploaded successfully + duplicates that were already in DB
      // Duplicates are NOT new, but they are still "accounted for" 
      // We only count truly new uploads for the expected in Supabase
      const expectedInDB = folderUploaded; // only the new ones we uploaded
      const { actual, ok } = await verifyFolderIntegrity(folderName, genre_id, expectedInDB);

      if (actual === -1) {
        // Verification failed (network error etc.)
        log(`⚠️ No se pudo verificar "${folderName}" (error de red).`);
        updateFolderStatus(folderName, { verified: null, status: 'warning' });
        toast.warning(`No se pudo verificar la integridad de "${folderName}".`);
      } else if (ok) {
        log(`✅ Carpeta "${folderName}" verificada: ${actual} canciones en Supabase.`);
        updateFolderStatus(folderName, { verified: actual, status: 'complete' });
        localCompletedCount++;
      } else {
        // Mismatch detected
        const missing = expectedInDB - actual;
        log(`❌ Discrepancia en "${folderName}": esperados=${expectedInDB}, en DB=${actual}, faltantes=${missing}`);
        updateFolderStatus(folderName, { verified: actual, status: 'incomplete' });
        toast.error(
          `⚠️ "${folderName}": se subieron ${folderUploaded} canciones pero Supabase muestra ${actual}. Diferencia: ${missing}.`,
          { duration: 10000 }
        );
      }
    }

    if (allSavedSongs.length > 0) {
      onUploadSuccess?.(allSavedSongs);
    }

    setIsLoading(false);

    // Final summary toast — use local variable (not React state, which is stale in async closures)
    const totalFolders = folderMap.size;
    if (localCompletedCount === totalFolders) {
      toast.success(`✅ ¡Subida completa! ${totalFolders} ${totalFolders === 1 ? 'carpeta verificada' : 'carpetas verificadas'} al 100%.`);
    } else {
      const incomplete = totalFolders - localCompletedCount;
      toast.warning(`Subida finalizada: ${localCompletedCount}/${totalFolders} carpetas completas. ${incomplete} con advertencias — revisa el detalle.`, { duration: 8000 });
    }
  }

  // Helper to render folder status icon
  const FolderStatusIcon = ({ status }: { status: FolderStatus['status'] }) => {
    if (status === 'complete') return <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />;
    if (status === 'incomplete') return <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    if (status === 'warning') return <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
    if (status === 'verifying') return <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />;
    if (status === 'uploading') return <Loader2 className="w-4 h-4 animate-spin text-purple-500 flex-shrink-0" />;
    return <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-4">
      <h3 className="text-lg font-semibold flex items-center gap-2 flex-shrink-0">
        <Upload className="w-5 h-5 text-purple-600" />
        Subir Música
      </h3>

      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 transition-colors text-center cursor-pointer flex-shrink-0",
          isDragActive ? "border-purple-500 bg-purple-50/50 dark:bg-purple-900/20" : "border-border hover:border-purple-400 bg-secondary/20",
          isLoading && "opacity-50 pointer-events-none"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => uploadMode === 'files' ? fileInputRef.current?.click() : folderInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 rounded-full bg-background border shadow-sm">
            {uploadMode === 'files' ? <FileAudio className="w-7 h-7 text-purple-500" /> : <Folder className="w-7 h-7 text-purple-500" />}
          </div>
          <div>
            <p className="font-medium">
              {isDragActive ? "¡Suelta aquí!" : "Arrastra carpetas o archivos aquí"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Múltiples carpetas a la vez. El artista se toma del nombre de la carpeta.
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable form area */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: '55vh' }}>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">

          {/* Artist Input - Only show if not auto-detected from folders */}
          {(!files.some(f => (f as any).path_override || f.webkitRelativePath.includes('/'))) && (
            <div>
              <Label htmlFor="artist">Nombre del Artista / Carpeta *</Label>
              <Input
                id="artist"
                placeholder="Ej: Marc Anthony"
                value={artistNameInput}
                onChange={(e) => setArtistNameInput(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          )}

          {/* Genre Selection */}
          <div>
            <Label htmlFor="genre">Género *</Label>
            <Select value={genre_id} onValueChange={setGenreId} disabled={isLoading || !!preselectedGenreId}>
              <SelectTrigger><SelectValue placeholder="Selecciona el género..." /></SelectTrigger>
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

          {/* Mode Toggle */}
          <div className="flex gap-2 justify-center text-sm text-muted-foreground">
            <span>O selecciona manualmente:</span>
            <button type="button" onClick={() => setUploadMode('folder')} className={cn("hover:text-foreground underline", uploadMode === 'folder' && "font-bold text-foreground")}>Carpeta</button>
            <button type="button" onClick={() => setUploadMode('files')} className={cn("hover:text-foreground underline", uploadMode === 'files' && "font-bold text-foreground")}>Archivos</button>
          </div>

          {/* === PRE-UPLOAD PREVIEW (before upload starts) === */}
          {files.length > 0 && !isLoading && folderStatuses.length === 0 && (() => {
            const vagones = new Map<string, number>();
            for (const file of files) {
              const relativePath = (file as any).path_override || file.webkitRelativePath || '';
              const folderName = relativePath.includes('/')
                ? relativePath.split('/')[relativePath.split('/').length - 2]
                : (artistNameInput || 'Archivos sueltos');
              vagones.set(folderName, (vagones.get(folderName) || 0) + 1);
            }
            const vagonList = Array.from(vagones.entries());

            return (
              <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Folder className="w-4 h-4 text-purple-500" />
                    <span>{vagonList.length} {vagonList.length === 1 ? 'Carpeta' : 'Carpetas'} — {files.length} canciones</span>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive h-7"
                    onClick={() => {
                      setFiles([]);
                      setUploadStats(null);
                      setUploadStatuses([]);
                      setFolderStatuses([]);
                      if (folderInputRef.current) folderInputRef.current.value = '';
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      toast.info('Selección limpiada.');
                    }}
                  >
                    🗑 Limpiar
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {vagonList.map(([nombre, count], i) => (
                    <div key={nombre} className="flex items-center gap-3 bg-background/60 rounded-lg px-3 py-2 text-sm border border-border/40">
                      <span className="text-purple-400 font-mono text-xs w-5 text-center">{i + 1}</span>
                      <Folder className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span className="flex-1 font-medium truncate">{nombre}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{count} {count === 1 ? 'canción' : 'canciones'}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="w-full text-xs text-purple-400 hover:text-purple-300 border border-dashed border-purple-500/40 rounded-lg py-2 transition-colors hover:border-purple-400"
                  disabled={isLoading}
                >
                  + Agregar otra carpeta
                </button>
              </div>
            );
          })()}

          {/* === FOLDER-BY-FOLDER UPLOAD STATUS (during & after upload) === */}
          {folderStatuses.length > 0 && (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                Estado de subida por carpeta:
              </p>
              <div className="space-y-2">
                {folderStatuses.map((fs) => {
                  const progressPct = fs.expected > 0
                    ? Math.round(((fs.uploaded + fs.errors + fs.duplicates) / fs.expected) * 100)
                    : 0;

                  return (
                    <div
                      key={fs.name}
                      className={cn(
                        "rounded-lg border p-3 space-y-2 transition-colors",
                        fs.status === 'complete' && "border-green-500/40 bg-green-500/5",
                        fs.status === 'incomplete' && "border-red-500/40 bg-red-500/5",
                        fs.status === 'warning' && "border-yellow-500/40 bg-yellow-500/5",
                        fs.status === 'uploading' && "border-purple-500/40 bg-purple-500/5",
                        fs.status === 'verifying' && "border-blue-500/40 bg-blue-500/5",
                        fs.status === 'pending' && "border-border/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FolderStatusIcon status={fs.status} />
                        <span className="font-semibold text-sm flex-1 truncate">{fs.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {fs.status === 'complete' && fs.verified !== null
                            ? `✅ ${fs.verified}/${fs.expected} verificadas`
                            : fs.status === 'incomplete' && fs.verified !== null
                              ? `❌ ${fs.verified}/${fs.expected} en DB`
                              : fs.status === 'verifying'
                                ? 'Verificando en Supabase...'
                                : fs.status === 'uploading'
                                  ? `${fs.uploaded + fs.errors + fs.duplicates}/${fs.expected} procesadas`
                                  : fs.status === 'warning'
                                    ? '⚠️ Sin verificar'
                                    : `${fs.expected} canciones`}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {(fs.status === 'uploading' || fs.status === 'verifying') && (
                        <Progress value={progressPct} className="h-1.5" />
                      )}

                      {/* Detail stats */}
                      {(fs.uploaded > 0 || fs.errors > 0 || fs.duplicates > 0) && (
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          {fs.uploaded > 0 && <span className="text-green-600">✓ {fs.uploaded} subidas</span>}
                          {fs.duplicates > 0 && <span className="text-yellow-600">≡ {fs.duplicates} duplicadas</span>}
                          {fs.errors > 0 && <span className="text-red-600">✗ {fs.errors} errores</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual file status list */}
          {(isLoading || uploadStatuses.length > 0) && (
            <div className="space-y-2 max-h-60 overflow-y-auto p-4 border rounded-xl bg-secondary/10 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Detalle por archivo:</p>
              {uploadStatuses.map((s, i) => {
                const file = files.find(f => f.name === s.fileName);
                const path = file ? ((file as any).path_override || file.webkitRelativePath) : "";
                const folderName = path.includes('/') ? path.split('/')[path.split('/').length - 2] : "Archivos sueltos";

                return (
                  <div key={i} className="flex items-center gap-3 text-xs bg-background/50 p-2 rounded-lg border border-border/50">
                    <div className="flex-shrink-0">
                      {s.status === 'Éxito' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                        s.status === 'Error' ? <XCircle className="w-4 h-4 text-red-500" /> :
                          s.status === 'Duplicado' ? <AlertCircle className="w-4 h-4 text-yellow-500" /> :
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold truncate block">{s.fileName}</span>
                        <span className={cn("text-[10px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded bg-secondary/50", s.color)}>
                          {s.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                        <Folder className="w-3 h-3" />
                        <span className="truncate">{folderName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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

      {/* Overall progress bar */}
      {isLoading && (
        <div className="flex-shrink-0 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progreso total</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Submit button — always visible outside the scroll area */}
      <Button
        type="button"
        disabled={isLoading || files.length === 0 || !genre_id}
        className="w-full flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        onClick={() => {
          formRef.current?.requestSubmit();
        }}
      >
        {isLoading ? `Procesando...` : files.length > 0 ? `Subir ${files.length} canciones` : 'Subir'}
      </Button>
    </div>
  )
}
