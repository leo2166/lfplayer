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
    console.log("Analizando inserciones recientes para deshacer...");

    // Inspect the last 100 songs
    const { data: songs, error } = await supabase
        .from('songs')
        .select('id, title, artist, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Filter for songs created in the last 1 hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentSongs = songs.filter(s => new Date(s.created_at) > oneHourAgo);

    console.log(`Encontradas ${recentSongs.length} canciones recientes.`);

    if (recentSongs.length === 0) {
        console.log("No hay nada reciente para borrar.");
        return;
    }

    // Show sample to be safe
    console.log("Muestra de canciones a eliminar:");
    recentSongs.slice(0, 5).forEach(s => console.log(`- [${s.artist}] ${s.title} (${s.created_at})`));

    // DELETE
    console.log("\nELIMINANDO REGISTROS DE DB (Los archivos en R2 se conservan)...");
    const idsToDelete = recentSongs.map(s => s.id);

    const { error: deleteError } = await supabase
        .from('songs')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error("Error al eliminar:", deleteError);
    } else {
        console.log("¡Limpieza completada! El Frontend debería volver a la normalidad.");
    }
}

main().catch(console.error);
