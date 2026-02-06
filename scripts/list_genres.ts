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

async function listGenres() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("❌ Error: Faltan variables de entorno");
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("📋 Géneros actuales en la base de datos:\n");

    const { data: genres, error } = await supabase
        .from('genres')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("❌ Error:", error.message);
        return;
    }

    if (!genres || genres.length === 0) {
        console.log("⚠️  No hay géneros en la base de datos");
        return;
    }

    genres.forEach((genre, index) => {
        console.log(`${index + 1}. ${genre.name} (Color: ${genre.color || 'sin color'}) [ID: ${genre.id}]`);
    });

    console.log(`\n📊 Total: ${genres.length} géneros`);
}

listGenres();
