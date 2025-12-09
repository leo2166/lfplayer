import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { r2 } from '@/lib/cloudflare/r2';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
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

    // 2. Get all file keys from Cloudflare R2
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;
    const r2FileKeys = new Set<string>();
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

    console.log('Starting to fetch keys from R2 bucket:', bucketName);

    while (isTruncated) {
      const { Contents, IsTruncated, NextContinuationToken } = await r2.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
        })
      );

      if (Contents) {
        Contents.forEach((item) => {
          if (item.Key) {
            r2FileKeys.add(item.Key);
          }
        });
      }
      
      isTruncated = IsTruncated ?? false;
      continuationToken = NextContinuationToken;
    }

    console.log(`Found ${r2FileKeys.size} total files in R2.`);

    // 3. Get all blob_urls from Supabase
    const { data: songs, error: dbError } = await supabaseAdmin
      .from('songs')
      .select('blob_url');

    if (dbError) {
      console.error('Error fetching songs from Supabase:', dbError);
      return NextResponse.json({ error: 'Error al obtener las canciones de la base de datos.' }, { status: 500 });
    }

    const supabaseFileKeys = new Set<string>();
    const r2PublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;

    if (!r2PublicUrl) {
        return NextResponse.json({ error: 'La URL pública de R2 no está configurada.' }, { status: 500 });
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

    console.log(`Found ${supabaseFileKeys.size} files referenced in Supabase.`);

    // 4. Compare the two sets to find orphans
    const orphanKeys: string[] = [];
    r2FileKeys.forEach(key => {
      if (!supabaseFileKeys.has(key)) {
        orphanKeys.push(key);
      }
    });

    console.log(`Found ${orphanKeys.length} orphan files.`);

    // 5. Return the result
    return NextResponse.json({
      message: 'Análisis de archivos huérfanos completado.',
      totalR2Files: r2FileKeys.size,
      totalSupabaseFiles: supabaseFileKeys.size,
      orphanFileCount: orphanKeys.length,
      orphanKeys: orphanKeys, // Returning the keys for inspection
    });

  } catch (error) {
    console.error('Error en la ruta de limpieza de R2:', error);
    const errorMessage = error instanceof Error ? error.message : 'Un error inesperado ocurrió.';
    return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  }
}
