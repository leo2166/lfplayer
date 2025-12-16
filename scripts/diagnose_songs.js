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
    console.log("=== DIAGNÓSTICO COMPLETO DE CANCIONES ===\n");

    // 1. Total count
    const { count: totalCount, error: countErr } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
        console.error("Error al contar:", countErr);
        return;
    }
    console.log(`📊 TOTAL DE CANCIONES EN DB: ${totalCount}`);

    // 2. Test with range(0, 50000) - what the page uses
    const { data: songsWithRange, error: rangeErr } = await supabase
        .from('songs')
        .select('id, title, artist')
        .order('title', { ascending: true })
        .range(0, 50000);

    if (rangeErr) {
        console.error("Error con range:", rangeErr);
    } else {
        console.log(`📥 Canciones devueltas con .range(0, 50000): ${songsWithRange.length}`);
    }

    // 3. Test without range - default Supabase behavior
    const { data: songsNoRange, error: noRangeErr } = await supabase
        .from('songs')
        .select('id, title, artist')
        .order('title', { ascending: true });

    if (noRangeErr) {
        console.error("Error sin range:", noRangeErr);
    } else {
        console.log(`📥 Canciones devueltas SIN .range(): ${songsNoRange.length}`);
    }

    // 4. Group by artist to check distribution
    const artistCounts = {};
    if (songsWithRange) {
        songsWithRange.forEach(song => {
            const artist = song.artist || 'Desconocido';
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        });
    }

    const sortedArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    console.log("\n📁 TOP 20 ARTISTAS (por cantidad de canciones):");
    sortedArtists.forEach(([artist, count], i) => {
        console.log(`   ${i + 1}. ${artist}: ${count} canciones`);
    });

    // 5. Check for the small folders (7 and 3 songs) - looking for Joe Arroyo, Adolescentes, Guaco
    console.log("\n🔍 VERIFICACIÓN DE ARTISTAS DE CARPETAS PEQUEÑAS:");

    const smallFolderArtists = ['Joe Arroyo', 'joe arroyo', 'Adolescentes', 'Guaco'];
    for (const artistSearch of smallFolderArtists) {
        const { data: artistSongs } = await supabase
            .from('songs')
            .select('id, title, artist')
            .ilike('artist', `%${artistSearch}%`);

        if (artistSongs && artistSongs.length > 0) {
            console.log(`   ✅ "${artistSearch}": ${artistSongs.length} canciones encontradas`);
        } else {
            console.log(`   ❌ "${artistSearch}": NO encontradas`);
        }
    }

    // 6. Check genres
    console.log("\n📂 GÉNEROS EN LA BASE DE DATOS:");
    const { data: genres, error: genreErr } = await supabase
        .from('genres')
        .select('id, name, color')
        .order('name', { ascending: true });

    if (genreErr) {
        console.error("Error con géneros:", genreErr);
    } else {
        genres.forEach((g, i) => {
            console.log(`   ${i + 1}. ${g.name} (${g.color})`);
        });
    }

    // 7. Check songs without genre
    const { count: noGenreCount } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true })
        .is('genre_id', null);

    console.log(`\n⚠️ Canciones SIN género asignado: ${noGenreCount || 0}`);

    // 8. Check songs per genre
    console.log("\n📊 CANCIONES POR GÉNERO:");
    if (genres) {
        for (const genre of genres) {
            const { count } = await supabase
                .from('songs')
                .select('*', { count: 'exact', head: true })
                .eq('genre_id', genre.id);
            console.log(`   ${genre.name}: ${count || 0} canciones`);
        }
    }
}

main();
