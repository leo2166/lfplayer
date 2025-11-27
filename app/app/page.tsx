import { createClient } from "@/lib/supabase/server"
import MusicLibrary from "./_components/music-library"
import type { Song, Genre } from "@/lib/types"

// This page will now fetch data on the server and pass it to a client component.
export default async function AppPage() {
  const supabase = await createClient()

  // Fetch songs and genres in parallel
  const [{ data: songsData }, { data: genresData }] = await Promise.all([
    supabase.from("songs").select("*"),
    supabase.from("genres").select("*"),
  ])

  const songs: Song[] = songsData ?? []
  const genres: Genre[] = genresData ?? []

  return <MusicLibrary songs={songs} genres={genres} />
}
