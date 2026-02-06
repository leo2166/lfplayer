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

async function createAdminUser() {
    console.log("👤 Creando usuario administrador...\n");

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

    const email = "lucidio@lfplayer.local";
    const password = "leo210866";

    // Verificar si ya existe
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email === email);

    if (existingUser) {
        console.log(`✅ Usuario ${email} ya existe. Actualizando contraseña...`);

        const { error } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: password }
        );

        if (error) {
            console.error("❌ Error actualizando contraseña:", error.message);
            return;
        }

        console.log("\n✅ ¡Contraseña actualizada exitosamente!");
    } else {
        console.log(`🆕 Creando nuevo usuario ${email}...`);

        const { data, error } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: "Lucidio"
            }
        });

        if (error) {
            console.error("❌ Error creando usuario:", error.message);
            return;
        }

        console.log("\n✅ ¡Usuario creado exitosamente!");
    }

    console.log("\n🔑 Credenciales de acceso:");
    console.log(`   Usuario: lucidio`);
    console.log(`   Contraseña: leo210866`);
    console.log(`\n💡 Usa estas credenciales en: http://localhost:5001`);
}

createAdminUser();
