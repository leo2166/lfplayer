import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getR2ClientForAccount, getAccountNumberFromUrl, getBucketConfig, updateBucketUsage } from '@/lib/cloudflare/r2-manager';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
      .select('id, blob_url, storage_account_number')
      .eq('id', songId)
      .single();

    if (dbError || !song) {
      console.error('Error fetching song from Supabase:', dbError);
      return NextResponse.json({ error: 'Canción no encontrada o error en la base de datos.' }, { status: 404 });
    }

    // 3. Delete file from Cloudflare R2 (multi-account aware)
    if (song.blob_url) {
      try {
        const accountNumber = getAccountNumberFromUrl(song.blob_url) as 1 | 2;
        const r2Client = getR2ClientForAccount(accountNumber);
        const bucketConfig = getBucketConfig(accountNumber);

        if (song.blob_url.startsWith(bucketConfig.publicUrl)) {
          let key = song.blob_url.substring(bucketConfig.publicUrl.length);
          const finalKey = key.startsWith('/') ? key.substring(1) : key;

          if (finalKey) {
            await r2Client.send(new DeleteObjectCommand({
              Bucket: bucketConfig.bucketName,
              Key: finalKey,
            }));
            console.log(`Successfully deleted object from R2 account ${accountNumber}: ${finalKey}`);

            // Update storage usage
            await updateBucketUsage(accountNumber, -4194304); // -4MB estimate
          } else {
            console.warn(`Could not extract a valid R2 key from URL: ${song.blob_url}`);
          }
        }
      } catch (r2Error) {
        console.error("Error deleting from R2:", r2Error);
        // Continue with DB deletion even if R2 fails
      }
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

    revalidatePath('/app');
    return NextResponse.json({ message: 'Canción eliminada correctamente.' });

  } catch (error) {
    console.error('Error en la ruta de eliminación de canción:', error);
    const errorMessage = error instanceof Error ? error.message : 'Un error inesperado ocurrió.';
    return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  }
}
