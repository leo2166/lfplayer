import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { r2 } from '@/lib/cloudflare/r2';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(req: NextRequest) {
  try {
    // 1. Authenticate and authorize user
    const supabase = await createClient();
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
      return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 });
    }

    // User is an admin, proceed with deletion logic
    const { artist } = await req.json();

    if (!artist) {
      return NextResponse.json({ error: 'Nombre del artista es requerido.' }, { status: 400 });
    }

    // 2. Get all songs by the artist from Supabase using the admin client
    const { data: songs, error: dbError } = await supabaseAdmin
      .from('songs')
      .select('id, blob_url')
      .eq('artist', artist);

    if (dbError) {
      console.error('Error fetching songs from Supabase:', dbError);
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? `Error de base de datos: ${dbError.message}`
        : 'Error al obtener las canciones de la base de datos.';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    if (!songs || songs.length === 0) {
      // If no songs, there's nothing to do, return success.
      return NextResponse.json({ message: 'No se encontraron canciones para este artista.' });
    }

    // 3. Delete files from storage (Cloudflare R2 or Supabase Storage)
    const r2PublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const deletePromises = [];

    for (const song of songs) {
      if (!song.blob_url) continue; // Skip if no file path

      // Case 1: File is in Cloudflare R2
      if (r2PublicUrl && song.blob_url.startsWith(r2PublicUrl)) {
        let key = song.blob_url.substring(r2PublicUrl.length);
        const finalKey = key.startsWith('/') ? key.substring(1) : key;

        if (finalKey) {
          const deleteParams = {
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
            Key: finalKey,
          };
          deletePromises.push(r2.send(new DeleteObjectCommand(deleteParams)));
        } else {
          console.warn(`Could not extract a valid R2 key from URL: ${song.blob_url}`);
        }
      }
      // Case 2: File is in Supabase Storage
      else if (supabaseUrl && song.blob_url.startsWith(supabaseUrl)) {
        // Extract the path from the URL: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
        const urlParts = song.blob_url.split('/public/');
        if (urlParts.length > 1) {
          const storagePath = urlParts[1];
          const [bucketName, ...filePathParts] = storagePath.split('/');
          const filePath = filePathParts.join('/');
          
          if(bucketName && filePath) {
            deletePromises.push(supabaseAdmin.storage.from(bucketName).remove([filePath]));
          }
        }
      }
    }

    const results = await Promise.allSettled(deletePromises);
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            console.log('Successfully deleted a file from storage:', result.value);
        } else {
            console.error('Failed to delete a file from storage:', result.reason);
            // Non-fatal, we still want to delete the DB record.
        }
    });

    // 4. Delete song records from Supabase
    const songIds = songs.map(song => song.id);
    const { error: deleteSongsError } = await supabaseAdmin
      .from('songs')
      .delete()
      .in('id', songIds);

    if (deleteSongsError) {
      console.error('Error deleting songs from Supabase:', deleteSongsError);
      // This is a more critical error, so we return 500
      return NextResponse.json({ error: 'Error al eliminar los registros de la base de datos.' }, { status: 500 });
    }
    
    return NextResponse.json({ message: `Artista '${artist}' y todas sus canciones eliminadas correctamente.` });

  } catch (error) {
    console.error('Error en la ruta de eliminación:', error);
    const errorMessage = error instanceof Error ? error.message : 'Un error inesperado ocurrió.';
    return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  }
}