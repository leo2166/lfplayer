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
    console.log("Iniciando recuperación de huérfanos...");

    // 1. Get User ID (Assume first user or admin)
    // For now, we'll try to get the 'admin' user if possible, or a hardcoded one if needed.
    // Better: Get the user associated with the existing Joe Arroyo songs
    const { data: existingSong } = await supabase.from('songs').select('user_id').limit(1).single();
    if (!existingSong) {
        console.error("No se pudo identificar usuario. Abortando.");
        return;
    }
    const userId = existingSong.user_id;
    console.log(`Usuario identificado: ${userId}`);

    // 2. Get Genre 'Salsa'
    const { data: genreData, error: genreError } = await supabase
        .from('genres')
        .select('id')
        .ilike('name', 'Salsa') // Case insensitive match
        .single();

    let genreId = null;
    if (genreData) {
        genreId = genreData.id;
        console.log(`Género 'Salsa' encontrado: ${genreId}`);
    } else {
        console.log("Género 'Salsa' no encontrado. Se usará NULL (o se creará uno 'Recuperado' si se prefiere). Usando NULL por ahora.");
    }

    // 3. Load Orphans
    const orphansPath = path.join(process.cwd(), 'orphans.json');
    if (!fs.existsSync(orphansPath)) {
        console.error("orphans.json no encontrado.");
        return;
    }
    const orphans = JSON.parse(fs.readFileSync(orphansPath, 'utf-8'));
    console.log(`Cargados ${orphans.length} huérfanos.`);

    // 4. Transform to Songs
    const songsToInsert = orphans.map(key => {
        // Key format: UUID-filename.mp3
        // Example: 06856065-8689-41d0-b6cc-ff027d8ad45e-051 SE ME OLVIDO OTRA VEZ.mp3
        const parts = key.split('-');

        // Find where the UUID ends. UUID has 5 parts (8-4-4-4-12).
        // Standard UUID has 4 dashes.
        // So the first 5 elements of split are the UUID parts.
        // The rest is the filename.
        let filename = parts.slice(5).join('-');

        // Remove extension
        let title = filename.replace(/\.mp3$/i, '');
        let artist = "Recuperado (Por Editar)";

        // Try to parse Artist - Title
        // Common format in playlist: "Title - Artist" or "Artist - Title"
        // Example: "062 FABRICANDO FANTASIAS - TITO NIEVES" -> Title: Fabricando Fantasias, Artist: Tito Nieves
        if (title.includes(' - ')) {
            const splitTitle = title.split(' - ');
            // Heuristic: If first part is numbered (e.g. "062 ..."), it's likely the title?
            // Or "Artist - Title"? 
            // Let's assume simplest: Store full info in Title, allow user to edit.
            // Or split:
            if (splitTitle.length >= 2) {
                // Ambiguous. Let's keep it safe.
                // We will verify if one looks like a number
                if (/^\d+/.test(splitTitle[0])) {
                    // "062 FABRICANDO FANTASIAS" - "TITO NIEVES"
                    title = splitTitle[0];
                    artist = splitTitle[1];
                } else {
                    // "TITO ROJAS" - "DOBLE" or "DOBLE" - "TITO ROJAS"
                    // Hard to guess.
                    artist = splitTitle[0]; // Assume Artist - Title
                    title = splitTitle.slice(1).join(' - ');
                }
            }
        }

        // Clean up
        artist = artist.trim();
        title = title.trim();

        return {
            user_id: userId,
            title: title,
            artist: artist,
            genre_id: genreId,
            blob_url: `${R2_PUBLIC_URL}/${key}`,
            duration: 0 // Unknown
        };
    });

    // 5. Insert
    console.log(`Insertando ${songsToInsert.length} canciones... (Lotes de 50)`);

    const batchSize = 50;
    for (let i = 0; i < songsToInsert.length; i += batchSize) {
        const batch = songsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('songs').insert(batch);
        if (error) {
            console.error(`Error insertando lote ${i}:`, error.message);
        } else {
            console.log(`Lote ${i} - ${i + batch.length} insertado.`);
        }
    }

    console.log("Recuperación completada.");
}

main().catch(console.error);
