"use client"

import { Music, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PlaylistCardProps {
  id: string
  name: string
  description?: string
  songCount: number
  coverColor: string
  onDelete: () => void
  onSelect: () => void
}

export default function PlaylistCard({
  id,
  name,
  description,
  songCount,
  coverColor,
  onDelete,
  onSelect,
}: PlaylistCardProps) {
  return (
    <div
      className="group relative rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
      onClick={onSelect}
    >
      {/* Cover */}
      <div
        className="w-full h-32 flex items-center justify-center text-white text-4xl"
        style={{ backgroundColor: coverColor }}
      >
        <Music className="w-12 h-12" />
      </div>

      {/* Content */}
      <div className="p-4 bg-card">
        <h3 className="font-semibold text-foreground truncate">{name}</h3>
        {description && <p className="text-sm text-muted-foreground truncate">{description}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          {songCount} {songCount === 1 ? "canción" : "canciones"}
        </p>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
