import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import GlobalMusicPlayer from "@/components/global-music-player"
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })


export const metadata: Metadata = {
  title: "Preferencia Musical",
  description: "Tu aplicación de música personal. Crea playlists, organiza por género y reproduce tu música favorita.",
  generator: "v0.app",
  other: {
    "application-version": "1.2.6-debug-empty",
    "deploy-id": "20251217-1315", // Manual timestamp ID
    "deploy-time": "2025-12-17T13:15:00-04:00",
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

import { Providers } from "./providers"
import { redirect } from "next/navigation"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Lógica de Mantenimiento - DESACTIVADO
  // const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${_geist.className} font-sans antialiased text-foreground bg-background`}>
        <Providers>
          <MusicPlayerProvider>
            {children}
            <GlobalMusicPlayer />
            <Analytics />
          </MusicPlayerProvider>
        </Providers>
      </body>
    </html>
  )
}
