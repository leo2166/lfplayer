import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Este endpoint SOLO devuelve la lista de canciones con sus URLs.
// El ZIP se construye en el navegador con JSZip para evitar timeouts.
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: User is not an admin" },
        { status: 403 }
      );
    }

    // Obtener todas las canciones con sus URLs directas
    const { data: songs, error: songsError } = await supabaseAdmin
      .from("songs")
      .select("id, title, artist, blob_url, genres(name)")
      .order("artist", { ascending: true })
      .order("title", { ascending: true });

    if (songsError) throw songsError;

    if (!songs || songs.length === 0) {
      return NextResponse.json({ error: "No songs found" }, { status: 404 });
    }

    // Mapear a formato simplificado para el cliente
    const songList = songs
      .filter((s) => s.blob_url) // solo canciones con URL válida
      .map((s) => {
        const genreObj = s.genres as any;
        const genreName = genreObj
          ? Array.isArray(genreObj)
            ? genreObj[0]?.name
            : genreObj.name
          : "Sin Genero";
        return {
          id: s.id,
          title: s.title,
          artist: s.artist,
          url: s.blob_url,
          genre: genreName,
        };
      });

    return NextResponse.json({ songs: songList, total: songList.length });
  } catch (error) {
    console.error("Song list API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
