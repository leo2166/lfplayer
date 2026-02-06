
import { createClient } from "@supabase/supabase-js"
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3"
import * as dotenv from 'dotenv'
import path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Faltan variables de entorno de Supabase")
    process.exit(1)
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Configuración R2
const accounts = [
    {
        number: 1,
        id: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
        key: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secret: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        publicUrl: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL
    },
    {
        number: 2,
        id: process.env.CLOUDFLARE_R2_ACCOUNT_ID_2,
        key: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_2,
        secret: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_2,
        bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME_2,
        publicUrl: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL_2
    }
]

async function emptyBucket(account: any) {
    if (!account.id || !account.key || !account.secret || !account.bucket) {
        console.warn(`⚠️ Saltando cuenta ${account.number}: Credenciales incompletas`)
        return
    }

    console.log(`🗑️ Vaciando Bucket Cuenta ${account.number} (${account.bucket})...`)

    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${account.id}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: account.key,
            secretAccessKey: account.secret,
        },
    })

    let continuationToken: string | undefined = undefined
    let deletedCount = 0

    try {
        do {
            const listCmd = new ListObjectsV2Command({
                Bucket: account.bucket,
                ContinuationToken: continuationToken
            })
            const listRes = await s3.send(listCmd)

            if (listRes.Contents && listRes.Contents.length > 0) {
                const objectsToDelete = listRes.Contents.map(obj => ({ Key: obj.Key }))

                const deleteCmd = new DeleteObjectsCommand({
                    Bucket: account.bucket,
                    Delete: { Objects: objectsToDelete }
                })

                await s3.send(deleteCmd)
                deletedCount += objectsToDelete.length
                process.stdout.write(`   🔥 Borrados ${deletedCount} objetos...\r`)
            }

            continuationToken = listRes.NextContinuationToken
        } while (continuationToken)

        console.log(`\n✅ Bucket ${account.bucket} vaciado completamente (${deletedCount} archivos).`)

    } catch (error: any) {
        console.error(`❌ Error vaciando bucket ${account.bucket}:`, error.message)
    }
}

async function resetDatabase() {
    console.log("\n🧨 BORRANDO BASE DE DATOS SUPABASE...")

    // 1. Borrar todas las canciones (cascade debería borrar playlist_songs)
    const { error: songsError } = await supabase.from('songs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (songsError) console.error("❌ Error borrando canciones:", songsError.message)
    else console.log("✅ Tabla 'songs' vaciada.")

    // 2. Borrar playlists
    const { error: playError } = await supabase.from('playlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (playError) console.error("❌ Error borrando playlists:", playError.message)
    else console.log("✅ Tabla 'playlists' vaciada.")

    // 3. Borrar géneros (excepto si queremos mantenerlos, pero el usuario dijo 'borrar todo')
    // Nota: El usuario pidió "borrar toda la base de datos... subir carpeta por carpeta... orden de géneros".
    // Si borramos géneros, el script de subida los recreará.
    const { error: genreError } = await supabase.from('genres').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (genreError) console.error("❌ Error borrando géneros:", genreError.message)
    else console.log("✅ Tabla 'genres' vaciada.")
}

async function main() {
    console.log("⚠️  INICIANDO PROTOCOLO DE BORRADO TOTAL ⚠️")

    await resetDatabase()

    for (const acc of accounts) {
        await emptyBucket(acc)
    }

    console.log("\n✨ SISTEMA LIMPIO Y LISTO PARA SHUTDOWN/RESTART ✨")
}

main()
