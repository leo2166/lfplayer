import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Cargar .env.local
try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) return;

            const match = trimmedLine.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();

                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.warn("⚠️ Error leyendo .env.local:", e);
}

async function updateGenresSimple() {
    console.log("🎵 Actualizando géneros musicales (14 géneros)...\n");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("❌ Error: Faltan variables de entorno");
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // Lista completa de 14 géneros en orden correcto
    const correctGenres = [
        { name: "Romántica En Español", color: "#FF6B9D" },
        { name: "Romántica en Ingles", color: "#E91E63" },
        { name: "Merengues", color: "#FFA07A" },
        { name: "Salsa", color: "#FF6B35" },
        { name: "Guaracha", color: "#FFD700" },
        { name: "Gaita Zuliana", color: "#3498DB" },
        { name: "Clásica", color: "#9B59B6" },
        { name: "Urbana", color: "#E74C3C" },
        { name: "Tecno", color: "#00FFFF" },
        { name: "Moderna", color: "#1ABC9C" },
        { name: "Pop", color: "#F39C12" },
        { name: "Musica Venezolana", color: "#FFEB3B" },
        { name: "Vallenatos", color: "#4CAF50" },
        { name: "La hora loca", color: "#FF00FF" }
    ];

    // 1. Eliminar todos los géneros existentes
    console.log("🗑️  Eliminando géneros anteriores...");
    const { error: deleteError } = await supabase
        .from('genres')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (deleteError) {
        console.error("❌ Error eliminando géneros:", deleteError.message);
        return;
    }

    console.log("✅ Géneros anteriores eliminados\n");

    // 2. Crear los 14 géneros correctos
    console.log("📝 Creando géneros correctos:\n");

    for (let i = 0; i < correctGenres.length; i++) {
        const genre = correctGenres[i];
        const { error } = await supabase.from('genres').insert({
            name: genre.name,
            color: genre.color
        });

        if (error) {
            console.error(`❌ Error creando ${genre.name}:`, error.message);
        } else {
            console.log(`✅ ${i + 1}. ${genre.name} - Creado (${genre.color})`);
        }
    }

    console.log(`\n📊 Total creados: ${correctGenres.length} géneros`);
    console.log(`\n🔔 IMPORTANTE: Los géneros se han creado en el orden correcto.`);
    console.log(`   Si existe la columna display_order en Supabase, ejecuta:`);
    console.log(`   npx tsx scripts/set_display_order.ts`);
    console.log(`\n💡 Recarga la página para ver los géneros`);
}

updateGenresSimple();
