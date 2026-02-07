import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
const publicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL

async function simulateMaintenance() {
    console.log("🛠️  Simulando Herramientas de Mantenimiento (Alcance Global)...\n")

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
        console.error("❌ Faltan credenciales en .env.local")
        return
    }

    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey }
    })

    // 1. Obtener todas las canciones de la BD (Sin filtrar por usuario)
    console.log("1️⃣  Cargando canciones de Supabase...")
    const { data: songs, error } = await supabase.from('songs').select('id, title, artist, blob_url, user_id')

    if (error) {
        console.error("Error BD:", error)
        return
    }

    // Analizar usuarios (Check de seguridad)
    const distinctUsers = new Set(songs.map(s => s.user_id))
    console.log(`   ✅ ${songs.length} canciones encontradas.`)
    console.log(`   👥 Distribuidas en ${distinctUsers.size} usuarios distintos:`, Array.from(distinctUsers))

    const supabaseFileKeys = new Set<string>()
    const songsWithKeys: any[] = []

    songs.forEach(s => {
        if (s.blob_url && s.blob_url.startsWith(publicUrl)) {
            let key = s.blob_url.substring(publicUrl.length)
            if (key.startsWith('/')) key = key.substring(1)
            supabaseFileKeys.add(key)
            songsWithKeys.push({ ...s, key })
        }
    })

    // 2. Obtener todos los archivos de R2
    console.log("\n2️⃣  Escaneando Cloudflare R2...")
    const r2FileKeys = new Set<string>()
    let isTruncated = true
    let continuationToken = undefined

    while (isTruncated) {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken
        })
        const response = await s3.send(command).catch(e => { console.error(e); return null; })

        if (!response) break

        if (response.Contents) {
            response.Contents.forEach(item => {
                if (item.Key && !item.Key.endsWith('/')) {
                    r2FileKeys.add(item.Key)
                }
            })
        }
        isTruncated = response.IsTruncated || false
        continuationToken = response.NextContinuationToken
    }
    console.log(`   ✅ ${r2FileKeys.size} archivos encontrados en R2.`)

    // 3. Comparar - Huérfanos
    console.log("\n3️⃣  Análisis de Huérfanos (En R2 pero no en BD)...")
    const orphans: string[] = []
    r2FileKeys.forEach(key => {
        if (!supabaseFileKeys.has(key)) {
            orphans.push(key)
        }
    })

    if (orphans.length > 0) {
        console.log(`   🚨 Se encontraron ${orphans.length} archivos huérfanos.`)
        if (orphans.length < 10) {
            orphans.forEach(o => console.log(`      - ${o}`))
        } else {
            console.log(`      - ${orphans[0]}`)
            console.log(`      - ... y ${orphans.length - 1} más.`)
        }
    } else {
        console.log("   ✅ No hay archivos huérfanos.")
    }

    // 4. Comparar - Rotos
    console.log("\n4️⃣  Análisis de Registros Rotos (En BD pero no en R2)...")
    const brokenRecords = songsWithKeys.filter(s => !r2FileKeys.has(s.key))

    if (brokenRecords.length > 0) {
        console.log(`   🚨 Se encontraron ${brokenRecords.length} registros rotos.`)
        brokenRecords.forEach(b => console.log(`      - ${b.title} (${b.artist})`))
    } else {
        console.log("   ✅ No hay registros rotos.")
    }

    // 5. Advertencia sobre la API actual
    console.log("\n⚠️  NOTA SOBRE LOS BOTONES ACTUALES:")
    if (distinctUsers.size > 1) {
        console.log("   La API actual filtra por el usuario que hace click. Como hay múltiples usuarios en la BD,")
        console.log("   es posible que los botones NO vean todos los problemas o (peor) identifiquen falsos huérfanos")
        console.log("   si el admin no es el dueño de todas las canciones.")
    } else {
        console.log("   Como solo hay 1 usuario en la BD, los botones deberían funcionar correctamente si el Admin es ese usuario.")
    }

}

simulateMaintenance()
