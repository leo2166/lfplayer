const { createClient } = require('@supabase/supabase-js');
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

async function main() {
    console.log("Cargando lista de huérfanos originales...");
    const orphansPath = path.join(process.cwd(), 'orphans.json');
    if (!fs.existsSync(orphansPath)) {
        console.error("orphans.json no encontrado.");
        return;
    }
    // These are just keys (filenames)
    const orphans = JSON.parse(fs.readFileSync(orphansPath, 'utf-8'));

    // Take a sample of 5 keys to query
    const sampleKeys = orphans.slice(0, 10);
    console.log(`Buscando 10 de ${orphans.length} archivos en DB...`);

    // Construct partial match for blob_url (since blob_url contains the full R2 URL)
    // We can use ILIKE logic or just fetch all and filter in memory if needed, but OR query is better.
    // Actually, blob_url usually ends with the key if we constructed it standardly.
    // Let's search by substring of the key.

    const query = supabase
        .from('songs')
        .select('id, title, artist, genre_id, genres(name), blob_url')
        .or(sampleKeys.map(k => `blob_url.ilike.%${k}%`).join(','));

    const { data: songs, error } = await query;

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Encontradas ${songs.length} coincidencias en DB.`);
    songs.forEach(s => {
        console.log(`- Title: '${s.title}' | ARTIST: '${s.artist}' | URL: ...${s.blob_url.slice(-20)}`);
    });
}

main();
