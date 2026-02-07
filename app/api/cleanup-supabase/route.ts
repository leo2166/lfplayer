import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { r2 } from '@/lib/cloudflare/r2';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';

async function getOrphanKeys() {
    console.log(`[ORPHAN CHECK] Starting orphan check (GLOBAL SCOPE)`);

    // 1. Get all file keys from Cloudflare R2
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;
    const r2FileKeys = new Set<string>();
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

    while (isTruncated) {
        const { Contents, IsTruncated, NextContinuationToken }: any = await r2.send(
            new ListObjectsV2Command({
                Bucket: bucketName,
                ContinuationToken: continuationToken,
            })
        );
        if (Contents) {
            Contents.forEach((item: any) => {
                if (item.Key) r2FileKeys.add(item.Key);
            });
        }
        isTruncated = IsTruncated ?? false;
        continuationToken = NextContinuationToken;
    }

    console.log(`[ORPHAN CHECK] Total files in R2: ${r2FileKeys.size}`);

    // 2. Get all songs (Global cleanup)
    // Using range to bypass default 1000 row limit
    const { data: songs, error: dbError } = await supabaseAdmin
        .from('songs')
        .select('blob_url, title, artist')
        .range(0, 9999);

    if (dbError) {
        throw new Error(`Error de base de datos: ${dbError.message}`);
    }

    console.log(`[ORPHAN CHECK] Total songs in DB: ${songs.length}`);

    const supabaseFileKeys = new Set<string>();
    const r2PublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
    if (!r2PublicUrl) {
        throw new Error('La URL pública de R2 no está configurada.');
    }

    songs.forEach(song => {
        if (song.blob_url && song.blob_url.startsWith(r2PublicUrl)) {
            let key = song.blob_url.substring(r2PublicUrl.length);
            const finalKey = key.startsWith('/') ? key.substring(1) : key;
            if (finalKey) {
                supabaseFileKeys.add(finalKey);
            }
        }
    });

    // 3. Compare the two sets to find orphans
    const orphanKeys: string[] = [];
    r2FileKeys.forEach(key => {
        if (!supabaseFileKeys.has(key)) {
            orphanKeys.push(key);
            console.log(`[ORPHAN CHECK] Found orphan: ${key}`);
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
            orphanKeys,
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

        const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
        const objectsToDelete = orphanKeys.map(key => ({ Key: key }));

        // R2 delete can handle up to 1000 keys at a time
        const promises = [];
        for (let i = 0; i < objectsToDelete.length; i += 1000) {
            const chunk = objectsToDelete.slice(i, i + 1000);
            const deleteParams = {
                Bucket: bucketName,
                Delete: { Objects: chunk },
            };
            promises.push(r2.send(new DeleteObjectsCommand(deleteParams)));
        }

        const results = await Promise.allSettled(promises);

        let deletedCount = 0;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const response: any = result.value;
                if (response.Deleted) {
                    deletedCount += response.Deleted.length;
                }
                if (response.Errors) {
                    console.error(`Error eliminando un chunk de archivos:`, response.Errors);
                }
            } else {
                console.error('Fallo una promesa de eliminación de chunk:', result.reason);
            }
        });

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
