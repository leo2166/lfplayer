// test_broken_links_logic.ts
import { supabaseAdmin } from './lib/supabase/admin';
import { getR2ClientForAccount, getBucketConfig } from './lib/cloudflare/r2-manager';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

const r2PublicUrl1 = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || '';
const r2PublicUrl2 = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL_2 || '';

async function findBrokenSupabaseRecords() {
    console.log(`[BROKEN LINKS] Starting broken links check (MULTI-ACCOUNT)`);

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

    const { data: songs, error: dbError } = await supabaseAdmin
        .from('songs')
        .select('id, title, artist, blob_url, storage_account_number')
        .range(0, 9999);

    if (dbError) {
        throw new Error(`Error de base de datos: ${dbError.message}`);
    }

    console.log(`[BROKEN LINKS] Total songs in DB: ${songs ? songs.length : 0}`);
}

async function main() {
    try {
        await findBrokenSupabaseRecords();
        console.log("Success");
    } catch (e) {
        console.error("Failed:", e);
    }
}
main();
