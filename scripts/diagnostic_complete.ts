import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Cargar .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
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
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function diagnostic() {
    console.log("=".repeat(60));
    console.log("🔍 DIAGNÓSTICO DE BASE DE DATOS - LF PLAYER");
    console.log("=".repeat(60));
    console.log();

    try {
        // 1. Verificar conexión y contar canciones
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

        const { count: account1Count } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .eq('storage_account_number', 1);

        const { count: account2Count } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .eq('storage_account_number', 2);

        const { count: nullAccountCount } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .is('storage_account_number', null);

        console.log(`   📦 Cuenta R2 #1: ${account1Count || 0} canciones`);
        console.log(`   📦 Cuenta R2 #2: ${account2Count || 0} canciones`);
        console.log(`   ⚠️  Sin cuenta asignada: ${nullAccountCount || 0} canciones`);
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
            if (recentSongs.length === 0) {
                console.log("   📭 No hay canciones en la base de datos");
            } else {
                recentSongs.forEach((song, idx) => {
                    const account = song.storage_account_number ? `R2-${song.storage_account_number}` : 'N/A';
                    const date = new Date(song.created_at).toLocaleDateString();
                    console.log(`   ${idx + 1}. "${song.title}" - ${song.artist} [${account}] (${date})`);
                });
            }
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
                const percentage = ((b.current_usage_bytes / b.limit_bytes) * 100).toFixed(1);
                console.log(`      Cuenta #${b.account_number}: ${usageGB}GB / ${limitGB}GB (${percentage}%)`);
            });
        } else {
            console.log(`   ⚠️  No se encontró configuración de buckets (tabla puede no existir aún)`);
        }
        console.log();

        // 7. Verificar artistas únicos
        console.log("7️⃣ Analizando artistas...");
        const { data: artists } = await supabase
            .from('songs')
            .select('artist')
            .order('artist');

        if (artists) {
            const uniqueArtists = [...new Set(artists.map(a => a.artist))];
            console.log(`   🎤 Artistas únicos: ${uniqueArtists.length}`);
            if (uniqueArtists.length > 0 && uniqueArtists.length <= 20) {
                uniqueArtists.slice(0, 10).forEach(artist => {
                    console.log(`      - ${artist}`);
                });
                if (uniqueArtists.length > 10) {
                    console.log(`      ... y ${uniqueArtists.length - 10} más`);
                }
            }
        }
        console.log();

        // Resumen final
        console.log("=".repeat(60));
        console.log("📊 RESUMEN EJECUTIVO");
        console.log("=".repeat(60));
        console.log(`🎵 Canciones en BD: ${songsCount || 0}`);
        console.log(`📋 Playlists: ${playlistsCount || 0}`);
        console.log(`🎨 Géneros: ${genres?.length || 0}`);
        console.log(`🎤 Artistas: ${artists ? [...new Set(artists.map(a => a.artist))].length : 0}`);
        console.log("=".repeat(60));

        // Recomendaciones
        console.log();
        if (songsCount === 0) {
            console.log("🚨 ESTADO CRÍTICO: Base de datos vacía");
            console.log("💡 ACCIÓN RECOMENDADA:");
            console.log("   1. Verificar conectividad a buckets R2");
            console.log("   2. Ejecutar script de recuperación: npx tsx scripts/repopulate_db_from_r2.ts");
            console.log("   3. Monitorear la importación");
        } else if (songsCount < 100) {
            console.log("⚠️  ADVERTENCIA: Cantidad de canciones baja");
            console.log("💡 ACCIÓN SUGERIDA:");
            console.log("   - Verificar si hay archivos adicionales en R2 por recuperar");
            console.log("   - Revisar logs de importación previa");
        } else {
            console.log("✅ Base de datos operativa con contenido");
            console.log("💡 PRÓXIMOS PASOS:");
            console.log("   - Verificar integridad de enlaces (blob_url funcionando)");
            console.log("   - Considerar desactivar modo mantenimiento si todo está OK");
        }
        console.log();

    } catch (error: any) {
        console.error("❌ Error durante el diagnóstico:", error.message);
    }
}

diagnostic().catch(console.error);
