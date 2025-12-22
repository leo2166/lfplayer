"use client"

import { Button } from "@/components/ui/button"
import { X, Disc3 } from "lucide-react"
import { useEffect, useState } from "react"

interface WelcomeOverlayProps {
    onClose: () => void
}

export default function WelcomeOverlay({ onClose }: WelcomeOverlayProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Trigger animation after mount
        setTimeout(() => setIsVisible(true), 100)
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        // Wait for animation to finish before calling onClose
        setTimeout(onClose, 300)
    }

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
            {/* Glassmorphism Card */}
            <div
                className={`relative w-full max-w-lg bg-gradient-to-br from-cyan-500/30 via-purple-500/25 to-fuchsia-500/30 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8 transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                    }`}
            >
                {/* Close Button */}
                <div className="absolute top-4 right-4 z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </Button>
                </div>

                {/* Ambient Glow */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none rounded-t-3xl" />

                {/* Content */}
                <div className="relative z-0 flex flex-col items-center text-center space-y-6">
                    {/* Vinyl Icon with Animation */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse" />
                        <Disc3
                            className="w-24 h-24 text-purple-300 relative z-10 animate-spin"
                            style={{ animationDuration: '8s' }}
                        />
                        {/* Inner circle for vinyl detail */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-fuchsia-400 rounded-full shadow-lg" />
                        </div>
                    </div>

                    {/* Welcome Message */}
                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                            ¡Bienvenido/a! 🎵
                        </h2>
                        <p className="text-lg text-white/90 leading-relaxed max-w-md">
                            Escoge el <span className="font-semibold text-purple-200">género musical</span> a escuchar,
                            la <span className="font-semibold text-cyan-200">carpeta o artista</span> y
                            dale <span className="font-semibold text-fuchsia-200">play</span> a la canción que gustes.
                        </p>
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={handleClose}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                        ¡Entendido, vamos! 🎶
                    </Button>
                </div>
            </div>
        </div>
    )
}
