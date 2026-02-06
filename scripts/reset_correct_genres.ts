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

async function resetGenres() {
    console.log("🔄 Reseteando géneros musicales...\n");

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

    // Géneros correctos (basados en la lista original del usuario)
    const correctGenres = [
        { name: "Románticas en Español", color: "#FF6B9D" },
        { name: "Música Cristiana", color: "#4ECDC4" },
        { name: "Salsa", color: "#FF6B35" },
        { name: "Merengue", color: "#FFA07A" },
        { name: "Baladas", color: "#9B59B6" },
        { name: "Reggaeton", color: "#E74C3C" },
        { name: "Rock en Español", color: "#95A5A6" },
        { name: "Pop Latino", color: "#3498DB" },
        { name: "Cumbia", color: "#F39C12" },
        { name: "Boleros", color: "#C0392B" }
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

    // 2. Crear los géneros correctos
    console.log("📝 Creando géneros correctos:\n");

    for (const genre of correctGenres) {
        const { error } = await supabase.from('genres').insert({
            name: genre.name,
            color: genre.color
        });

        if (error) {
            console.error(`❌ Error creando ${genre.name}:`, error.message);
        } else {
            console.log(`✅ ${genre.name} - Creado (${genre.color})`);
        }
    }

    console.log(`\n📊 Total creados: ${correctGenres.length} géneros`);
    console.log(`\n💡 Recarga la página para ver los géneros correctos`);
}

resetGenres();
