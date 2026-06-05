import type React from "react"
import ClientLayout from "./_client_layout"
import { createClient } from "@/lib/supabase/server"
import { UserRoleProvider } from "@/contexts/UserRoleContext"
import { MusicLibraryProvider } from "@/contexts/MusicLibraryContext"
import type { Song, Genre } from "@/lib/types"

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole = "guest" // Default to guest if no user or profile

  if (user) {
    // FORCE ADMIN FOR LUCIDIO (Robust fallback if DB profile is missing role)
    if (user.email && user.email.toLowerCase().includes('lucidio')) {
      userRole = 'admin';
      console.log("🔒 Admin privileges granted via email override.");
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role) {
        userRole = profile.role
      }
    }
  }

  console.log("User role determined on server:", userRole)

  // Fetch songs and genres at layout level so sidebar also has access
  const { data: genresData } = await supabase.from("genres").select("*").order('display_order', { ascending: true });
  const genres: Genre[] = genresData ?? [];

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
    if (error || !batchSongs || batchSongs.length === 0) {
      finished = true;
    } else {
      allSongs = [...allSongs, ...batchSongs];
      finished = batchSongs.length < 1000;
      from += 1000;
      to += 1000;
    }
  }

  return (
    <UserRoleProvider initialRole={userRole as any}>
      <MusicLibraryProvider initialSongs={allSongs} initialGenres={genres}>
        <ClientLayout>{children}</ClientLayout>
      </MusicLibraryProvider>
    </UserRoleProvider>
  )
}
