import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import archiver from "archiver";

// Fuerza que la ruta sea evaluada dinámicamente
export const dynamic = "force-dynamic";

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

    const genre_id = request.nextUrl.searchParams.get("genre_id");
    const artist = request.nextUrl.searchParams.get("artist");

    if (!genre_id) {
      return NextResponse.json(
        { error: "Missing genre_id parameter" },
        { status: 400 }
      );
    }

    // Obtener las canciones
    let query = supabase
      .from("songs")
      .select("id, title, artist, blob_url, genres(name)")
      .eq("genre_id", genre_id);

    if (artist) {
      query = query.eq("artist", artist);
    }

    const { data: songs, error: songsError } = await query;

    if (songsError) {
      throw songsError;
    }

    if (!songs || songs.length === 0) {
      return NextResponse.json(
        { error: "No songs found for the given criteria" },
        { status: 404 }
      );
    }

    const genreNameObj = songs[0].genres as any;
    const genreName = genreNameObj
      ? Array.isArray(genreNameObj)
        ? genreNameObj[0]?.name
        : genreNameObj.name
      : "Genero";

    const cleanName = (name: string) => name.replace(/[<>:"/\\|?*]+/g, '_');

    const zipFilename = artist
      ? `${cleanName(artist)}.zip`
      : `${cleanName(genreName)}.zip`;

    // Create a TransformStream to bridge Node.js events to Web Streams
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const archive = archiver("zip", {
      zlib: { level: 5 }, // Nivel de compresión balanceado
    });

    // Handle archive events
    archive.on("data", (chunk) => {
      writer.write(chunk);
    });

    archive.on("end", () => {
      writer.close();
    });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      writer.abort(err);
    });

    // Función asíncrona para añadir archivos al ZIP secuencialmente para controlar la memoria
    const appendFiles = async () => {
      for (const song of songs) {
        if (!song.blob_url) continue;
        try {
          const res = await fetch(song.blob_url);
          if (!res.ok || !res.body) {
            console.error(`Failed to fetch ${song.blob_url}: ${res.statusText}`);
            continue;
          }

          // Cargamos en un Buffer (uso secuencial, poca memoria pico)
          const buffer = await res.arrayBuffer();
          
          const fileName = artist
            ? `${cleanName(song.title)}.mp3`
            : `${cleanName(song.artist)}/${cleanName(song.title)}.mp3`;

          archive.append(Buffer.from(buffer), { name: fileName });
        } catch (e) {
          console.error(`Error procesando ${song.title}:`, e);
        }
      }
      archive.finalize();
    };

    // Iniciar el proceso de descarga y compresión
    appendFiles();

    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });

  } catch (error) {
    console.error("Download API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
