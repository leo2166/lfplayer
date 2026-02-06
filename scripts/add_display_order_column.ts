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

async function addDisplayOrderColumn() {
    console.log("🔧 Agregando columna display_order a la tabla genres...\n");

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

    // Ejecutar SQL para agregar columna
    console.log("📝 Ejecutando SQL para agregar columna...");

    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: 'ALTER TABLE genres ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;'
    });

    if (error) {
        console.log("⚠️  RPC no disponible, intentando método alternativo...\n");
        console.log("📋 Por favor ejecuta este SQL manualmente en Supabase:");
        console.log("━".repeat(60));
        console.log("ALTER TABLE genres ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;");
        console.log("━".repeat(60));
        console.log("\n💡 Ve a tu proyecto en Supabase → SQL Editor y ejecuta el comando anterior");
        return;
    }

    console.log("✅ Columna display_order agregada correctamente\n");
    console.log("🎵 Ahora puedes ejecutar: npx tsx scripts/update_genres_complete.ts");
}

addDisplayOrderColumn();
