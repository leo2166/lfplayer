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
  layout?: "bar" | "card"
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
  layout = "bar",
}: MusicPlayerProps) {
  const [volume, setVolume] = useState(100)
  const audioRef = useRef<HTMLAudioElement>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // ── Wake Lock: mantener pantalla/CPU activa durante reproducción ──────────
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && isPlaying) {
        const sentinel = await (navigator as any).wakeLock.request('screen')
        wakeLockRef.current = sentinel
        sentinel.addEventListener('release', () => {
          console.log('[WakeLock] Released')
        })
        console.log('[WakeLock] Acquired')
      }
    } catch (err) {
      console.warn('[WakeLock] Failed:', err)
    }
  }

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(console.warn)
      wakeLockRef.current = null
    }
  }

  // Wake Lock al cambiar isPlaying o canción
  useEffect(() => {
    if (isPlaying) {
      requestWakeLock()
    } else {
      releaseWakeLock()
    }
    return () => { releaseWakeLock() }
  }, [isPlaying, currentSong?.id])

  // Re-adquirir wake lock si la página vuelve a ser visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        await requestWakeLock()
        // Reanudar audio si se pausó por visibility
        if (audioRef.current?.paused) {
          audioRef.current.play().catch(console.warn)
        }
      } else if (document.visibilityState === 'hidden') {
        // Opcional: mantener wake lock en hidden para audio en background
        // releaseWakeLock() // Comenta esto si quieres que siga sonando con pantalla apagada
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isPlaying])

  // ── Media Session API: controles en pantalla de bloqueo/notificaciones ────
  useEffect(() => {
    if (!currentSong || !('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist || 'Artista desconocido',
      artwork: [
        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    })

    // Handlers para botones físicos / lock screen
    const setAction = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
      try { navigator.mediaSession.setActionHandler(action, handler) } catch {}
    }

    setAction('play', () => { onPlayPause(); requestWakeLock() })
    setAction('pause', () => { onPlayPause(); releaseWakeLock() })
    setAction('previoustrack', onPrev)
    setAction('nexttrack', onNext)
    setAction('seekto', (details: MediaSessionActionDetails) => { if (details.seekTime) onSeek(details.seekTime) })

    // Actualizar posición en UI del OS
    const updatePosition = () => {
      navigator.mediaSession.setPositionState({
        duration: currentSong.duration,
        playbackRate: 1,
        position: currentTime,
      })
    }
    const interval = setInterval(updatePosition, 1000)
    return () => clearInterval(interval)
  }, [currentSong, isPlaying, currentTime, onPlayPause, onPrev, onNext, onSeek])

  // ── Sincronizar play/pause con audio element ──────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          if (e.name !== 'AbortError') console.error("Audio play failed:", e)
        })
      }
    } else {
      audio.pause()
    }
  }, [isPlaying, currentSong?.id])

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  // Seek externo
  useEffect(() => {
    const audio = audioRef.current
    if (audio && Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime
    }
  }, [currentTime])

  const handleTimeUpdateEvent = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    onTimeUpdate(e.currentTarget.currentTime)
  }

  const handleSeek = (value: number[]) => onSeek(value[0])

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!currentSong) return null

  if (layout === "card") {
    return (
      <div className="w-full flex flex-col items-center gap-6 p-2">
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl bg-gradient-to-br from-purple-500/80 to-pink-500/80 shadow-2xl flex items-center justify-center mb-2 animate-in zoom-in-50 duration-500">
          <Music className="w-20 h-20 text-white drop-shadow-md" />
        </div>
        <div className="text-center space-y-1 w-full px-4">
          <h3 className="text-lg font-bold text-foreground line-clamp-2 drop-shadow-sm min-h-[1.75rem]">{currentSong.title}</h3>
          <p className="text-lg text-muted-foreground truncate">{currentSong.artist || "Artista desconocido"}</p>
        </div>
        <div className="w-full space-y-2 px-2">
          <Slider value={[currentTime]} max={currentSong.duration || 0} step={0.1} onValueChange={handleSeek} className="w-full" />
          <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(currentSong.duration || 0)}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-2">
          <Button variant="ghost" size="icon" onClick={onPrev} className="h-12 w-12 hover:bg-white/10 hover:scale-110 transition-all"><SkipBack className="w-8 h-8" /></Button>
          <Button size="icon" onClick={onPlayPause} className="h-20 w-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-xl hover:scale-105 transition-all text-white border border-white/20">
            {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} className="h-12 w-12 hover:bg-white/10 hover:scale-110 transition-all"><SkipForward className="w-8 h-8" /></Button>
        </div>
        <audio
          ref={audioRef}
          src={currentSong.blob_url}
          onTimeUpdate={handleTimeUpdateEvent}
          onLoadedMetadata={() => { if (audioRef.current) audioRef.current.currentTime = currentTime }}
          onCanPlay={(e) => {
            if (isPlaying) {
              const playPromise = e.currentTarget.play()
              if (playPromise !== undefined) playPromise.catch((err) => { if (err.name !== 'AbortError') console.error("Playback error:", err) })
            }
          }}
          onEnded={onNext}
        />
      </div>
    )
  }

  // Bar layout
  return (
    <div className="w-full">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0"><Music className="w-8 h-8 text-white" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">{currentSong.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{currentSong.artist || "Artista desconocido"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onPrev} className="h-10 w-10"><SkipBack className="w-5 h-5" /></Button>
          <Button size="icon" onClick={onPlayPause} className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} className="h-10 w-10"><SkipForward className="w-5 h-5" /></Button>
        </div>
      </div>
      <div className="space-y-2 pt-4">
        <Slider value={[currentTime]} max={currentSong.duration || 0} step={0.1} onValueChange={handleSeek} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(currentSong.duration || 0)}</span>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={currentSong.blob_url}
        onTimeUpdate={handleTimeUpdateEvent}
        onLoadedMetadata={() => { if (audioRef.current) audioRef.current.currentTime = currentTime }}
        onCanPlay={(e) => {
          if (isPlaying) {
            const playPromise = e.currentTarget.play()
            if (playPromise !== undefined) playPromise.catch((err) => { if (err.name !== 'AbortError') console.error("Playback error:", err) })
          }
        }}
        onEnded={onNext}
      />
    </div>
  )
}
