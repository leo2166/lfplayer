"use client"

import { useMusicPlayer } from "@/contexts/MusicPlayerContext"
import MusicPlayer from "./music-player"

export default function GlobalMusicPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    playNext,
    playPrev,
    togglePlay,
    seek,
    setCurrentTime,
  } = useMusicPlayer()

  if (!currentSong) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto px-4 py-2">
        <MusicPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onPlayPause={togglePlay}
          onNext={playNext}
          onPrev={playPrev}
          onSeek={seek}
          onTimeUpdate={setCurrentTime}
        />
      </div>
    </div>
  )
}
