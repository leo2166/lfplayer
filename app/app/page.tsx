"use client"

import { PlayCircle } from "lucide-react"

export default function AppPage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/50 p-8">
      <div className="text-center">
        <PlayCircle className="w-48 h-48 text-purple-600/20 mx-auto" strokeWidth={0.5} />
        <h1 className="mt-8 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
          Bienvenido a tu Música
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
          Usa el menú para agregar nuevas canciones o explorar tus playlists.
        </p>
      </div>
    </div>
  )
}
