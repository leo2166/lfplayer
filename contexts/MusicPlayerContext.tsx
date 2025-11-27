"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"
import type { Song } from "@/lib/types"

interface MusicPlayerContextType {
  songs: Song[]
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  playSong: (song: Song, playlist: Song[]) => void
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  seek: (time: number) => void
  setCurrentTime: (time: number) => void
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined)

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [songs, setSongs] = useState<Song[]>([])
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const playSong = (song: Song, playlist: Song[]) => {
    setSongs(playlist)
    setCurrentSong(song)
    setIsPlaying(true)
    setCurrentTime(0) // Reset time when a new song plays
  }

  const togglePlay = () => {
    // If there's no song, don't try to play
    if (!currentSong) return
    setIsPlaying(!isPlaying)
  }

  const playNext = () => {
    if (songs.length === 0 || !currentSong) return
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id)
    if (currentIndex < songs.length - 1) {
      setCurrentSong(songs[currentIndex + 1])
      setCurrentTime(0) // Reset time
    } else {
      // Optional: Stop playing at the end of the playlist
      // Or loop to the beginning
      setCurrentSong(songs[0]); // Loop to first song
      setCurrentTime(0);
    }
  }

  const playPrev = () => {
    if (songs.length === 0 || !currentSong) return
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id)
    if (currentIndex > 0) {
      setCurrentSong(songs[currentIndex - 1])
      setCurrentTime(0) // Reset time
    } else {
      // Optional: go to the last song from the first
      setCurrentSong(songs[songs.length - 1]);
      setCurrentTime(0);
    }
  }

  const seek = (time: number) => {
    setCurrentTime(time)
  }

  return (
    <MusicPlayerContext.Provider
      value={{
        songs,
        currentSong,
        isPlaying,
        currentTime,
        playSong,
        togglePlay,
        playNext,
        playPrev,
        seek,
        setCurrentTime,
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
