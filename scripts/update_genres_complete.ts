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

async function updateGenres() {
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
        { name: "Romántica En Español", color: "#FF6B9D", display_order: 1 },
        { name: "Romántica en Ingles", color: "#E91E63", display_order: 2 },
        { name: "Merengues", color: "#FFA07A", display_order: 3 },
        { name: "Salsa", color: "#FF6B35", display_order: 4 },
        { name: "Guaracha", color: "#FFD700", display_order: 5 },
        { name: "Gaita Zuliana", color: "#3498DB", display_order: 6 },
        { name: "Clásica", color: "#9B59B6", display_order: 7 },
        { name: "Urbana", color: "#E74C3C", display_order: 8 },
        { name: "Tecno", color: "#00FFFF", display_order: 9 },
        { name: "Moderna", color: "#1ABC9C", display_order: 10 },
        { name: "Pop", color: "#F39C12", display_order: 11 },
        { name: "Musica Venezolana", color: "#FFEB3B", display_order: 12 },
        { name: "Vallenatos", color: "#4CAF50", display_order: 13 },
        { name: "La hora loca", color: "#FF00FF", display_order: 14 }
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

    for (const genre of correctGenres) {
        const { error } = await supabase.from('genres').insert({
            name: genre.name,
            color: genre.color,
            display_order: genre.display_order
        });

        if (error) {
            console.error(`❌ Error creando ${genre.name}:`, error.message);
        } else {
            console.log(`✅ ${genre.display_order}. ${genre.name} - Creado (${genre.color})`);
        }
    }

    console.log(`\n📊 Total creados: ${correctGenres.length} géneros`);
    console.log(`\n💡 Recarga la página para ver los géneros correctos`);
}

updateGenres();
