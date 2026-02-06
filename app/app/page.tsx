import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import MusicLibrary from "./_components/music-library"
import type { Song, Genre } from "@/lib/types"
import { MusicLibraryProvider } from "@/contexts/MusicLibraryContext"

// This page will now fetch data on the server and pass it to a client component.
export default async function AppPage() {
  const supabase = await createClient()

  // Use service role for genres to bypass RLS issues since genres are public config
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch songs with user context (RLS applied) and genres with admin context (bypass RLS)
  const [{ data: songsData }, { data: genresData }] = await Promise.all([
    supabase.from("songs").select("*").order('title', { ascending: true }).range(0, 10000),
    supabaseAdmin.from("genres").select("*").order('display_order', { ascending: true }),
  ])

  const songs: Song[] = songsData ?? []
  const genres: Genre[] = genresData ?? []

  return (
    <MusicLibraryProvider initialSongs={songs} initialGenres={genres}>
      <MusicLibrary />
    </MusicLibraryProvider>
  )
}