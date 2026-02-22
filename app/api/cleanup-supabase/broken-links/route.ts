import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getR2ClientForAccount, getBucketConfig } from '@/lib/cloudflare/r2-manager';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper function to find broken links (MULTI-ACCOUNT)
async function findBrokenSupabaseRecords() {
    console.log(`[BROKEN LINKS] Starting broken links check (MULTI-ACCOUNT)`);

    // 1. Get all file keys from BOTH Cloudflare R2 accounts
    // Store as "accountNumber:key" for precise matching
    const r2FileKeys = new Map<string, Set<string>>();

    for (const accountNumber of [1, 2] as const) {
        try {
            const r2Client = getR2ClientForAccount(accountNumber);
            const bucketConfig = getBucketConfig(accountNumber);
            const keysForAccount = new Set<string>();
            let isTruncated = true;
            let continuationToken: string | undefined = undefined;

            while (isTruncated) {
                const { Contents, IsTruncated, NextContinuationToken }: any = await r2Client.send(
                    new ListObjectsV2Command({
                        Bucket: bucketConfig.bucketName,
                        ContinuationToken: continuationToken,
                    })
                );
                if (Contents) {
                    Contents.forEach((item: any) => {
                        if (item.Key) keysForAccount.add(item.Key);
                    });
                }
                isTruncated = IsTruncated ?? false;
                continuationToken = NextContinuationToken;
            }

            r2FileKeys.set(String(accountNumber), keysForAccount);
            console.log(`[BROKEN LINKS] Account ${accountNumber}: ${keysForAccount.size} files in bucket ${bucketConfig.bucketName}`);
        } catch (error) {
            console.error(`[BROKEN LINKS] Error scanning account ${accountNumber}:`, error);
            r2FileKeys.set(String(accountNumber), new Set());
        }
    }

    const totalR2Files = Array.from(r2FileKeys.values()).reduce((sum, set) => sum + set.size, 0);
    console.log(`[BROKEN LINKS] Total files across all R2 accounts: ${totalR2Files}`);

    // 2. Get all songs
    const { data: songs, error: dbError } = await supabaseAdmin
        .from('songs')
        .select('id, title, artist, blob_url, storage_account_number')
        .range(0, 9999);

    if (dbError) {
        throw new Error(`Error de base de datos: ${dbError.message}`);
    }

    console.log(`[BROKEN LINKS] Total songs in DB: ${songs.length}`);

    const r2PublicUrl1 = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || '';
    const r2PublicUrl2 = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL_2 || '';

    // 3. Find songs in Supabase that don't have a corresponding file in R2
    const brokenRecords = songs.filter(song => {
        if (!song.blob_url) {
            console.log(`[BROKEN LINKS] Found broken record (no URL): ${song.title} by ${song.artist}`);
            return true;
        }

        // Determine which account this song belongs to
        let accountNumber: string;
        let key: string;

        if (song.blob_url.startsWith(r2PublicUrl1)) {
            accountNumber = '1';
            key = song.blob_url.substring(r2PublicUrl1.length);
        } else if (r2PublicUrl2 && song.blob_url.startsWith(r2PublicUrl2)) {
            accountNumber = '2';
            key = song.blob_url.substring(r2PublicUrl2.length);
        } else {
            console.log(`[BROKEN LINKS] Found broken record (invalid URL): ${song.title} by ${song.artist}`);
            return true;
        }

        const finalKey = key.startsWith('/') ? key.substring(1) : key;
        const accountKeys = r2FileKeys.get(accountNumber);

        if (!accountKeys) {
            console.log(`[BROKEN LINKS] No keys loaded for account ${accountNumber}, marking as broken: ${song.title}`);
            return true;
        }

        const isBroken = !accountKeys.has(finalKey);
        if (isBroken) {
            console.log(`[BROKEN LINKS] Found broken record (missing file in account ${accountNumber}): ${song.title} by ${song.artist} - Key: ${finalKey}`);
        }
        return isBroken;
    });

    console.log(`[BROKEN LINKS] Total broken records found: ${brokenRecords.length}`);
    return {
        brokenRecords,
        totalR2Files,
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
