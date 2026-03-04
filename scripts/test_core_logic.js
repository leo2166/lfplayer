const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        let key = parts[0].trim();
        if (key.startsWith('#')) return;
        let value = parts.slice(1).join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

const supabaseAdmin = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const r2Client1 = new S3Client({
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    }
});

const r2Client2 = new S3Client({
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID_2}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID_2,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_2,
    }
});

async function testLogic() {
    try {
        console.log("Testing R2 Account 1...");
        let res1 = await r2Client1.send(new ListObjectsV2Command({ Bucket: env.CLOUDFLARE_R2_BUCKET_NAME, MaxKeys: 10 }));
        console.log("Account 1 OK. Items:", res1.Contents ? res1.Contents.length : 0);

        console.log("Testing R2 Account 2...");
        let res2 = await r2Client2.send(new ListObjectsV2Command({ Bucket: env.CLOUDFLARE_R2_BUCKET_NAME_2, MaxKeys: 10 }));
        console.log("Account 2 OK. Items:", res2.Contents ? res2.Contents.length : 0);

        console.log("Testing Supabase Query...");
        const { data: songs, error } = await supabaseAdmin.from('songs').select('id, title, artist, blob_url, storage_account_number').range(0, 10);
        if (error) throw new Error(error.message);
        console.log("Supabase OK. Songs:", songs.length);
        console.log("Sample song:", songs[0]);

    } catch (e) {
        console.error("ERROR ENCOUNTERED:", e);
    }
}

testLogic();
