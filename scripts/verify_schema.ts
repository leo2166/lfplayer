import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://wtbszhzcisxoswfvbaen.supabase.co"
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YnN6aHpjaXN4b3N3ZnZiYWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg4MDIxMSwiZXhwIjoyMDc5NDU2MjExfQ.VaxhclhdZX7I0US8zKvi6bGxogeCPIuyvp4e9cuJLQc"

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function verifySchema() {
    console.log("\n🔍 Verificando schema de la base de datos...\n");

    try {
        // 1. Verificar tabla storage_buckets
        console.log("1️⃣ Verificando tabla storage_buckets...");
        const { data: buckets, error: bucketsError } = await supabase
            .from('storage_buckets')
            .select('*');

        if (bucketsError) {
            console.log(`   ❌ Error: ${bucketsError.message}`);
        } else {
            console.log(`   ✅ Tabla existe con ${buckets?.length || 0} registros`);
            if (buckets && buckets.length > 0) {
                buckets.forEach(b => {
                    console.log(`      - Cuenta #${b.account_number}: ${b.bucket_name}`);
                });
            }
        }

        // 2. Intentar insertar una canción de prueba con storage_account_number
        console.log("\n2️⃣ Probando insertar canción con storage_account_number...");

        const testSong = {
            title: "TEST_VERIFICACION",
            artist: "Sistema",
            blob_url: "https://test.com/test.mp3",
            storage_account_number: 1,
            duration: 0,
            user_id: '00000000-0000-0000-0000-000000000000'
        };

        const { data: insertData, error: insertError } = await supabase
            .from('songs')
            .insert(testSong)
            .select();

        if (insertError) {
            console.log(`   ❌ Error: ${insertError.message}`);
            console.log("\n⚠️  LA COLUMNA storage_account_number NO EXISTE");
            console.log("   Necesitas ejecutar el SQL completo en Supabase.");
        } else {
            console.log(`   ✅ Inserción exitosa! ID: ${insertData?.[0]?.id}`);

            // Eliminar la canción de prueba
            if (insertData?.[0]?.id) {
                await supabase.from('songs').delete().eq('id', insertData[0].id);
                console.log(`   🗑️  Canción de prueba eliminada`);
            }

            console.log("\n✅ VERIFICACIÓN EXITOSA");
            console.log("   La columna storage_account_number existe y funciona.");
            console.log("\n🚀 Puedes proceder a ejecutar la recuperación:");
            console.log("   .\\recover.bat\n");
        }

    } catch (err: any) {
        console.error("\n❌ Error fatal:", err.message);
    }
}

verifySchema();
