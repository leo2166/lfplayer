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

async function createOriginalGenres() {
    console.log("🎵 Creando géneros ORIGINALES del proyecto...\n");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("❌ Error: Faltan variables de entorno");
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // GÉNEROS EXACTOS del archivo 006_insert_default_genres.sql
    const originalGenres = [
        { name: 'Rock', color: '#EF4444' },
        { name: 'Pop', color: '#EC4899' },
        { name: 'Hip Hop', color: '#F97316' },
        { name: 'Jazz', color: '#F59E0B' },
        { name: 'Classical', color: '#8B5CF6' },
        { name: 'Electronic', color: '#06B6D4' },
        { name: 'R&B', color: '#D946EF' },
        { name: 'Country', color: '#84CC16' },
        { name: 'Reggae', color: '#10B981' },
        { name: 'Metal', color: '#6366F1' },
        { name: 'Romantica en ingles', color: '#F43F5E' },
        { name: 'Romantica en español', color: '#E11D48' },
        { name: 'Salsa', color: '#FBBF24' },
        { name: 'Merengue', color: '#F59E0B' },
        { name: 'Tecno Vallenato', color: '#10B981' },
        { name: 'Gaita Zuliana', color: '#3B82F6' }
    ];

    // Eliminar géneros incorrectos primero
    console.log("🗑️  Limpiando géneros incorrectos...");
    await supabase.from('genres').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("✅ Limpieza completada\n");

    console.log("📝 Creando géneros originales:\n");

    for (const genre of originalGenres) {
        const { error } = await supabase.from('genres').insert({
            name: genre.name,
            color: genre.color
        });

        if (error) {
            console.error(`❌ ${genre.name}:`, error.message);
        } else {
            console.log(`✅ ${genre.name}`);
        }
    }

    console.log(`\n📊 Total creados: ${originalGenres.length} géneros`);
    console.log(`\n💡 Recarga la página (F5) para ver los géneros`);
}

createOriginalGenres();
