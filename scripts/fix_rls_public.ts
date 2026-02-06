
import { createClient } from "@supabase/supabase-js"

// Hardcoded Service Role Key for this admin operation
const supabaseUrl = "https://wtbszhzcisxoswfvbaen.supabase.co"
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YnN6aHpjaXN4b3N3ZnZiYWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg4MDIxMSwiZXhwIjoyMDc5NDU2MjExfQ.VaxhclhdZX7I0US8zKvi6bGxogeCPIuyvp4e9cuJLQc"

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function applyPolicies() {
    console.log("🔒 Aplicando políticas de seguridad RLS...")

    // 1. Verificar conexión
    const { data: test, error: connError } = await supabase.from('songs').select('count', { count: 'exact', head: true })
    if (connError) {
        console.error("❌ Error de conexión:", connError.message)
        return
    }
    console.log("✅ Conexión administrativa establecida.")

    // 2. Ejecutar SQL crudo (necesitamos RPC o usar la API de gestión si RPC no está expuesto, pero Supabase-JS simple no corre DDL arbitrario fácilmente sin RPC 'exec_sql').
    // Como alternativa, si no tenemos RPC configurado, lo más seguro es usar el cliente para confirmar si podemos leer con ANON key.
    // Pero espera, si NO podemos leer con Anon Key (como probamos con curl), ES un problema de políticas.

    // INTENTO DE SOLUCIÓN SIMULADA VIA SUPABASE POSTGREST:
    // Supabase JS no permite "CREATE POLICY" directamente.
    // PERO, podemos intentar insertar una poliza via SQL Editor.

    console.log("⚠️ No se puede ejecutar DDL (CREATE POLICY) desde el cliente JS sin una función RPC específica.")
    console.log("ℹ️ Por favor, ejecuta el siguiente SQL en el Editor SQL de Supabase:")

    const sqlCommands = `
    -- Habilitar RLS
    ALTER TABLE IF EXISTS public.songs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.genres ENABLE ROW LEVEL SECURITY;

    -- Eliminar políticas antiguas para evitar conflictos
    DROP POLICY IF EXISTS "songs_select_public" ON public.songs;
    DROP POLICY IF EXISTS "genres_select_public" ON public.genres;
    DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects; -- Ejemplo storage

    -- Crear políticas públicas de lectura
    CREATE POLICY "songs_select_public" ON public.songs FOR SELECT USING (true);
    CREATE POLICY "genres_select_public" ON public.genres FOR SELECT USING (true);
    
    -- (Opcional) Políticas de inserción solo para Service Role (implícito) o Admins
    `

    console.log("\n" + "=".repeat(50))
    console.log(sqlCommands)
    console.log("=".repeat(50) + "\n")

    console.log("💡 Si no puedes acceder al dashboard, intentaremos un truco: Usar el usuario de sistema.")
}

applyPolicies()
