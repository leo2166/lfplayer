import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getR2ClientForAccount, getBucketConfig } from '@/lib/cloudflare/r2-manager';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';

async function getOrphanKeys() {
    console.log(`[ORPHAN CHECK] Starting orphan check (MULTI-ACCOUNT)`);

    // 1. Get all file keys from BOTH Cloudflare R2 accounts
    const r2FileKeys = new Map<string, { accountNumber: 1 | 2; bucketName: string }>();

    for (const accountNumber of [1, 2] as const) {
        try {
            const r2Client = getR2ClientForAccount(accountNumber);
            const bucketConfig = getBucketConfig(accountNumber);
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
                        if (item.Key) {
                            r2FileKeys.set(`${accountNumber}:${item.Key}`, {
                                accountNumber,
                                bucketName: bucketConfig.bucketName,
                            });
                        }
                    });
                }
                isTruncated = IsTruncated ?? false;
                continuationToken = NextContinuationToken;
            }
            console.log(`[ORPHAN CHECK] Account ${accountNumber}: scanned bucket ${bucketConfig.bucketName}`);
        } catch (error) {
            console.error(`[ORPHAN CHECK] Error scanning account ${accountNumber}:`, error);
        }
    }

    console.log(`[ORPHAN CHECK] Total files across all R2 accounts: ${r2FileKeys.size}`);

    // 2. Get all songs (Global cleanup)
    const { data: songs, error: dbError } = await supabaseAdmin
        .from('songs')
        .select('blob_url, title, artist, storage_account_number')
        .range(0, 9999);

    if (dbError) {
        throw new Error(`Error de base de datos: ${dbError.message}`);
    }

    console.log(`[ORPHAN CHECK] Total songs in DB: ${songs.length}`);

    // 3. Build set of referenced keys (with account prefix)
    const r2PublicUrl1 = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || '';
    const r2PublicUrl2 = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL_2 || '';

    const supabaseFileKeys = new Set<string>();
    songs.forEach(song => {
        if (!song.blob_url) return;

        let accountNumber: 1 | 2 = (song.storage_account_number || 1) as 1 | 2;
        let key = '';

        if (song.blob_url.startsWith(r2PublicUrl1)) {
            key = song.blob_url.substring(r2PublicUrl1.length);
            accountNumber = 1;
        } else if (r2PublicUrl2 && song.blob_url.startsWith(r2PublicUrl2)) {
            key = song.blob_url.substring(r2PublicUrl2.length);
            accountNumber = 2;
        } else {
            return; // Unknown URL format, skip
        }

        const finalKey = key.startsWith('/') ? key.substring(1) : key;
        if (finalKey) {
            supabaseFileKeys.add(`${accountNumber}:${finalKey}`);
        }
    });

    // 4. Find orphans: files in R2 not referenced by any song in DB
    const orphanKeys: { key: string; accountNumber: 1 | 2; bucketName: string }[] = [];
    r2FileKeys.forEach((value, compositeKey) => {
        if (!supabaseFileKeys.has(compositeKey)) {
            const actualKey = compositeKey.split(':').slice(1).join(':');
            orphanKeys.push({
                key: actualKey,
                accountNumber: value.accountNumber,
                bucketName: value.bucketName,
            });
            console.log(`[ORPHAN CHECK] Found orphan in account ${value.accountNumber}: ${actualKey}`);
        }
    });

    console.log(`[ORPHAN CHECK] Total orphans found: ${orphanKeys.length}`);
    return { orphanKeys, totalR2Files: r2FileKeys.size, totalSupabaseFiles: supabaseFileKeys.size };
}

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profileError || !profile || profile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 });
        }

        const { orphanKeys, totalR2Files, totalSupabaseFiles } = await getOrphanKeys();

        return NextResponse.json({
            message: 'Análisis de archivos huérfanos completado.',
            totalR2Files,
            totalSupabaseFiles,
            orphanFileCount: orphanKeys.length,
            orphanKeys: orphanKeys.map(o => o.key),
        });

    } catch (error) {
        console.error('Error en GET /api/cleanup-supabase:', error);
        const errorMessage = error instanceof Error ? error.message : 'Un error inesperado ocurrió.';
        return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profileError || !profile || profile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 });
        }

        const { orphanKeys } = await getOrphanKeys();

        if (orphanKeys.length === 0) {
            return NextResponse.json({ message: "No se encontraron archivos huérfanos para eliminar." });
        }

        // Group orphans by account
        const orphansByAccount = new Map<number, { keys: string[]; bucketName: string }>();
        for (const orphan of orphanKeys) {
            if (!orphansByAccount.has(orphan.accountNumber)) {
                orphansByAccount.set(orphan.accountNumber, { keys: [], bucketName: orphan.bucketName });
            }
            orphansByAccount.get(orphan.accountNumber)!.keys.push(orphan.key);
        }

        let deletedCount = 0;

        for (const [accountNumber, { keys, bucketName }] of orphansByAccount.entries()) {
            const r2Client = getR2ClientForAccount(accountNumber as 1 | 2);
            const objectsToDelete = keys.map(key => ({ Key: key }));

            // R2 delete can handle up to 1000 keys at a time
            const promises = [];
            for (let i = 0; i < objectsToDelete.length; i += 1000) {
                const chunk = objectsToDelete.slice(i, i + 1000);
                promises.push(
                    r2Client.send(new DeleteObjectsCommand({
                        Bucket: bucketName,
                        Delete: { Objects: chunk },
                    }))
                );
            }

            const results = await Promise.allSettled(promises);
            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    const response: any = result.value;
                    if (response.Deleted) {
                        deletedCount += response.Deleted.length;
                    }
                    if (response.Errors) {
                        console.error(`Error eliminando archivos de cuenta ${accountNumber}:`, response.Errors);
                    }
                } else {
                    console.error(`Fallo eliminación en cuenta ${accountNumber}:`, result.reason);
                }
            });
        }

        return NextResponse.json({
            message: 'Limpieza de archivos huérfanos completada.',
            deletedCount,
            totalOrphansFound: orphanKeys.length,
        });

    } catch (error) {
        console.error('Error en DELETE /api/cleanup-supabase:', error);
        const errorMessage = error instanceof Error ? error.message : 'Un error inesperado ocurrió.';
        return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
    }
}
