"use client"

import type React from "react"
import { useEffect, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import UploadMusic from "./upload-music"

interface Genre {
  id: string
  name: string
  color: string
}

interface AddMusicDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadSuccess: (songs: any[]) => void
  preselectedArtist?: string
  preselectedGenreId?: string
}

export default function AddMusicDialog({ open, onOpenChange, onUploadSuccess, preselectedArtist, preselectedGenreId }: AddMusicDialogProps) {
  const [genres, setGenres] = useState<Genre[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    // Fetch genres when the dialog is opened for the first time
    if (open && genres.length === 0) {
      const fetchGenres = async () => {
        try {
          const res = await fetch("/api/genres")
          const data = await res.json()
          setGenres(data.genres || [])
        } catch (error) {
          console.error("Error fetching genres:", error)
        }
      }
      fetchGenres()
    }
  }, [open, genres.length])

  const handleSuccess = (songs: any[]) => {
    onUploadSuccess(songs)
  }

  // Block closing the dialog if an upload is in progress
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isUploading) {
      // User tried to close while uploading — block it
      return
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        // Prevent closing when clicking outside during upload
        onInteractOutside={(e) => {
          if (isUploading) {
            e.preventDefault()
          }
        }}
        // Prevent closing with Escape key during upload
        onEscapeKeyDown={(e) => {
          if (isUploading) {
            e.preventDefault()
          }
        }}
        // Hide the X close button during upload
        {...(isUploading ? { hideCloseButton: true } : {})}
      >
        <DialogHeader>
          <DialogTitle>
            {isUploading ? "⏳ Subiendo Música — No cierres esta ventana" : "Agregar Nueva Música"}
          </DialogTitle>
          <DialogDescription>
            {isUploading
              ? "La subida está en progreso. Este diálogo está bloqueado hasta que termine."
              : "Sube uno o varios archivos de audio. Se les asignará el género que elijas."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <UploadMusic
            genres={genres}
            onUploadSuccess={handleSuccess}
            preselectedArtist={preselectedArtist}
            preselectedGenreId={preselectedGenreId}
            onUploadingChange={setIsUploading}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}