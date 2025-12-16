const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[match[1].trim()] = value;
    }
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    console.log("--- INICIANDO DIAGNÓSTICO DE SUBIDA ---");

    // 1. Check Env Vars
    console.log("[1] Verificando Variables de Entorno...");
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL',
        'CLOUDFLARE_R2_BUCKET_NAME'
    ];
    let missing = [];
    required.forEach(v => {
        if (!process.env[v]) missing.push(v);
        else console.log(`    OK: ${v}`);
    });

    if (missing.length > 0) {
        console.error(`    ❌ FALTAN VARIABLES: ${missing.join(', ')}`);
        return;
    } else {
        console.log("    ✅ Todas las variables presentes.");
    }

    // 2. Check DB Connection & Permissions
    console.log("[2] Verificando Base de Datos (Supabase)...");

    // We need a user ID. Usually we use Service Role to bypass RLS in scripts,
    // but the API uses the logged-in user.
    // Let's first check if we can read `genres` (public).
    const { data: genres, error: genreError } = await supabase.from('genres').select('id').limit(1);

    if (genreError) {
        console.error("    ❌ Error conectando a DB (Genres):", genreError.message);
        return;
    }
    console.log("    ✅ Conexión de lectura OK.");

    // 3. Simulate an Insert (Using Service Role, so it validates constraint health, not RLS)
    console.log("[3] Simulando Inserción de Metadatos (Test)...");

    // Get a user to impersonate or just use the first user found for testing FK
    // (In a real app, we'd need a specific user. Here we just assume one exists)
    const { data: user } = await supabase.auth.admin.listUsers();
    if (!user || user.users.length === 0) {
        console.log("    ⚠️ No se encontraron usuarios para probar la inserción.");
    } else {
        const testUserId = user.users[0].id;
        const testTitle = `TEST_UPLOAD_${Date.now()}`;

        const { data: insertData, error: insertError } = await supabase.from('songs').insert({
            user_id: testUserId,
            title: testTitle,
            artist: 'Test Artist',
            genre_id: genres[0].id,
            blob_url: 'https://fake-url.com/test.mp3',
            duration: 0
        }).select();

        if (insertError) {
            console.error("    ❌ Error al insertar canción de prueba:", insertError.message);
            console.error("       (Esto indica un problema en la DB, Trigger o Política)");
        } else {
            console.log("    ✅ Inserción EXITOSA.");

            // Cleanup
            await supabase.from('songs').delete().eq('id', insertData[0].id);
            console.log("    ✅ Limpieza de prueba completada.");
        }
    }

    console.log("--- DIAGNÓSTICO FINALIZADO ---");
    console.log("Si todo salió ✅, el problema probable es:");
    console.log("1. La conexión a R2 (Cloudflare) desde el navegador.");
    console.log("2. Un timeout en la subida del archivo físico.");
    console.log("3. La API '/api/upload' fallando en Vercel (Revisar logs de Vercel).");
}

main().catch(console.error);
