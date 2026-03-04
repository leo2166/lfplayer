import { createClient } from "@/lib/supabase/server"

import MusicLibrary from "./_components/music-library"
import type { Song, Genre } from "@/lib/types"
import { MusicLibraryProvider } from "@/contexts/MusicLibraryContext"

// This page will now fetch data on the server and pass it to a client component.
export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const supabase = await createClient()

  // Fetch genres (usually few enough for a single call)
  const { data: genresData } = await supabase.from("genres").select("*").order('display_order', { ascending: true });
  const genres: Genre[] = genresData ?? [];

  // Fetch ALL songs using batching to bypass Supabase 1000-row limit
  let allSongs: Song[] = [];
  let from = 0;
  let to = 999;
  let finished = false;

  while (!finished) {
    const { data: batchSongs, error } = await supabase
      .from("songs")
      .select("*")
      .order('title', { ascending: true })
      .range(from, to);

    if (error) {
      console.error("Error batch fetching songs:", error);
      finished = true;
    } else if (!batchSongs || batchSongs.length === 0) {
      finished = true;
    } else {
      allSongs = [...allSongs, ...batchSongs];
      if (batchSongs.length < 1000) {
        finished = true;
      } else {
        from += 1000;
        to += 1000;
      }
    }
  }

  return (
    <MusicLibraryProvider initialSongs={allSongs} initialGenres={genres}>
      <MusicLibrary />
    </MusicLibraryProvider>
  )
}