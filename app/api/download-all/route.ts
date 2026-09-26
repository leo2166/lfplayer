import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { type NextRequest, NextResponse } from "next/server";
const archiver = require("archiver");

// Fuerza evaluación dinámica
export const dynamic = "force-dynamic";

// Tiempo máximo de ejecución (Vercel Pro: 300s, Hobby: 60s)
export const maxDuration = 300;

export async function GET(request: NextRequest) {
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

    // Parámetro opcional: filtrar por genre_id
    const genre_id = request.nextUrl.searchParams.get("genre_id");

    // Obtener TODAS las canciones (o filtradas por género)
    let query = supabaseAdmin
      .from("songs")
      .select("id, title, artist, blob_url, genres(name)")
      .order("artist", { ascending: true })
      .order("title", { ascending: true });

    if (genre_id) {
      query = query.eq("genre_id", genre_id);
    }

    const { data: songs, error: songsError } = await query;

    if (songsError) throw songsError;

    if (!songs || songs.length === 0) {
      return NextResponse.json(
        { error: "No songs found" },
        { status: 404 }
      );
    }

    const cleanName = (name: any) => {
      if (!name) return "Desconocido";
      return String(name)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // quitar tildes
        .replace(/[<>:"/\\|?*]+/g, "_")
        .trim();
    };

    const zipFilename = genre_id
      ? `LFPlayer_Genero.zip`
      : `LFPlayer_BibliotecaCompleta.zip`;

    const archive = archiver("zip", {
      zlib: { level: 4 }, // Nivel más bajo = más velocidad (importante para archivos grandes)
    });

    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk: any) => {
          controller.enqueue(chunk);
        });
        archive.on("end", () => {
          controller.close();
        });
        archive.on("error", (err: any) => {
          console.error("Archive error:", err);
          controller.error(err);
        });
      },
    });

    // Añadir archivos al ZIP secuencialmente
    // Estructura: Genero/Artista/Cancion.mp3
    const appendFiles = async () => {
      for (const song of songs) {
        if (!song.blob_url) continue;
        try {
          const res = await fetch(song.blob_url);
          if (!res.ok || !res.body) {
            console.error(`Failed to fetch ${song.blob_url}: ${res.statusText}`);
            continue;
          }

          const buffer = await res.arrayBuffer();

          const genreNameObj = song.genres as any;
          const genreName = genreNameObj
            ? Array.isArray(genreNameObj)
              ? genreNameObj[0]?.name
              : genreNameObj.name
            : "Sin_Genero";

          // Estructura de carpetas: Genero/Artista/Titulo.mp3
          const filePath = `${cleanName(genreName)}/${cleanName(song.artist)}/${cleanName(song.title)}.mp3`;

          archive.append(Buffer.from(buffer), { name: filePath });
        } catch (e) {
          console.error(`Error procesando ${song.title}:`, e);
        }
      }
      archive.finalize();
    };

    appendFiles();

    return new Response(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "X-Total-Songs": String(songs.length),
      },
    });
  } catch (error) {
    console.error("Download-All API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
