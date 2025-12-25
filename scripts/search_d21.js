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

async function searchD21() {
    console.log("=== BUSCANDO CANCIONES/ARTISTAS QUE COMIENCEN CON 'D21' ===\n");

    // Search in songs table
    const { data: songs, error } = await supabase
        .from('songs')
        .select('id, title, artist, blob_url, created_at, genres(name)')
        .or(`title.ilike.D21%,artist.ilike.D21%`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error buscando en Supabase:", error);
        return;
    }

    if (songs.length === 0) {
        console.log("❌ No se encontraron canciones o artistas que comiencen con 'D21'.");
    } else {
        console.log(`✅ Se encontraron ${songs.length} resultado(s):\n`);

        songs.forEach((song, index) => {
            console.log(`${index + 1}. ${song.artist} - ${song.title}`);
            console.log(`   ID: ${song.id}`);
            console.log(`   Género: ${song.genres?.name || 'N/A'}`);
            console.log(`   Fecha: ${new Date(song.created_at).toLocaleString()}`);
            console.log(`   URL: ${song.blob_url}`);
            console.log('');
        });

        // Save results
        const results = {
            searchTerm: 'D21',
            count: songs.length,
            timestamp: new Date().toISOString(),
            songs: songs
        };

        fs.writeFileSync('search_d21_results.json', JSON.stringify(results, null, 2));
        console.log("📁 Resultados guardados en 'search_d21_results.json'");
    }

    // Also search for artists starting with D21
    console.log("\n=== AGRUPANDO POR ARTISTA ===\n");
    const artistsD21 = {};
    songs.forEach(song => {
        const artist = song.artist || 'Desconocido';
        if (artist.toUpperCase().startsWith('D21')) {
            if (!artistsD21[artist]) {
                artistsD21[artist] = [];
            }
            artistsD21[artist].push(song);
        }
    });

    if (Object.keys(artistsD21).length > 0) {
        console.log("Artistas encontrados que comienzan con 'D21':");
        Object.entries(artistsD21).forEach(([artist, songs]) => {
            console.log(`\n📁 ${artist} (${songs.length} canciones)`);
            songs.forEach(song => {
                console.log(`   - ${song.title}`);
            });
        });
    }
}

searchD21().catch(console.error);
