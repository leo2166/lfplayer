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
    console.log("=== LIMPIEZA DE PLAYLISTS VACÍAS ===\n");

    // 1. Obtener todas las playlists
    const { data: playlists, error } = await supabase
        .from('playlists')
        .select('id, name');

    if (error) {
        console.error("Error al obtener playlists:", error);
        return;
    }

    console.log(`Analizando ${playlists.length} playlists...`);

    let deletedCount = 0;

    for (const pl of playlists) {
        // 2. Contar canciones en cada playlist
        const { count, error: countError } = await supabase
            .from('playlist_songs')
            .select('id', { count: 'exact', head: true })
            .eq('playlist_id', pl.id);

        if (countError) {
            console.error(`Error al contar canciones de playlist ${pl.name}:`, countError);
            continue;
        }

        if (count === 0) {
            console.log(`🗑️ Eliminando playlist vacía: "${pl.name}" (ID: ${pl.id})`);

            const { error: delError } = await supabase
                .from('playlists')
                .delete()
                .eq('id', pl.id);

            if (delError) {
                console.error(`   ❌ Error al eliminar: ${delError.message}`);
            } else {
                console.log(`   ✅ Eliminada.`);
                deletedCount++;
            }
        }
    }

    console.log(`\n=== RESUMEN ===`);
    console.log(`Playlists eliminadas: ${deletedCount}`);
}

main();
