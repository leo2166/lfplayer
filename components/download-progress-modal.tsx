"use client"

import { useEffect, useState } from "react"
import { Download, X, Music2, CheckCircle2, AlertCircle, FolderCheck, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"

interface DownloadProgressModalProps {
  isOpen: boolean
  total: number
  downloaded: number
  current: string
  folderName?: string
  status: "selecting" | "downloading" | "done" | "error"
  errorMsg?: string
  onClose: () => void
  onCancel?: () => void
}

export function DownloadProgressModal({
  isOpen,
  total,
  downloaded,
  current,
  folderName,
  status,
  errorMsg,
  onClose,
  onCancel,
}: DownloadProgressModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) setVisible(true)
    else {
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  if (!visible) return null

  const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0

  const statusLabel = {
    selecting: "Elige la carpeta o pendrive en el explorador...",
    downloading: `Guardando canción ${downloaded} de ${total}...`,
    done: "¡Biblioteca descargada exitosamente!",
    error: "Error en la descarga",
  }[status]

  const statusIcon = {
    selecting: <HardDrive className="w-6 h-6 text-amber-400 animate-pulse" />,
    downloading: <Download className="w-6 h-6 text-blue-400 animate-bounce" />,
    done: <CheckCircle2 className="w-6 h-6 text-green-400" />,
    error: <AlertCircle className="w-6 h-6 text-red-400" />,
  }[status]

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Glass */}
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Header gradient strip */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500" />

        <div className="p-6 space-y-5">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusIcon}
              <div>
                <h2 className="font-bold text-white text-lg leading-tight">Descarga a Pendrive / Disco</h2>
                <p className="text-xs text-white/50 mt-0.5">{statusLabel}</p>
              </div>
            </div>
            {(status === "done" || status === "error") && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Folder destination badge */}
          {folderName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
              <FolderCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Destino: <strong className="text-white">{folderName}</strong></span>
            </div>
          )}

          {/* Progress bar */}
          {status !== "error" && status !== "selecting" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/50">
                <span>{downloaded} / {total} canciones</span>
                <span className="font-mono font-bold text-white/80">{percent}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-200 ease-out"
                  style={{
                    width: `${percent}%`,
                    background: status === "done"
                      ? "linear-gradient(90deg, #22c55e, #16a34a)"
                      : "linear-gradient(90deg, #9333ea, #ec4899, #3b82f6)",
                    boxShadow: "0 0 12px rgba(147,51,234,0.6)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Current song */}
          {status === "downloading" && current && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              <Music2 className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />
              <p className="text-xs text-white/70 truncate">{current}</p>
            </div>
          )}

          {status === "error" && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{errorMsg || "Ocurrió un error inesperado."}</p>
            </div>
          )}

          {status === "done" && (
            <div className="space-y-3">
              <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400">
                  ¡Listo! {total} canciones guardadas y organizadas por Género y Artista directamente en tu carpeta/pendrive.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-colors shadow-lg shadow-green-600/30"
              >
                Cerrar
              </button>
            </div>
          )}

          {status === "downloading" && onCancel && (
            <div className="pt-2">
              <button
                onClick={onCancel}
                className="w-full py-1.5 px-3 rounded-lg border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/5 text-xs transition-colors"
              >
                Detener descarga (las canciones ya guardadas se conservarán)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
