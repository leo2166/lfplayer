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
.
.
.
        <div className="mt-4">
          <UploadMusic genres={genres} onUploadSuccess={handleSuccess} preselectedArtist={preselectedArtist} preselectedGenreId={preselectedGenreId} />
        </div>
