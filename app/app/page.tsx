import { createClient } from "@/lib/supabase/server"
import MusicLibrary from "./_components/music-library"
import type { Song, Genre } from "@/lib/types"
import { MusicLibraryProvider } from "@/contexts/MusicLibraryContext"

// This page will now fetch data on the server and pass it to a client component.
export default async function AppPage() {
  const supabase = await createClient()

  // Fetch songs and genres in parallel
  const [{ data: songsData }, { data: genresData }] = await Promise.all([
    supabase.from("songs").select("*").order('title', { ascending: true }).range(0, 2000),
    supabase.from("genres").select("*").order('display_order', { ascending: true }),

  ])

  // DEBUG: Force empty songs to isolate if data payload is causing the crash
  const songs: Song[] = [] // songsData ?? []
  const genres: Genre[] = genresData ?? []

  return (
    <MusicLibraryProvider initialSongs={songs} initialGenres={genres}>
      <MusicLibrary />
    </MusicLibraryProvider>
  )
}