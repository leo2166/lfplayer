"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, SkipBack, SkipForward, Volume2, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface Song {
  id: string
  title: string
  artist?: string
  duration: number
  blob_url: string
}

interface MusicPlayerProps {
  songs: Song[]
  onPlayingChange?: (playing: boolean) => void
}

export default function MusicPlayer({ songs, onPlayingChange }: MusicPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState([100])
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentSong = songs[currentIndex] || null

  useEffect(() => {
    onPlayingChange?.(isPlaying)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.play().catch(() => {
        // Handle autoplay restrictions
        setIsPlaying(false)
      })
    } else {
      audio.pause()
    }
  }, [isPlaying, currentSong?.blob_url])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100
    }
  }, [volume])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleNext = () => {
    if (currentIndex < songs.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setCurrentTime(0)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setCurrentTime(0)
    }
  }

  const handleTimeUpdate = (e: React.ChangeEvent<HTMLAudioElement>) => {
    setCurrentTime(e.currentTarget.currentTime)
  }

  const handleSeek = (value: number[]) => {
    const time = value[0]
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!currentSong) {
    return (
      <div className="w-full bg-gradient-to-r from-purple-600/10 to-pink-600/10 border-t border-border rounded-lg p-6 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Music className="w-5 h-5" />
          <p>No hay canciones para reproducir</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-border rounded-lg p-4 md:p-6 space-y-4">
      {/* Song Info */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
          <Music className="w-8 h-8 md:w-10 md:h-10 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">{currentSong.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{currentSong.artist || "Artista desconocido"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Canción {currentIndex + 1} de {songs.length}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={currentSong.duration || 0}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(currentSong.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="h-10 w-10"
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            onClick={handlePlayPause}
            className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === songs.length - 1}
            className="h-10 w-10"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-xs">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <Slider value={volume} max={100} step={1} onValueChange={setVolume} className="w-full" />
          <span className="text-xs text-muted-foreground w-8 text-right">{volume[0]}%</span>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentSong.blob_url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleNext}
        crossOrigin="anonymous"
      />
    </div>
  )
}
