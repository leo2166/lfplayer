import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

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
} catch (e) {}

async function testAccess() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'jubiladocantv@gmail.com',
        password: 'leo210866'
    });

    if (authErr) {
        console.error("No se pudo iniciar sesión:", authErr);
        return;
    }

    console.log("Sesión iniciada correctamente.");

    const { count, error } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true });

    if (error) console.error("Error consultando canciones:", error);
    console.log("Canciones vistas por jubiladocantv@gmail.com:", count);
}

testAccess();
