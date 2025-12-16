const { createClient } = require('@supabase/supabase-js');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[match[1].trim()] = value;
    }
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
});

const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const r2PublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;

async function checkFileExistsInR2(key) {
    try {
        await r2.send(new HeadObjectCommand({
            Bucket: bucketName,
            Key: key,
        }));
        return true;
    } catch (error) {
        if (error.name === 'NotFound') {
            return false;
        }
        // Iterate or log other errors if necessary, but for now assume false or retry could be better?
        // Let's assume false for NotFound, and re-throw for others to see what happens.
        return false;
    }
}

async function main() {
    console.log("=== BUSCANDO ENLACES ROTOS (Canciones en DB sin archivo en R2) ===\n");

    // 1. Fetch all songs
    const { data: songs, error } = await supabase
        .from('songs')
        .select('id, title, artist, blob_url');

    if (error) {
        console.error("Error fetching songs:", error);
        return;
    }

    console.log(`Analizando ${songs.length} canciones... (esto puede tomar un momento)`);

    const brokenSongs = [];

    // Process in batches to avoid overwhelming network but here we can just go sequentially or small parallel
    // Sequentially is safer for script stability.
    let count = 0;
    for (const song of songs) {
        count++;
        if (count % 100 === 0) process.stdout.write('.');

        if (!song.blob_url) {
            brokenSongs.push({ song, reason: "No blob_url" });
            continue;
        }

        // Extract key from blob_url
        let key = song.blob_url;
        if (key.startsWith(r2PublicUrl)) {
            key = key.substring(r2PublicUrl.length);
            if (key.startsWith('/')) key = key.substring(1);
        } else {
            // If url doesn't start with public url, acts suspicious, but check anyway if valid url
            // For this app, they should match
            brokenSongs.push({ song, reason: "URL format mismatch" });
            continue;
        }

        const exists = await checkFileExistsInR2(key);
        if (!exists) {
            brokenSongs.push({ song, reason: "File not found in R2", key });
        }
    }
    console.log("\n");

    if (brokenSongs.length === 0) {
        console.log("✅ No se encontraron enlaces rotos. Todo parece correcto.");
    } else {
        console.log(`⚠️ Se encontraron ${brokenSongs.length} canciones con problemas:\n`);
        brokenSongs.forEach((item, index) => {
            console.log(`${index + 1}. Artista: "${item.song.artist}" - Título: "${item.song.title}"`);
            console.log(`   Razón: ${item.reason}`);
            console.log(`   ID: ${item.song.id}`);
            if (item.key) console.log(`   Key buscada: ${item.key}`);
            console.log('');
        });

        // Save to JSON for potential fixing
        fs.writeFileSync('broken_songs.json', JSON.stringify(brokenSongs, null, 2));
        console.log("📁 Lista guardada en 'broken_songs.json'");
    }
}

main();
