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

async function addRoleColumn() {
    console.log("🔧 Agregando columna 'role' a la tabla profiles...\n");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("❌ Error: Faltan variables de entorno");
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("📋 NECESITAS EJECUTAR ESTE SQL MANUALMENTE EN SUPABASE:");
    console.log("━".repeat(70));
    console.log(`
-- Agregar columna role a la tabla profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Actualizar el usuario admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'lucidio@lfplayer.local';

-- Si el perfil no existe, necesitas crearlo primero:
-- Encuentra el user ID ejecutando:
SELECT id, email FROM auth.users WHERE email = 'lucidio@lfplayer.local';

-- Luego inserta el perfil (reemplaza USER_ID_AQUI con el ID real):
-- INSERT INTO profiles (id, email, role, full_name) 
-- VALUES ('USER_ID_AQUI', 'lucidio@lfplayer.local', 'admin', 'Lucidio');
    `);
    console.log("━".repeat(70));
    console.log("\n💡 Pasos:");
    console.log("1. Ve a Supabase → SQL Editor");
    console.log("2. Copia y pega el SQL de arriba");
    console.log("3. Ejecuta las queries");
    console.log("4. Recarga la página del frontend\n");
}

addRoleColumn();
