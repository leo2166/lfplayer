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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      {/* Backdrop for click outside? Optional. For now let's just make the card interactable */}

      <div className="w-full max-w-md bg-gradient-to-br from-cyan-500/40 via-purple-500/20 to-fuchsia-500/40 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-6 pointer-events-auto relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Button Close Absolute */}
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="icon" onClick={closePlayer} className="h-10 w-10 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none" />

        <div className="relative z-0">
          <MusicPlayer
            currentSong={currentSong}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onPlayPause={togglePlay}
            onNext={playNext}
            onPrev={playPrev}
            onSeek={seek}
            onTimeUpdate={setCurrentTime}
            layout="card"
          />
        </div>
      </div>
    </div>
  )
}
