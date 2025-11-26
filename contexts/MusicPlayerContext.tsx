"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"

interface Song {
  id: string
  title: string
  artist?: string
  duration: number
  blob_url: string
}

interface MusicPlayerContextType {
  songs: Song[]
  currentSong: Song | null
  isPlaying: boolean
  playSong: (song: Song, playlist: Song[]) => void
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined)

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [songs, setSongs] = useState<Song[]>([])
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const playSong = (song: Song, playlist: Song[]) => {
    setSongs(playlist)
    setCurrentSong(song)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const playNext = () => {
    if (songs.length === 0 || !currentSong) return
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id)
    if (currentIndex < songs.length - 1) {
      setCurrentSong(songs[currentIndex + 1])
    }
  }

  const playPrev = () => {
    if (songs.length === 0 || !currentSong) return
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id)
    if (currentIndex > 0) {
      setCurrentSong(songs[currentIndex - 1])
    }
  }

  return (
    <MusicPlayerContext.Provider
      value={{
        songs,
        currentSong,
        isPlaying,
        playSong,
        togglePlay,
        playNext,
        playPrev,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  )
}

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext)
  if (context === undefined) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider")
  }
  return context
}
