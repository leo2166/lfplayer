const { createClient } = require('@supabase/supabase-js');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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

async function main() {
    console.log("=== ELIMINANDO ARTISTAS CON SOLO 1 CANCIÓN ===\n");

    // Check if the JSON file exists
    const jsonPath = path.join(process.cwd(), 'single_song_artists.json');
    if (!fs.existsSync(jsonPath)) {
        console.error("❌ No se encontró 'single_song_artists.json'. Ejecuta primero: node scripts/find_single_song_artists.js");
        return;
    }

    const toDelete = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`📋 Se eliminarán ${toDelete.length} artistas con 1 sola canción.\n`);

    let deletedFromR2 = 0;
    let deletedFromSupabase = 0;
    let errors = 0;

    for (const item of toDelete) {
        const { artist, song } = item;
        console.log(`🗑️ Eliminando: "${artist}" - ${song.title}`);

        try {
            // 1. Delete from R2
            if (song.blob_url && song.blob_url.startsWith(r2PublicUrl)) {
                let key = song.blob_url.substring(r2PublicUrl.length);
                if (key.startsWith('/')) key = key.substring(1);

                await r2.send(new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                }));
                deletedFromR2++;
                console.log(`   ✓ Eliminado de R2: ${key}`);
            }

            // 2. Delete from Supabase
            const { error } = await supabase
                .from('songs')
                .delete()
                .eq('id', song.id);

            if (error) {
                console.error(`   ❌ Error en Supabase: ${error.message}`);
                errors++;
            } else {
                deletedFromSupabase++;
                console.log(`   ✓ Eliminado de Supabase`);
            }

        } catch (err) {
            console.error(`   ❌ Error: ${err.message}`);
            errors++;
        }

        console.log('');
    }

    console.log("\n=== RESUMEN ===");
    console.log(`✅ Eliminados de R2: ${deletedFromR2}`);
    console.log(`✅ Eliminados de Supabase: ${deletedFromSupabase}`);
    console.log(`❌ Errores: ${errors}`);

    // Delete the JSON file after processing
    fs.unlinkSync(jsonPath);
    console.log(`\n🗑️ Archivo 'single_song_artists.json' eliminado.`);
}

main();
