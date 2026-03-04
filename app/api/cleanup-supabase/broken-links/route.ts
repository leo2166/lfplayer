import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getR2ClientForAccount, getBucketConfig } from '@/lib/cloudflare/r2-manager';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper function to find broken links (MULTI-ACCOUNT)
async function findBrokenSupabaseRecords() {
    console.log(`[BROKEN LINKS] Starting broken links check (MULTI-ACCOUNT)`);

    // 1. Get all file keys from available Cloudflare R2 accounts
    const r2FileKeys = new Map<string, Set<string>>();
    const scannedAccounts = new Set<number>();

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
            scannedAccounts.add(accountNumber);
            console.log(`[BROKEN LINKS] Account ${accountNumber}: ${keysForAccount.size} files in bucket ${bucketConfig.bucketName}`);
        } catch (error) {
            console.warn(`[BROKEN LINKS] ⚠️ Account ${accountNumber} skipped (credentials error):`, (error as Error).message);
        }
    }

    if (scannedAccounts.size === 0) {
        throw new Error('No se pudo conectar a ninguna cuenta de R2. Verifica las credenciales.');
    }

    const totalR2Files = Array.from(r2FileKeys.values()).reduce((sum, set) => sum + set.size, 0);
    console.log(`[BROKEN LINKS] Scanned accounts: ${[...scannedAccounts].join(', ')}. Total files: ${totalR2Files}`);

    // 2. Get all songs using batching to bypass Supabase 1000-row limit
    async function batchFetchAllSongs() {
        let allSongs: any[] = [];
        let from = 0;
        let to = 999;
        let finished = false;

        while (!finished) {
            const { data, error } = await supabaseAdmin
                .from('songs')
                .select('id, title, artist, blob_url, storage_account_number')
                .range(from, to);

            if (error) throw error;
            if (!data || data.length === 0) {
                finished = true;
            } else {
                allSongs = [...allSongs, ...data];
                if (data.length < 1000) {
                    finished = true;
                } else {
                    from += 1000;
                    to += 1000;
                }
            }
        }
        return allSongs;
    }

    const songs = await batchFetchAllSongs();
    console.log(`[BROKEN LINKS] Total songs in DB: ${songs.length}`);

    const r2PublicUrl1 = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || '';
    const r2PublicUrl2 = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL_2 || '';

    // 3. Find songs in Supabase that don't have a corresponding file in R2
    //    IMPORTANT: Skip songs belonging to accounts we couldn't scan
    const brokenRecords = songs.filter(song => {
        if (!song.blob_url) {
            return true; // No URL = broken
        }

        let accountNumber: string;
        let key: string;

        if (song.blob_url.startsWith(r2PublicUrl1)) {
            accountNumber = '1';
            key = song.blob_url.substring(r2PublicUrl1.length);
        } else if (r2PublicUrl2 && song.blob_url.startsWith(r2PublicUrl2)) {
            accountNumber = '2';
            key = song.blob_url.substring(r2PublicUrl2.length);
        } else {
            return true; // Invalid URL = broken
        }

        // Skip songs from accounts we couldn't scan (don't falsely mark as broken)
        if (!scannedAccounts.has(Number(accountNumber))) {
            return false;
        }

        const finalKey = key.startsWith('/') ? key.substring(1) : key;
        const accountKeys = r2FileKeys.get(accountNumber);

        if (!accountKeys) {
            return false; // Account not scanned, skip
        }

        return !accountKeys.has(finalKey);
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

        let isAuthorized = false;
        const isOverrideAdmin = user.email ? user.email.toLowerCase().includes('lucidio') : false;
        if (isOverrideAdmin) {
            isAuthorized = true;
        } else {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            if (profile?.role === "admin") {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
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

        let isAuthorized = false;
        const isOverrideAdmin = user.email ? user.email.toLowerCase().includes('lucidio') : false;
        if (isOverrideAdmin) {
            isAuthorized = true;
        } else {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            if (profile?.role === "admin") {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
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
