
const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    // 1. Load Environment Variables
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
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
    } else {
        console.error("No se encontró .env.local");
        return;
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;

    if (!SUPABASE_URL || !SUPABASE_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
        console.error("Faltan variables de entorno críticas.");
        return;
    }

    // 2. Initialize Clients
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
    });

    const r2 = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        },
    });

    console.log("Iniciando verificación de integridad...");

    // 3. Fetch R2 Files
    const r2Files = new Set();
    let isTruncated = true;
    let continuationToken = undefined;

    process.stdout.write("Leyendo archivos de R2... ");
    try {
        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: R2_BUCKET,
                ContinuationToken: continuationToken,
            });
            const response = await r2.send(command);
            if (response.Contents) {
                response.Contents.forEach(item => {
                    if (item.Key) r2Files.add(item.Key);
                });
            }
            isTruncated = response.IsTruncated;
            continuationToken = response.NextContinuationToken;
        }
        console.log(`OK. (${r2Files.size} archivos)`);
    } catch (e) {
        console.error("\nError leyendo R2:", e.message);
        return;
    }

    // 4. Fetch Supabase Records
    process.stdout.write("Leyendo registros de Supabase... ");
    // Try to fetch all songs (ignoring RLS if using Service Role, or failing if Anon and RLS blocks)
    const { data: songs, error } = await supabase.from('songs').select('id, title, artist, blob_url');

    if (error) {
        console.error("\nError leyendo Supabase:", error.message);
        return;
    }
    console.log(`OK. (${songs.length} canciones)`);

    // 5. Analyze
    const orphans = [];
    const brokenLinks = [];
    const supabaseFileKeys = new Set();

    // Normalize Logic
    songs.forEach(song => {
        if (song.blob_url && song.blob_url.startsWith(R2_PUBLIC_URL)) {
            let key = song.blob_url.substring(R2_PUBLIC_URL.length);
            key = key.startsWith('/') ? key.substring(1) : key;

            supabaseFileKeys.add(key);

            if (!r2Files.has(key)) {
                brokenLinks.push({ title: song.title, artist: song.artist, id: song.id, key });
            }
        } else {
            // Consider it a record with invalid URL logic if needed, but for now just skip or mark
            brokenLinks.push({ title: song.title, artist: song.artist, id: song.id, reason: "Invalid URL" });
        }
    });

    r2Files.forEach(key => {
        // 1. Exact match
        if (supabaseFileKeys.has(key)) return;

        // 2. Try URL-decoded match (Key in R2 is encoded, DB has it decoded)
        // OR Key in R2 is decoded, DB has it "slightly" different equivalent
        const keyDecoded = decodeURIComponent(key);
        if (supabaseFileKeys.has(keyDecoded)) return;

        // 3. Reverse check: Iterate DB keys and check if they decode to this key
        // (Expensive but necessary for verification script)
        let found = false;
        for (const dbKey of supabaseFileKeys) {
            try {
                if (decodeURIComponent(dbKey) === keyDecoded) {
                    found = true;
                    break;
                }
            } catch (e) { }
        }
        if (found) return;

        orphans.push(key);
    });

    // 6. Report
    console.log("\n--- RESULTADOS ---");
    console.log(`Total Archivos R2: ${r2Files.size}`);
    console.log(`Total Canciones DB: ${songs.length}`);

    console.log(`\n[ARCHIVOS HUÉRFANOS] (En R2 pero no en DB): ${orphans.length}`);
    if (orphans.length > 0) {
        console.log("  Lista completa:");
        orphans.forEach(o => console.log(`  - ${o}`));
    }

    console.log(`\n[ENLACES ROTOS] (En DB pero no en R2): ${brokenLinks.length}`);
    if (brokenLinks.length > 0) {
        brokenLinks.slice(0, 3).forEach(b => console.log(`  - ${b.artist} - ${b.title} (${b.reason || b.key})`));
    }
}

main().catch(console.error);
