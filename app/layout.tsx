import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import GlobalMusicPlayer from "@/components/global-music-player"
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext"
import { Toaster } from "sonner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })


export const metadata: Metadata = {
  title: "Preferencia Musical",
  description: "Tu aplicación de música personal. Crea playlists, organiza por género y reproduce tu música favorita.",
  generator: "v0.app",
  manifest: "/manifest.json", // Añadir manifest
  themeColor: "#6366f1", // Añadir theme-color
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased`}>
        <MusicPlayerProvider>
          {children}
          <GlobalMusicPlayer />
          <Toaster richColors position="top-center" />
        </MusicPlayerProvider>
        <Analytics />
      </body>
    </html>
  )
}
