"use client"

import { Music, Play, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PlaylistCardProps {
  id: string
  name: string
  description?: string
  songCount: number
  coverColor: string
  onDelete: () => void
  onSelect: () => void
  onPlay: () => void
}

export default function PlaylistCard({
  id,
  name,
  description,
  songCount,
  coverColor,
  onDelete,
  onSelect,
  onPlay,
}: PlaylistCardProps) {
  return (
    <div
      className="group relative rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all"
    >
      {/* Cover */}
      <div
        className="w-full h-32 flex items-center justify-center text-white text-4xl cursor-pointer"
        style={{ backgroundColor: coverColor }}
        onClick={onSelect}
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
      <div className="absolute top-2 right-2 flex items-center gap-2 transition-opacity">
        <Button
          size="icon"
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="h-8 w-8 rounded-full bg-blue-500 !opacity-100 !block"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
          className="h-8 w-8 rounded-full bg-green-600 hover:bg-green-700"
        >
          <Play className="w-4 h-4 fill-current" />
        </Button>
      </div>
    </div>
  )
}
