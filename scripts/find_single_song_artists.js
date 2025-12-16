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
    console.log("=== BUSCANDO ARTISTAS CON SOLO 1 CANCIÓN ===\n");

    // Get all songs
    const { data: songs, error } = await supabase
        .from('songs')
        .select('id, title, artist, blob_url, created_at')
        .order('artist', { ascending: true });

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Group by artist
    const artistCounts = {};
    songs.forEach(song => {
        const artist = song.artist || 'Desconocido';
        if (!artistCounts[artist]) {
            artistCounts[artist] = [];
        }
        artistCounts[artist].push(song);
    });

    // Find artists with only 1 song
    const singleSongArtists = Object.entries(artistCounts)
        .filter(([artist, songs]) => songs.length === 1)
        .sort((a, b) => a[0].localeCompare(b[0]));

    console.log(`📊 Total de artistas: ${Object.keys(artistCounts).length}`);
    console.log(`⚠️ Artistas con solo 1 canción: ${singleSongArtists.length}\n`);

    if (singleSongArtists.length === 0) {
        console.log("✅ No hay artistas con solo 1 canción. Todo limpio!");
        return;
    }

    console.log("--- LISTA DE ARTISTAS CON 1 SOLA CANCIÓN ---\n");
    singleSongArtists.forEach(([artist, songs], i) => {
        const song = songs[0];
        const date = new Date(song.created_at).toLocaleDateString();
        console.log(`${i + 1}. "${artist}"`);
        console.log(`   Canción: ${song.title}`);
        console.log(`   Fecha: ${date}`);
        console.log(`   ID: ${song.id}`);
        console.log('');
    });

    // Save to JSON for later deletion
    const toDelete = singleSongArtists.map(([artist, songs]) => ({
        artist,
        song: songs[0]
    }));

    fs.writeFileSync('single_song_artists.json', JSON.stringify(toDelete, null, 2));
    console.log(`\n📁 Lista guardada en 'single_song_artists.json'`);
    console.log(`\n⚡ Para eliminar estos artistas, ejecuta: node scripts/delete_single_song_artists.js`);
}

main();
