"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Play, Pause, SkipBack, SkipForward, Volume2, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { Song } from "@/lib/types"

interface MusicPlayerProps {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  onPlayPause: () => void
  onNext: () => void
  onPrev: () => void
  onSeek: (time: number) => void
  onTimeUpdate: (time: number) => void
}

export default function MusicPlayer({
  currentSong,
  isPlaying,
  currentTime,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onTimeUpdate,
}: MusicPlayerProps) {
  const [volume, setVolume] = useState([100])
  const audioRef = useRef<HTMLAudioElement>(null)

  // Effect to sync audio play/pause state with context
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.play().catch((e) => console.error("Audio play failed:", e))
    } else {
      audio.pause()
    }
  }, [isPlaying, currentSong?.id])

  // Effect to sync audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100
    }
  }, [volume])

  // Effect to seek audio when currentTime changes from outside (e.g., on song change)
  useEffect(() => {
    const audio = audioRef.current
    if (audio && Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime
    }
  }, [currentTime])


  const handleTimeUpdateEvent = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    onTimeUpdate(e.currentTarget.currentTime)
  }

  const handleSeek = (value: number[]) => {
    onSeek(value[0])
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!currentSong) {
    // This part might not be reached if GlobalMusicPlayer handles the null case, but good for robustness
    return null
  }

  return (
    <div className="w-full">
      {/* Song Info */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
          <Music className="w-8 h-8 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">{currentSong.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{currentSong.artist || "Artista desconocido"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onPrev} className="h-10 w-10">
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            onClick={onPlayPause}
            className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} className="h-10 w-10">
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 pt-4">
        <Slider
          value={[currentTime]}
          max={currentSong.duration || 0}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(currentSong.duration || 0)}</span>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentSong.blob_url}
        onTimeUpdate={handleTimeUpdateEvent}
        onLoadedMetadata={() => {
          if(audioRef.current) audioRef.current.currentTime = currentTime
        }}
        onEnded={onNext}
        crossOrigin="anonymous"
      />
    </div>
  )
}
