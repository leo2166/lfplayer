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

async function createGenres() {
    console.log("🎵 Creando géneros musicales...\n");

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

    // Géneros con colores
    const genres = [
        { name: "Trance", color: "#8B5CF6" },
        { name: "Progressive House", color: "#EC4899" },
        { name: "Tech House", color: "#14B8A6" },
        { name: "Deep House", color: "#F59E0B" },
        { name: "Techno", color: "#EF4444" },
        { name: "Melodic Techno", color: "#06B6D4" },
        { name: "Minimal", color: "#10B981" },
        { name: "Electro House", color: "#6366F1" },
        { name: "Big Room", color: "#F97316" },
        { name: "Psytrance", color: "#A855F7" }
    ];

    console.log(`📋 Verificando géneros existentes...`);
    const { data: existing } = await supabase.from('genres').select('name');
    const existingNames = new Set(existing?.map(g => g.name.toLowerCase()) || []);

    let created = 0;
    let skipped = 0;

    for (const genre of genres) {
        if (existingNames.has(genre.name.toLowerCase())) {
            console.log(`⏭️  ${genre.name} - Ya existe`);
            skipped++;
            continue;
        }

        const { error } = await supabase.from('genres').insert({
            name: genre.name,
            color: genre.color
        });

        if (error) {
            console.error(`❌ Error creando ${genre.name}:`, error.message);
        } else {
            console.log(`✅ ${genre.name} - Creado (${genre.color})`);
            created++;
        }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Creados: ${created}`);
    console.log(`   ⏭️  Ya existían: ${skipped}`);
    console.log(`   📝 Total: ${genres.length}`);
    console.log(`\n💡 Recarga la página para ver los géneros`);
}

createGenres();
