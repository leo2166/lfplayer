import { createClient } from "@supabase/supabase-js"

// Usar valores directos para evitar problemas de parsing
const supabaseUrl = "https://wtbszhzcisxoswfvbaen.supabase.co"
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YnN6aHpjaXN4b3N3ZnZiYWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg4MDIxMSwiZXhwIjoyMDc5NDU2MjExfQ.VaxhclhdZX7I0US8zKvi6bGxogeCPIuyvp4e9cuJLQc"

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function quickDiagnosis() {
    console.log("\n" + "=".repeat(65));
    console.log("🔍 DIAGNÓSTICO RÁPIDO - LF PLAYER DATABASE");
    console.log("=".repeat(65) + "\n");

    try {
        // 1. Contar canciones total
        console.log("📊 Consultando base de datos...\n");

        const { count: totalSongs, error: countError } = await supabase
            .from('songs')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error("❌ Error:", countError.message);
            return;
        }

        console.log(`🎵 TOTAL DE CANCIONES: ${totalSongs || 0}\n`);

        // 2. Desglose por cuenta R2
        const { count: r2Count1 } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .eq('storage_account_number', 1);

        const { count: r2Count2 } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .eq('storage_account_number', 2);

        const { count: r2CountNull } = await supabase
            .from('songs')
            .select('id', { count: 'exact', head: true })
            .is('storage_account_number', null);

        console.log("📦 Distribución por cuenta R2:");
        console.log(`   • Cuenta #1: ${r2Count1 || 0}`);
        console.log(`   • Cuenta #2: ${r2Count2 || 0}`);
        console.log(`   • Sin cuenta: ${r2CountNull || 0}\n`);

        // 3. Muestra de canciones
        if (totalSongs && totalSongs > 0) {
            const { data: sample } = await supabase
                .from('songs')
                .select('title, artist, created_at')
                .order('created_at', { ascending: false })
                .limit(5);

            if (sample && sample.length > 0) {
                console.log("🎼 Últimas 5 canciones:");
                sample.forEach((s, i) => {
                    const date = new Date(s.created_at).toLocaleDateString('es-VE');
                    console.log(`   ${i + 1}. "${s.title}" - ${s.artist} (${date})`);
                });
                console.log();
            }
        }

        // 4. Artistas y géneros
        const { data: artists } = await supabase.from('songs').select('artist');
        const { count: genresCount } = await supabase
            .from('genres')
            .select('*', { count: 'exact', head: true });

        const uniqueArtists = artists ? [...new Set(artists.map(a => a.artist))].length : 0;

        console.log("📈 Estadísticas:");
        console.log(`   • Artistas únicos: ${uniqueArtists}`);
        console.log(`   • Géneros disponibles: ${genresCount || 0}\n`);

        // 5. Resultado final
        console.log("=".repeat(65));
        if (totalSongs === 0) {
            console.log("🚨 ESTADO: BASE DE DATOS VACÍA");
            console.log("=".repeat(65));
            console.log("\n⚠️  La tabla 'songs' no contiene registros.");
            console.log("💡 Necesitas ejecutar el script de recuperación desde R2.\n");
            console.log("   Comando:");
            console.log("   npx tsx scripts/repopulate_db_from_r2.ts\n");
        } else if (totalSongs < 50) {
            console.log("⚠️  ESTADO: DATOS MÍNIMOS");
            console.log("=".repeat(65));
            console.log(`\n✓ Hay ${totalSongs} canciones en la base de datos.`);
            console.log("⚠️  Cantidad sospechosamente baja - puede haber más archivos en R2.\n");
        } else {
            console.log("✅ ESTADO: BASE DE DATOS OPERATIVA");
            console.log("=".repeat(65));
            console.log(`\n✓ ${totalSongs} canciones registradas`);
            console.log(`✓ ${uniqueArtists} artistas diferentes`);
            console.log(`✓ ${genresCount} géneros configurados\n`);
        }

    } catch (err: any) {
        console.error("\n❌ Error fatal:", err.message, "\n");
    }
}

quickDiagnosis();
