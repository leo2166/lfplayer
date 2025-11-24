"use client"

import { Button } from "@/components/ui/button"

interface Genre {
  id: string
  name: string
  color: string
}

interface GenreFilterProps {
  genres: Genre[]
  selectedGenre: string
  onSelectGenre: (genreId: string) => void
}

export default function GenreFilter({ genres, selectedGenre, onSelectGenre }: GenreFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <Button
        variant={selectedGenre === "all" ? "default" : "outline"}
        onClick={() => onSelectGenre("all")}
        className={
          selectedGenre === "all"
            ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            : ""
        }
      >
        Todas
      </Button>
      {genres.map((genre) => (
        <Button
          key={genre.id}
          variant={selectedGenre === genre.id ? "default" : "outline"}
          onClick={() => onSelectGenre(genre.id)}
          className={
            selectedGenre === genre.id
              ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              : ""
          }
        >
          {genre.name}
        </Button>
      ))}
    </div>
  )
}
