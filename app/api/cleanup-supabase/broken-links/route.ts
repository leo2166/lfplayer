import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { r2 } from '@/lib/cloudflare/r2';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper function to find broken links
async function findBrokenSupabaseRecords() {
    // 1. Get all file keys from Cloudflare R2
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;
    const r2FileKeys = new Set<string>();
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

    while (isTruncated) {
        const { Contents, IsTruncated, NextContinuationToken } = await r2.send(
            new ListObjectsV2Command({
                Bucket: bucketName,
                ContinuationToken: continuationToken,
            })
        );
        if (Contents) {
            Contents.forEach((item) => {
                if (item.Key) r2FileKeys.add(item.Key);
            });
        }
        isTruncated = IsTruncated ?? false;
        continuationToken = NextContinuationToken;
    }

    // 2. Get all songs from Supabase
    const { data: songs, error: dbError } = await supabaseAdmin
        .from('songs')
        .select('id, title, artist, blob_url');
        
    if (dbError) {
        throw new Error(`Error de base de datos: ${dbError.message}`);
    }

    const r2PublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
    if (!r2PublicUrl) {
        throw new Error('La URL pública de R2 no está configurada.');
    }

    // 3. Find songs in Supabase that don't have a corresponding file in R2
    const brokenRecords = songs.filter(song => {
        if (!song.blob_url || !song.blob_url.startsWith(r2PublicUrl)) {
            // Include records with invalid or missing blob_urls as broken
            return true;
        }
        let key = song.blob_url.substring(r2PublicUrl.length);
        const finalKey = key.startsWith('/') ? key.substring(1) : key;
        
        return !r2FileKeys.has(finalKey);
    });

    return {
        brokenRecords,
        totalR2Files: r2FileKeys.size,
        totalSupabaseSongs: songs.length,
    };
}


// GET handler to find and return broken links
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 });
    }

    const { brokenRecords, totalR2Files, totalSupabaseSongs } = await findBrokenSupabaseRecords();

    return NextResponse.json({
      message: 'Análisis de registros rotos completado.',
      totalR2Files,
      totalSupabaseSongs,
      brokenRecordCount: brokenRecords.length,
      brokenRecords,
    });

  } catch (error) {
    console.error('Error en GET /api/cleanup-supabase/broken-links:', error);
    const errorMessage = error instanceof Error ? error.message : 'Un error inesperado ocurrió.';
    return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  }
}

// DELETE handler to remove broken links
export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profileError || !profile || profile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 });
        }

        const { brokenRecords } = await findBrokenSupabaseRecords();

        if (brokenRecords.length === 0) {
            return NextResponse.json({ message: "No se encontraron registros rotos para eliminar." });
        }
        
        const idsToDelete = brokenRecords.map(record => record.id);

        const { error: deleteError } = await supabaseAdmin
            .from('songs')
            .delete()
            .in('id', idsToDelete);

        if (deleteError) {
            throw new Error(`Error al eliminar registros de Supabase: ${deleteError.message}`);
        }

        revalidatePath('/app');

        return NextResponse.json({
            message: 'Limpieza de registros rotos completada.',
            deletedCount: idsToDelete.length,
        });

    } catch (error) {
        console.error('Error en DELETE /api/cleanup-supabase/broken-links:', error);
        const errorMessage = error instanceof Error ? error.message : 'Un error inesperado ocurrió.';
        return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
    }
}
