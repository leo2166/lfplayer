import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import GlobalMusicPlayer from "@/components/global-music-player"
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })


export const metadata: Metadata = {
  title: "Preferencia Musical",
  description: "Tu aplicación de música personal. Crea playlists, organiza por género y reproduce tu música favorita.",
  generator: "v0.app",
  other: {
    "application-version": "1.2.1-duplicate-resilience",
    "deploy-id": "20251215-1713", // Manual timestamp ID
    "deploy-time": new Date().toISOString(),
  },
  manifest: "/manifest.json", // Añadir manifest
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

export const viewport = {
  themeColor: "#6366f1",
  colorScheme: 'dark light',
};

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
        </MusicPlayerProvider>
        <Analytics />
      </body>
    </html>
  )
}
