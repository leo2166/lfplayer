import { createClient } from "@/lib/supabase/server"
import MusicLibrary from "./_components/music-library"
import type { Song, Genre } from "@/lib/types"
import { MusicLibraryProvider } from "@/contexts/MusicLibraryContext"

// This page will now fetch data on the server and pass it to a client component.
export default async function AppPage() {
  console.log("AppPage (Server): Fetching initial data...");
  const supabase = await createClient()

  // Fetch songs and genres in parallel
  const [{ data: songsData }, { data: genresData }] = await Promise.all([
    supabase.from("songs").select("*").order('title', { ascending: true }),
    supabase.from("genres").select("*").order('name', { ascending: true }),
  ])

  const songs: Song[] = songsData ?? []
  const genres: Genre[] = genresData ?? []

  return (
    <MusicLibraryProvider initialSongs={songs} initialGenres={genres}>
      <MusicLibrary />
    </MusicLibraryProvider>
  )
}