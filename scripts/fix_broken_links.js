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
    console.log("=== ELIMINANDO CANCIONES ROTAS ===\n");

    const jsonPath = path.join(process.cwd(), 'broken_songs.json');
    if (!fs.existsSync(jsonPath)) {
        console.error("❌ No se encontró 'broken_songs.json'. Ejecuta primero: node scripts/check_broken_links.js");
        return;
    }

    const brokenSongs = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`📋 Se eliminarán ${brokenSongs.length} registros de canciones rotas en DB.\n`);

    if (brokenSongs.length === 0) {
        console.log("✅ No hay canciones por eliminar.");
        return;
    }

    let deletedCount = 0;
    let errors = 0;

    for (const item of brokenSongs) {
        const { song } = item;
        console.log(`🗑️ Eliminando registro DB: "${song.artist}" - ${song.title} (ID: ${song.id})`);

        const { error } = await supabase
            .from('songs')
            .delete()
            .eq('id', song.id);

        if (error) {
            console.error(`   ❌ Error al eliminar: ${error.message}`);
            errors++;
        } else {
            console.log(`   ✅ Registro eliminado correctamente.`);
            deletedCount++;
        }
    }

    console.log("\n=== RESUMEN ===");
    console.log(`✅ Eliminados: ${deletedCount}`);
    console.log(`❌ Errores: ${errors}`);

    if (deletedCount > 0) {
        fs.unlinkSync(jsonPath);
        console.log(`\n🗑️ Archivo 'broken_songs.json' eliminado.`);
    }
}

main();
