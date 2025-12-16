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

// Constants
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;

async function main() {
    console.log("Iniciando REPARACIÓN DEFINITIVA de la carpeta 'Salsa Para Hacer El Amor'...");

    // 1. Get Metadata needed for new inserts
    const { data: existingSong } = await supabase.from('songs').select('user_id').limit(1).single();
    const userId = existingSong?.user_id;

    const { data: genreData } = await supabase.from('genres').select('id').ilike('name', 'Salsa').single();
    const genreId = genreData?.id;

    if (!userId || !genreId) {
        console.error("Faltan datos de usuario o género.");
        return;
    }

    // 2. Load Orphans
    const orphansPath = path.join(process.cwd(), 'orphans.json');
    const orphans = JSON.parse(fs.readFileSync(orphansPath, 'utf-8'));
    console.log(`Procesando lista original de ${orphans.length} archivos...`);

    // 3. Process each file
    let updatedCount = 0;
    let insertedCount = 0;

    // Use a loop to process sequentially (safer logic)
    for (const key of orphans) {
        // Construct the expected blob_url
        // Note: R2 Public URL in DB might vary if user changed config, but usually it's consistent.
        // Or we can search by filename suffix.

        // Extract basic info from filename for Fallback Insert
        const parts = key.split('-');
        let filename = parts.slice(5).join('-');
        let title = filename.replace(/\.mp3$/i, '');
        // Clean title if it has numbers
        title = title.replace(/^\d+\s*-?\s*/, '').trim();

        // Search in DB
        const { data: hits, error } = await supabase
            .from('songs')
            .select('id')
            .ilike('blob_url', `%${key}%`); // Safe lookup matches the unique key part

        if (hits && hits.length > 0) {
            // EXISTS -> UPDATE
            const { error: updateError } = await supabase
                .from('songs')
                .update({
                    artist: 'Salsa Para Hacer El Amor',
                    genre_id: genreId
                })
                .eq('id', hits[0].id);

            if (!updateError) updatedCount++;
        } else {
            // MISSING -> INSERT
            const { error: insertError } = await supabase
                .from('songs')
                .insert({
                    user_id: userId,
                    title: title,
                    artist: 'Salsa Para Hacer El Amor',
                    genre_id: genreId,
                    blob_url: `${R2_PUBLIC_URL}/${key}`,
                    duration: 0
                });

            if (!insertError) insertedCount++;
        }
    }

    console.log(`--- FIN DEL PROCESO ---`);
    console.log(`Actualizadas (Corregidas): ${updatedCount}`);
    console.log(`Insertadas (Recuperadas): ${insertedCount}`);
    console.log(`Total en la carpeta: ${updatedCount + insertedCount}`);
}

main().catch(console.error);
