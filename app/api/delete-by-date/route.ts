import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getR2ClientForAccount, getBucketConfig, updateBucketUsage } from '@/lib/cloudflare/r2-manager';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
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
    const { date } = await req.json();

    if (!date) {
      return NextResponse.json({ error: 'La fecha es requerida.' }, { status: 400 });
    }

    // 2. Get all songs by the date from Supabase using the admin client
    // The date will be in 'YYYY-MM-DD' format. We need to query for the whole day.
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;

    const { data: foundSongs, error: dbError } = await supabaseAdmin
      .from('songs')
      .select('id, blob_url, storage_account_number')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (dbError) {
      console.error('Error fetching songs from Supabase:', dbError);
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? `Error de base de datos: ${dbError.message}`
        : 'Error al obtener las canciones de la base de datos.';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    if (!foundSongs || foundSongs.length === 0) {
      return NextResponse.json({ 
        message: 'No se encontraron canciones para esta fecha.',
        summary: {
          totalSongs: 0,
          deletedFromR2: 0,
          deletedFromSupabase: 0
        }
      });
    }

    // 3. Delete files from storage (Cloudflare R2 or Supabase Storage)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const deletePromises = [];

    for (const song of foundSongs) {
      if (!song.blob_url) continue;

      const accountNumber = (song.storage_account_number || 1) as 1 | 2;
      const r2Client = getR2ClientForAccount(accountNumber);
      const bucketConfig = getBucketConfig(accountNumber);

      if (song.blob_url.startsWith(bucketConfig.publicUrl)) {
        let key = song.blob_url.substring(bucketConfig.publicUrl.length);
        const finalKey = key.startsWith('/') ? key.substring(1) : key;

        if (finalKey) {
          const deleteParams = {
            Bucket: bucketConfig.bucketName,
            Key: finalKey,
          };
          deletePromises.push(
            r2Client.send(new DeleteObjectCommand(deleteParams))
              .then(() => ({ success: true, accountNumber }))
              .catch(err => ({ success: false, error: err }))
          );
        } else {
          console.warn(`Could not extract a valid R2 key from URL: ${song.blob_url}`);
        }
      }
      else if (supabaseUrl && song.blob_url.startsWith(supabaseUrl)) {
        const urlParts = song.blob_url.split('/public/');
        if (urlParts.length > 1) {
          const storagePath = urlParts[1];
          const [bucketName, ...filePathParts] = storagePath.split('/');
          const filePath = filePathParts.join('/');
          
          if(bucketName && filePath) {
            deletePromises.push(
              supabaseAdmin.storage.from(bucketName).remove([filePath])
                .then(() => ({ success: true, isSupabase: true }))
            );
          }
        }
      }
    }

    const results = await Promise.allSettled(deletePromises);
    let successfulR2Deletions = 0;
    const usageUpdates: Record<number, number> = {};

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            const value = result.value as any;
            if (value.success) {
                if (value.accountNumber) {
                    successfulR2Deletions++;
                    const accountNumber = value.accountNumber as number;
                    usageUpdates[accountNumber] = (usageUpdates[accountNumber] || 0) - 4194304; // -4MB estimado
                    console.log(`Successfully deleted a file from R2 account ${accountNumber}`);
                }
            }
        } else {
            console.error('Failed to delete a file from storage:', result.reason);
        }
    });

    // Actualizar uso de almacenamiento para cada cuenta
    for (const [accountNumber, bytesChange] of Object.entries(usageUpdates)) {
      await updateBucketUsage(Number(accountNumber) as 1 | 2, bytesChange);
    }

    // 4. Delete song records from Supabase
    const songIds = foundSongs.map(song => song.id);
    const { error: deleteSongsError } = await supabaseAdmin
      .from('songs')
      .delete()
      .in('id', songIds);

    if (deleteSongsError) {
      console.error('Error deleting songs from Supabase:', deleteSongsError);
      return NextResponse.json({ error: 'Error al eliminar los registros de la base de datos.' }, { status: 500 });
    }
    
    revalidatePath('/app');
    return NextResponse.json({ 
      message: `Se eliminaron ${foundSongs.length} canciones de la fecha ${date}.`,
      summary: {
        totalSongs: foundSongs.length,
        deletedFromR2: successfulR2Deletions,
        deletedFromSupabase: deleteSongsError === null ? foundSongs.length : 0,
      }
    });

  } catch (error) {
    console.error('Error en la ruta de eliminación por fecha:', error);
    const errorMessage = error instanceof Error ? error.message : 'Un error inesperado ocurrió.';
    return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  }
}
