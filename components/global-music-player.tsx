"use client"

import { useMusicPlayer } from "@/contexts/MusicPlayerContext"
import MusicPlayer from "./music-player"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

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
    closePlayer, // Get the new function
  } = useMusicPlayer()

  if (!currentSong) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto px-4 py-2 flex items-center gap-4">
        <div className="flex-grow">
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
        <div className="flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={closePlayer} className="h-10 w-10">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  )
}
