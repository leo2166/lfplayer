import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { r2 } from '@/lib/cloudflare/r2';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    
    const { id: songId } = await params;

    if (!songId) {
      return NextResponse.json({ error: 'ID de la canción es requerido.' }, { status: 400 });
    }

    // 2. Get the song's blob_url from Supabase
    const { data: song, error: dbError } = await supabaseAdmin
      .from('songs')
      .select('id, blob_url')
      .eq('id', songId)
      .single();

    if (dbError || !song) {
      console.error('Error fetching song from Supabase:', dbError);
      return NextResponse.json({ error: 'Canción no encontrada o error en la base de datos.' }, { status: 404 });
    }

    // 3. Delete file from Cloudflare R2 (if it exists and is an R2 URL)
    if (song.blob_url) {
              const r2PublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
              if (r2PublicUrl && song.blob_url.startsWith(r2PublicUrl)) {
                // Extract the key by removing the public URL prefix
                let key = song.blob_url.substring(r2PublicUrl.length);
                // Ensure no leading slash if r2PublicUrl ends without one and key starts with one
                const finalKey = key.startsWith('/') ? key.substring(1) : key;
      
                if (finalKey) { // Check if key is not empty
                  const deleteParams = {
                    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                    Key: finalKey,
                  };
                  await r2.send(new DeleteObjectCommand(deleteParams));
                } else {
                  console.warn(`Could not extract a valid R2 key from URL: ${song.blob_url}`);
                }
              }
      // Note: We are not handling deletion of Supabase storage files here as per user request to deprecate it.
    }

    // 4. Delete the song record from Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('songs')
      .delete()
      .eq('id', songId);

    if (deleteError) {
      console.error('Error deleting song from Supabase:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar la canción de la base de datos.' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Canción eliminada correctamente.' });

    } catch (error) {    console.error('Error en la ruta de eliminación de canción:', error);
    const errorMessage = error instanceof Error ? error.message : 'Un error inesperado ocurrió.';
    return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  }
}
