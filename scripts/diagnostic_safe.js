const { createClient } = require('@supabase/supabase-js');

// Cargar variables directamente (hardcoded para evitar problemas de parsing)
const SUPABASE_URL = "https://wtbszhzcisxoswfvbzen.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YnN6aHpjaXN4b3N3ZnZiYWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg4MDIxMSwiZXhwIjoyMDc5NDU2MjExfQ.VaxhclhdZX7I0US8zKvi6bGxogeCPIuyvp4e9cuJLQc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnostic() {
    console.log("=".repeat(60));
    console.log("🔍 DIAGNÓSTICO DE BASE DE DATOS - LF PLAYER");
    console.log("=".repeat(60));
    console.log();

    try {
        // 1. Verificar conexión
        console.log("1️⃣ Verificando conexión a Supabase...");
        const { count: songsCount, error: songsError } = await supabase
            .from('songs')
            .select('*', { count: 'exact', head: true });

        if (songsError) {
            console.error("❌ Error conectando:", songsError.message);
            return;
        }
        console.log(`   ✅ Conexión exitosa`);
        console.log();

        // 2. Contar canciones por cuenta de almacenamiento
        console.log("2️⃣ Contando canciones por cuenta R2...");

        const { data: account1Songs, error: acc1Error } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .eq('storage_account_number', 1);

        const { data: account2Songs, error: acc2Error } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .eq('storage_account_number', 2);

        const { data: nullAccountSongs, error: nullError } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .is('storage_account_number', null);

        console.log(`   📦 Cuenta R2 #1: ${account1Songs?.length || 0} canciones`);
        console.log(`   📦 Cuenta R2 #2: ${account2Songs?.length || 0} canciones`);
        console.log(`   ⚠️  Sin cuenta asignada: ${nullAccountSongs?.length || 0} canciones`);
        console.log(`   🎵 TOTAL: ${songsCount} canciones`);
        console.log();

        // 3. Verificar géneros
        console.log("3️⃣ Verificando tabla de géneros...");
        const { data: genres, error: genresError } = await supabase
            .from('genres')
            .select('id, name')
            .order('name');

        if (!genresError && genres) {
            console.log(`   ✅ ${genres.length} géneros disponibles:`);
            genres.forEach(g => console.log(`      - ${g.name}`));
        }
        console.log();

        // 4. Canciones recientes
        console.log("4️⃣ Últimas 10 canciones en la base de datos...");
        const { data: recentSongs, error: recentError } = await supabase
            .from('songs')
            .select('id, title, artist, storage_account_number, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!recentError && recentSongs) {
            recentSongs.forEach((song, idx) => {
                const account = song.storage_account_number ? `R2-${song.storage_account_number}` : 'N/A';
                console.log(`   ${idx + 1}. "${song.title}" - ${song.artist} [${account}]`);
            });
        }
        console.log();

        // 5. Verificar playlists
        console.log("5️⃣ Verificando playlists...");
        const { count: playlistsCount } = await supabase
            .from('playlists')
            .select('*', { count: 'exact', head: true });

        console.log(`   📋 Total de playlists: ${playlistsCount || 0}`);
        console.log();

        // 6. Verificar storage_buckets
        console.log("6️⃣ Verificando tabla storage_buckets...");
        const { data: buckets, error: bucketsError } = await supabase
            .from('storage_buckets')
            .select('*')
            .order('account_number');

        if (!bucketsError && buckets && buckets.length > 0) {
            console.log(`   ✅ ${buckets.length} buckets configurados:`);
            buckets.forEach(b => {
                const usageGB = (b.current_usage_bytes / (1024 ** 3)).toFixed(2);
                const limitGB = (b.limit_bytes / (1024 ** 3)).toFixed(2);
                console.log(`      Cuenta #${b.account_number}: ${usageGB}GB / ${limitGB}GB`);
            });
        } else {
            console.log(`   ⚠️  No se encontró configuración de buckets`);
        }
        console.log();

        // Resumen final
        console.log("=".repeat(60));
        console.log("📊 RESUMEN");
        console.log("=".repeat(60));
        console.log(`🎵 Canciones en BD: ${songsCount || 0}`);
        console.log(`📋 Playlists: ${playlistsCount || 0}`);
        console.log(`🎨 Géneros: ${genres?.length || 0}`);
        console.log("=".repeat(60));

        // Recomendaciones
        if (songsCount === 0) {
            console.log();
            console.log("⚠️  ALERTA: No hay canciones en la base de datos");
            console.log("💡 Recomendación: Ejecutar script de recuperación desde R2");
        } else if (songsCount < 100) {
            console.log();
            console.log("⚠️  ADVERTENCIA: Cantidad de canciones baja");
            console.log("💡 Considerar verificar si faltan archivos por recuperar");
        }

    } catch (error) {
        console.error("❌ Error durante el diagnóstico:", error.message);
    }
}

diagnostic().catch(console.error);
