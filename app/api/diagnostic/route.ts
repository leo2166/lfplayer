import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

function getS3Client2() {
  return new S3Client({
    region: 'auto',
    endpoint: "https://" + process.env.CLOUDFLARE_R2_ACCOUNT_ID_2 + ".r2.cloudflarestorage.com",
    credentials: { 
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_2!, 
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_2! 
    },
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: songs } = await supabase.from('songs').select('blob_url');
    
    let s3Keys = new Set();
    try {
        const client2 = getS3Client2();
        let isTruncated = true;
        let continuationToken = undefined;
        while (isTruncated) {
            const res: any = await client2.send(new ListObjectsV2Command({ 
                Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME_2!,
                ContinuationToken: continuationToken
            }));
            res.Contents?.forEach((item: any) => s3Keys.add(item.Key));
            isTruncated = res.IsTruncated ?? false;
            continuationToken = res.NextContinuationToken;
        }
    } catch(e) { console.error("Client2 fail: ", e); }

    const r2Url = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || '';
    
    let matchedNormal = 0;
    
    songs?.forEach(s => {
        if (!s.blob_url) return;
        let suffix = s.blob_url.replace(r2Url + '/', '');
        if (s3Keys.has(suffix)) matchedNormal++;
    });

    return NextResponse.json({
        total_songs: songs?.length,
        total_s3_keys_bucket2: s3Keys.size,
        matchedNormal,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
