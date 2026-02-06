import { createClient } from "@supabase/supabase-js"
import readline from "readline"
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

                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                process.env[key] = value;
            }
        });
        console.log("✅ Variables cargadas desde .env.local");
        console.log("   SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓" : "✗");
        console.log("   SERVICE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓" : "✗");
    }
} catch (e) {
    console.warn("⚠️ No se pudo leer .env.local:", e);
}

async function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function resetPassword() {
    console.log("🔑 Script de Reset de Contraseña\n");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        console.error("❌ Error: No se encontró NEXT_PUBLIC_SUPABASE_URL");
        return;
    }

    if (!serviceRoleKey) {
        console.log("⚠️  No se encontró SUPABASE_SERVICE_ROLE_KEY");
        serviceRoleKey = await askQuestion("🔑 Pega la SERVICE_ROLE_KEY aquí: ");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey.trim(), {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // Listar usuarios
    console.log("\n📋 Usuarios registrados:\n");
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("❌ Error listando usuarios:", listError.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log("⚠️  No hay usuarios registrados.");
        return;
    }

    users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
    });

    const emailToReset = await askQuestion("\n📧 Email del usuario a resetear (o presiona Enter para usar jubiladocantv@gmail.com): ");
    const finalEmail = emailToReset.trim() || "jubiladocantv@gmail.com";

    const userToReset = users.find(u => u.email === finalEmail);

    if (!userToReset) {
        console.error(`❌ No se encontró usuario con email: ${finalEmail}`);
        return;
    }

    console.log(`\n✅ Usuario encontrado: ${userToReset.email}`);
    const newPassword = await askQuestion("🔐 Ingresa la NUEVA contraseña (mínimo 6 caracteres): ");

    if (newPassword.length < 6) {
        console.error("❌ La contraseña debe tener al menos 6 caracteres");
        return;
    }

    // Resetear contraseña
    const { data, error } = await supabase.auth.admin.updateUserById(
        userToReset.id,
        { password: newPassword }
    );

    if (error) {
        console.error("❌ Error reseteando contraseña:", error.message);
        return;
    }

    console.log("\n✅ ¡Contraseña reseteada exitosamente!");
    console.log(`\n🔑 Nuevas credenciales:`);
    console.log(`   Email: ${finalEmail}`);
    console.log(`   Contraseña: ${newPassword}`);
}

resetPassword();
