import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { id: playlistId } = await params;

        // Verificar autenticación
        const { data: { user } } = await supabase.auth.getUser();

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

        // Obtener canciones de la playlist con sus URLs directas
        const { data: playlistSongs, error: songsError } = await supabaseAdmin
            .from("playlist_songs")
            .select(`
                position,
                songs (
                    id,
                    title,
                    artist,
                    blob_url,
                    genres(name)
                )
            `)
            .eq("playlist_id", playlistId)
            .order("position", { ascending: true });

        if (songsError) throw songsError;

        if (!playlistSongs || playlistSongs.length === 0) {
            return NextResponse.json({ error: "No songs in playlist" }, { status: 404 });
        }

        // Obtener info de la playlist para el nombre del archivo
        const { data: playlist } = await supabaseAdmin
            .from("playlists")
            .select("name")
            .eq("id", playlistId)
            .single();

        // Mapear a formato simplificado para el cliente
        const songList = playlistSongs
            .filter((ps) => ps.songs?.blob_url) // solo canciones con URL válida
            .map((ps, index) => {
                const s = ps.songs;
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
                    position: ps.position,
                };
            });

        return NextResponse.json({ 
            songs: songList, 
            total: songList.length,
            playlistName: playlist?.name || `playlist-${playlistId}`
        });
    } catch (error) {
        console.error("Playlist Download API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}