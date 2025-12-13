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
    // Optional: Close dialog on success
    // onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Nueva Música</DialogTitle>
          <DialogDescription>
            Sube uno o varios archivos de audio. Se les asignará el género que elijas.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <UploadMusic genres={genres} onUploadSuccess={handleSuccess} preselectedArtist={preselectedArtist} preselectedGenreId={preselectedGenreId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}