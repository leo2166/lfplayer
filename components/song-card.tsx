"use client"

import { Music, Play, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SongCardProps {
  title: string
  artist?: string
  duration: number
  genre?: string
  onPlay: () => void
  onDelete: () => void
  isPlaying?: boolean
}

export default function SongCard({ title, artist, duration, genre, onPlay, onDelete, isPlaying }: SongCardProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div
      className={`group relative rounded-lg border p-4 transition-all hover:shadow-md ${
        isPlaying
          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/20"
          : "border-border bg-card hover:border-purple-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <h3 className="font-semibold text-foreground truncate">{title}</h3>
          </div>
          {artist && <p className="text-sm text-muted-foreground truncate">{artist}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {genre && (
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                {genre}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            onClick={onPlay}
            className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
          >
            <Play className="w-4 h-4 fill-current" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              console.log('SongCard delete button clicked'); // Diagnostic log
              e.stopPropagation(); // Prevent any parent clicks
              onDelete();
            }}
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
