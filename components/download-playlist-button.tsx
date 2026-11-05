"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface DownloadPlaylistProps {
  playlistId: string
  playlistName: string
  onDownloadStart?: () => void
  onDownloadComplete?: () => void
}

export function DownloadPlaylistButton({
  playlistId,
  playlistName,
  onDownloadStart,
  onDownloadComplete,
}: DownloadPlaylistProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "fetching" | "downloading" | "done" | "error">("idle")
  const [error, setError] = useState("")

  const cleanName = (name: string) =>
    (name || "Desconocido")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[<>:"/\\|?*]+/g, "_")
      .trim()

  const handleDownload = async () => {
    if (isDownloading) return

    // Verificar compatibilidad con File System Access API
    if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
      toast.error("Tu navegador no permite guardar carpetas directamente. Por favor utiliza Google Chrome o Microsoft Edge.")
      return
    }

    let dirHandle: FileSystemDirectoryHandle
    try {
      setStatus("fetching")
      setProgress(0)
      setError("")
      onDownloadStart?.()

      dirHandle = await (window as any).showDirectoryPicker({
        id: "lfplayer-playlist",
        mode: "readwrite",
      })
    } catch (err: any) {
      if (err.name === "AbortError") {
        return // Usuario canceló
      }
      toast.error(`Error al seleccionar carpeta: ${err.message}`)
      setStatus("idle")
      return
    }

    setIsDownloading(true)
    setStatus("downloading")

    try {
      // 1. Obtener lista de canciones de la playlist
      const res = await fetch(`/api/playlists/${playlistId}/download`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al obtener lista de canciones")
      }
      const { songs: songList, playlistName: serverPlaylistName } = await res.json()
      setProgress(5)

      const safePlaylistName = cleanName(serverPlaylistName || playlistName)

      // Cache de handles de carpetas para evitar llamadas redundantes
      const genreDirs = new Map<string, FileSystemDirectoryHandle>()
      const artistDirs = new Map<string, FileSystemDirectoryHandle>()

      // 2. Descargar y escribir directamente en la carpeta seleccionada
      for (let i = 0; i < songList.length; i++) {
        const song = songList[i]
        const safeGenre = cleanName(song.genre)
        const safeArtist = cleanName(song.artist || "Desconocido")
        const safeTitle = cleanName(song.title)
        
        setStatus("downloading")
        setProgress(5 + Math.round((i / songList.length) * 90))

        try {
          // Obtener o crear carpeta del género
          let gDir = genreDirs.get(safeGenre)
          if (!gDir) {
            gDir = await dirHandle.getDirectoryHandle(safeGenre, { create: true })
            genreDirs.set(safeGenre, gDir)
          }

          // Obtener o crear carpeta del artista dentro del género
          const artistKey = `${safeGenre}___${safeArtist}`
          let aDir = artistDirs.get(artistKey)
          if (!aDir) {
            aDir = await gDir.getDirectoryHandle(safeArtist, { create: true })
            artistDirs.set(artistKey, aDir)
          }

          // Crear archivo de la canción en la carpeta del artista
          const fileHandle = await aDir.getFileHandle(`${safeTitle}.mp3`, { create: true })

          // Descarga directa desde R2 hacia el archivo en el disco
          const audioRes = await fetch(song.url)
          if (audioRes.ok) {
            const writable = await fileHandle.createWritable()
            if (audioRes.body && "pipeTo" in audioRes.body) {
              await audioRes.body.pipeTo(writable)
            } else {
              const buf = await audioRes.arrayBuffer()
              await writable.write(buf)
              await writable.close()
            }
          } else {
            console.warn(`No se pudo descargar ${song.title}: ${audioRes.statusText}`)
          }
        } catch (e) {
          console.warn(`Error guardando ${song.title}:`, e)
        }
      }

      setProgress(100)
      setStatus("done")
      toast.success(`Playlist "${safePlaylistName}" descargada (${songList.length} canciones)`)
      onDownloadComplete?.()
    } catch (e: any) {
      setError(e.message || "Error inesperado")
      setStatus("error")
      toast.error(`Error al descargar: ${e.message}`)
    } finally {
      setIsDownloading(false)
    }
  }

  // Render simple button with status
  if (status === "downloading") {
    return (
      <button
        onClick={handleDownload}
        disabled
        className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
        title={`Descargando... ${progress}%`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    )
  }

  if (status === "done") {
    return (
      <button
        onClick={handleDownload}
        className="h-8 w-8 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center"
        title="Descarga completada"
      >
        <CheckCircle className="w-4 h-4" />
      </button>
    )
  }

  if (status === "error") {
    return (
      <button
        onClick={handleDownload}
        className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
        title={`Error: ${error}`}
      >
        <AlertCircle className="w-4 h-4" />
      </button>
    )
  }

  return (
    <button
      onClick={handleDownload}
      className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors"
      title="Descargar playlist en carpeta"
    >
      <Download className="w-4 h-4" />
    </button>
  )
}