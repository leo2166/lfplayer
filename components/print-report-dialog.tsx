"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useMusicLibrary } from "@/contexts/MusicLibraryContext"
import { FileText, Loader2, Printer, Music, Folder, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PrintReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface GenreStats {
  id: string
  name: string
  color: string
  totalSongs: number
  folders: { name: string; count: number }[]
}

export default function PrintReportDialog({ open, onOpenChange }: PrintReportDialogProps) {
  const { songs, genres } = useMusicLibrary()
  const [isGenerating, setIsGenerating] = useState(false)
  const [storageStats, setStorageStats] = useState<any>(null)
  const [isFetchingStats, setIsFetchingStats] = useState(false)

  // Cargar stats de almacenamiento cuando se abre el modal
  useEffect(() => {
    if (open && !storageStats && !isFetchingStats) {
      setIsFetchingStats(true)
      fetch('/api/storage-status')
        .then(res => res.json())
        .then(data => {
          if (!data.error) setStorageStats(data)
        })
        .catch(err => console.error("Error fetching storage stats:", err))
        .finally(() => setIsFetchingStats(false))
    }
  }, [open, storageStats, isFetchingStats])

  // Calcular estadísticas por género y carpeta
  const reportData = useMemo((): GenreStats[] => {
    if (!songs || !genres) return []

    const genreMap = new Map(genres.map((g) => [g.id, g]))

    // Agrupar canciones por género
    const byGenre = new Map<string, { songs: typeof songs }>()

    for (const song of songs) {
      const gid = song.genre_id || "unknown"
      if (!byGenre.has(gid)) byGenre.set(gid, { songs: [] })
      byGenre.get(gid)!.songs.push(song)
    }

    const result: GenreStats[] = []

    for (const [genreId, { songs: genreSongs }] of byGenre.entries()) {
      const genre = genreMap.get(genreId)
      const genreName = genre?.name || "Sin Género"
      const genreColor = genre?.color || "#888888"

      // Agrupar por carpeta (artista) dentro del género
      const folderMap = new Map<string, number>()
      for (const s of genreSongs) {
        const folder = s.artist || "Artista Desconocido"
        folderMap.set(folder, (folderMap.get(folder) || 0) + 1)
      }

      const folders = Array.from(folderMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b))

      result.push({
        id: genreId,
        name: genreName,
        color: genreColor,
        totalSongs: genreSongs.length,
        folders,
      })
    }

    return result.sort((a, b) => b.totalSongs - a.totalSongs)
  }, [songs, genres])

  const totalSongs = useMemo(() => songs?.length || 0, [songs])
  const totalFolders = useMemo(() => {
    if (!songs) return 0
    return new Set(songs.map((s) => s.artist || "Artista Desconocido")).size
  }, [songs])

  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    try {
      // Importación dinámica para evitar errores de SSR
      const jsPDF = (await import("jspdf")).default
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const now = new Date()
      const fechaReporte = now.toLocaleDateString("es-VE", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      // ── ENCABEZADO ──────────────────────────────────────────────────────────
      // Fondo degradado simulado con rectángulo
      doc.setFillColor(88, 28, 135) // purple-900
      doc.rect(0, 0, pageWidth, 38, "F")

      doc.setFillColor(168, 85, 247) // purple-500 accent strip
      doc.rect(0, 36, pageWidth, 2, "F")

      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(20)
      doc.text("Preferencia Musical", pageWidth / 2, 14, { align: "center" })

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text("Reporte de Contenido por Género", pageWidth / 2, 22, { align: "center" })

      doc.setFontSize(9)
      doc.setTextColor(200, 200, 255)
      doc.text(`Generado: ${fechaReporte}`, pageWidth / 2, 30, { align: "center" })

      // ── RESUMEN GLOBAL ───────────────────────────────────────────────────────
      let yPos = 46

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("Resumen General", 14, yPos)

      yPos += 4

      const resumenGlobalData = [
        ["Total de Canciones en la Biblioteca", totalSongs.toString()],
        ["Total de Carpetas (Artistas)", totalFolders.toString()],
        ["Total de Géneros con Contenido", reportData.length.toString()],
      ]

      if (storageStats) {
        resumenGlobalData.push([
          "Almacenamiento Total R2 en Uso",
          `${storageStats.total_usage_gb} GB de ${storageStats.total_capacity_gb} GB (${storageStats.total_percentage_used}%)`
        ])
        // Añadir detalle por cuenta
        storageStats.accounts.forEach((acc: any) => {
          resumenGlobalData.push([
            ` - Uso en Cuenta #${acc.account_number} ${acc.account_number === 1 ? '(Principal)' : '(Respaldo)'}`,
            `${acc.usage_gb} GB (${acc.percentage_used}%)`
          ])
        })
      }

      autoTable(doc, {
        startY: yPos,
        head: [["Descripción", "Total"]],
        body: resumenGlobalData,
        headStyles: {
          fillColor: [88, 28, 135],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 10,
        },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [245, 240, 255] },
        columnStyles: {
          0: { cellWidth: 140 },
          1: { cellWidth: 36, halign: "center", fontStyle: "bold" },
        },
        margin: { left: 14, right: 14 },
      })

      yPos = (doc as any).lastAutoTable.finalY + 10

      // ── TOTALES POR GÉNERO ───────────────────────────────────────────────────
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text("Distribución por Género", 14, yPos)
      yPos += 4

      const genreRows = reportData.map((g, i) => [
        (i + 1).toString(),
        g.name,
        g.totalSongs.toString(),
        g.folders.length.toString(),
        `${((g.totalSongs / totalSongs) * 100).toFixed(1)}%`,
      ])

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Género", "Canciones", "Carpetas", "% Total"]],
        body: genreRows,
        headStyles: {
          fillColor: [126, 34, 206],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 10,
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 245, 255] },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 90 },
          2: { cellWidth: 28, halign: "center", fontStyle: "bold" },
          3: { cellWidth: 24, halign: "center" },
          4: { cellWidth: 24, halign: "center" },
        },
        margin: { left: 14, right: 14 },
      })

      yPos = (doc as any).lastAutoTable.finalY + 12

      // ── DETALLE POR GÉNERO Y CARPETA ────────────────────────────────────────
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text("Detalle de Carpetas por Género", 14, yPos)
      yPos += 4

      for (const genre of reportData) {
        // Encabezado del género
        const folderRows = genre.folders.map((f, i) => [
          (i + 1).toString(),
          f.name,
          f.count.toString(),
          `${((f.count / genre.totalSongs) * 100).toFixed(1)}%`,
        ])

        // Parsear color hex a RGB
        let r = 126, g2 = 34, b = 206
        try {
          const hex = genre.color.replace("#", "")
          r = parseInt(hex.substring(0, 2), 16)
          g2 = parseInt(hex.substring(2, 4), 16)
          b = parseInt(hex.substring(4, 6), 16)
        } catch { /* usa defaults */ }

        autoTable(doc, {
          startY: yPos,
          head: [[
            { content: `${genre.name}  —  ${genre.totalSongs} canciones en ${genre.folders.length} carpeta(s)`, colSpan: 4, styles: { halign: "left" } }
          ]],
          body: [
            ["#", "Carpeta (Artista)", "Canciones", "% Género"],
            ...folderRows,
            ["", "TOTAL", genre.totalSongs.toString(), "100%"],
          ],
          headStyles: {
            fillColor: [r, g2, b],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 10,
          },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [250, 248, 255] },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 116 },
            2: { cellWidth: 24, halign: "center" },
            3: { cellWidth: 26, halign: "center" },
          },
          didParseCell: (data) => {
            // Fila de total en negrita
            if (data.row.index === folderRows.length + 1) {
              data.cell.styles.fontStyle = "bold"
              data.cell.styles.fillColor = [230, 220, 255]
            }
            // Primera fila de sub-encabezado (columnas)
            if (data.row.index === 0) {
              data.cell.styles.fontStyle = "bold"
              data.cell.styles.fillColor = [240, 235, 255]
              data.cell.styles.textColor = [60, 60, 60]
            }
          },
          margin: { left: 14, right: 14 },
        })

        yPos = (doc as any).lastAutoTable.finalY + 6
      }

      // ── PIE DE PÁGINA ────────────────────────────────────────────────────────
      const pageCount = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        const ph = doc.internal.pageSize.getHeight()
        doc.setDrawColor(200, 200, 200)
        doc.line(14, ph - 12, pageWidth - 14, ph - 12)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.setFont("helvetica", "normal")
        doc.text("Preferencia Musical — Reporte Confidencial", 14, ph - 7)
        doc.text(`Pág. ${i} / ${pageCount}`, pageWidth - 14, ph - 7, { align: "right" })
      }

      // Mostrar en pantalla (nueva pestaña) en lugar de descargar directamente
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      
      // Abrir en nueva pestaña
      const newWindow = window.open(pdfUrl, '_blank')
      if (!newWindow) {
        // Fallback en caso de que el navegador bloquee las ventanas emergentes
        window.location.href = pdfUrl
      }
    } catch (err) {
      console.error("Error generando PDF:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-purple-500" />
            Imprimir Contenido
          </DialogTitle>
          <DialogDescription>
            Genera un reporte PDF con el contenido de la biblioteca, organizado por género y carpeta.
          </DialogDescription>
        </DialogHeader>

        {/* Vista previa de estadísticas */}
        <div className="space-y-5 mt-2">

          {/* Totales globales */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Canciones", value: totalSongs, icon: Music, color: "text-purple-500" },
              { label: "Carpetas", value: totalFolders, icon: Folder, color: "text-pink-500" },
              { label: "Géneros", value: reportData.length, icon: BarChart3, color: "text-indigo-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/50 gap-1"
              >
                <Icon className={cn("w-6 h-6 mb-1", color)} />
                <span className="text-2xl font-bold">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Totales de Almacenamiento */}
          {storageStats && (
            <div className="bg-muted/50 rounded-xl p-4 border border-border flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold">Almacenamiento Total R2</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cuenta 1: {storageStats.accounts[0]?.usage_gb}GB ({storageStats.accounts[0]?.percentage_used}%) • 
                  Cuenta 2: {storageStats.accounts[1]?.usage_gb || '0.00'}GB
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-indigo-500">
                  {storageStats.total_usage_gb} <span className="text-sm font-normal text-muted-foreground">GB</span>
                </p>
                <p className="text-xs text-muted-foreground">de {storageStats.total_capacity_gb} GB usados</p>
              </div>
            </div>
          )}

          {/* Tabla de vista previa por género */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 border-b border-border">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold">Vista Previa — Distribución por Género</span>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {reportData.map((genre) => {
                const pct = totalSongs > 0 ? (genre.totalSongs / totalSongs) * 100 : 0
                return (
                  <div key={genre.id} className="px-4 py-3 flex items-center gap-3">
                    {/* Pastilla de color */}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: genre.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{genre.name}</span>
                        <span className="text-sm font-bold ml-2 flex-shrink-0">
                          {genre.totalSongs}
                          <span className="text-muted-foreground font-normal text-xs ml-1">
                            ({pct.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      {/* Barra de progreso */}
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: genre.color }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {genre.folders.length} carpeta{genre.folders.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                )
              })}
              {reportData.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay datos para mostrar.
                </div>
              )}
            </div>
          </div>

          {/* Descripción del contenido del PDF */}
          <div className="rounded-lg bg-muted/30 border border-border p-3 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground mb-1">El PDF incluirá:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Encabezado con fecha y hora de generación</li>
              <li>Resumen global: total de canciones, carpetas y géneros</li>
              <li>Estado detallado de uso de almacenamiento en R2 (Cuenta 1 y 2)</li>
              <li>Tabla de distribución por género con porcentajes</li>
              <li>Detalle de cada carpeta (artista) dentro de cada género</li>
            </ul>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating || totalSongs === 0}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando PDF…
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Generar y Ver PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
