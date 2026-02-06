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

async function checkAndFixProfile() {
    console.log("🔍 Verificando perfil de usuario administrador...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("❌ Error: Faltan variables de entorno");
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const email = "lucidio@lfplayer.local";

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error("❌ Error listando usuarios:", userError.message);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`❌ Usuario ${email} no encontrado en Auth.`);
        return;
    }

    console.log(`✅ Usuario encontrado: ${user.id}`);

    // 2. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is 'not found'
        console.error("❌ Error consultando perfil:", profileError.message);
        return;
    }

    if (profile) {
        console.log(`ℹ️ Perfil actual: Role = ${profile.role}`);
        if (profile.role !== 'admin') {
            console.log("⚠️ El rol no es 'admin'. Actualizando...");
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'admin' })
                .eq('id', user.id);

            if (updateError) console.error("❌ Error actualizando perfil:", updateError.message);
            else console.log("✅ Rol actualizado a 'admin'.");
        } else {
            console.log("✅ El usuario ya tiene rol de administrador.");
        }
    } else {
        console.log("⚠️ Perfil no encontrado. Creando perfil con rol 'admin'...");
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: email,
                role: 'admin',
                full_name: "Lucidio"
            });

        if (insertError) console.error("❌ Error creando perfil:", insertError.message);
        else console.log("✅ Perfil creado exitosamente.");
    }
}

checkAndFixProfile();
