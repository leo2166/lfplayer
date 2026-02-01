import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import readline from "readline"

// Hardcoded fallbacks para evitar errores de lectura de .env en ejecución con npx
const HARDCODED_ENVS = {
    NEXT_PUBLIC_SUPABASE_URL: "https://wtbszhzcisxoswfvbzen.supabase.co",
    CLOUDFLARE_R2_ACCOUNT_ID: "2e4ce46b69496d4672be6e105ad32329",
    CLOUDFLARE_R2_ACCESS_KEY_ID: "ccd6358464255b0802d99a9dc2104789",
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: "c6e13017eb54138a3bc2c6c2cd37da5dcd748338d1a08f0fa5c13266ca866b11",
    CLOUDFLARE_R2_BUCKET_NAME: "lfplayer-almacen-musica",
    NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL: "https://pub-9aa79c86fd3a40eba66854524815a9be.r2.dev",
    CLOUDFLARE_R2_ACCOUNT_ID_2: "ef00c93cf25c2564210cdb1e387c0586",
    CLOUDFLARE_R2_ACCESS_KEY_ID_2: "c4bb622049118a962c15104b6e821d66",
    CLOUDFLARE_R2_SECRET_ACCESS_KEY_2: "dc666bcb87c89eb6b23dcecdf427d2df5c449eab3087bc8255ef9f9bbeedf2",
    CLOUDFLARE_R2_BUCKET_NAME_2: "lfplayer-2",
    NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL_2: "https://pub-2f774f2a26ea44feb5ee92f7c8471093.r2.dev"
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

// Cargar .env.local si existe
try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                // Limpiar comillas si existen
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[match[1].trim()] = value;
            }
        });
        console.log("📝 Variables cargadas desde .env.local");
    }
} catch (e) {
    console.warn("⚠️ No se pudo leer .env.local, usando valores hardcoded.");
}

async function repopulate() {
    console.log("🚀 Iniciando recuperación de base de datos desde R2...")

    // Unificar variables en process.env para que el script las use
    const allEnvs = { ...HARDCODED_ENVS, ...process.env }

    const supabaseUrl = allEnvs.NEXT_PUBLIC_SUPABASE_URL
    let serviceRoleKey = allEnvs.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
        console.error("❌ Error: No se encontró NEXT_PUBLIC_SUPABASE_URL")
        return
    }

    if (!serviceRoleKey) {
        console.log("\n⚠️  No se encontró SUPABASE_SERVICE_ROLE_KEY environment variable")
        console.log("   Por favor, ve a Supabase Dashboard -> Project Settings -> API")
        console.log("   y copia la clave 'service_role' (secret).")
        serviceRoleKey = await askQuestion("   🔑 Pega la SERVICE_ROLE_KEY aquí: ")
    }

    if (!serviceRoleKey || serviceRoleKey.trim() === "") {
        console.error("❌ Error: Se necesita la Service Role Key para escribir en la base de datos.")
        return
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey.trim())

    // Verificar conexión
    try {
        const { count, error } = await supabase.from('songs').select('*', { count: 'exact', head: true })
        if (error) throw error
        console.log(`✅ Conexión a Supabase exitosa. Canciones actuales: ${count}`)
    } catch (err: any) {
        console.error("❌ Error conectando a Supabase:", err.message)
        console.log("   Asegúrate de que el proyecto NO esté pausado y la clave sea correcta.")
        return
    }

    // Configuración R2 (Prioridad: variables inyectadas > archivo multi-cuenta > .env.local)
    const accounts = [
        {
            number: 1,
            accountId: allEnvs.CLOUDFLARE_R2_ACCOUNT_ID,
            accessKeyId: allEnvs.CLOUDFLARE_R2_ACCESS_KEY_ID,
            secretAccessKey: allEnvs.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
            bucketName: allEnvs.CLOUDFLARE_R2_BUCKET_NAME || "lfplayer",
            publicUrl: allEnvs.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL
        },
        {
            number: 2,
            accountId: allEnvs.CLOUDFLARE_R2_ACCOUNT_ID_2,
            accessKeyId: allEnvs.CLOUDFLARE_R2_ACCESS_KEY_ID_2,
            secretAccessKey: allEnvs.CLOUDFLARE_R2_SECRET_ACCESS_KEY_2,
            bucketName: allEnvs.CLOUDFLARE_R2_BUCKET_NAME_2 || "lfplayer-2",
            publicUrl: allEnvs.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL_2
        }
    ]

    let totalImported = 0
    let totalSkipped = 0
    let totalErrors = 0

    for (const account of accounts) {
        if (!account.accountId || !account.accessKeyId || !account.secretAccessKey) {
            console.warn(`\n⚠️ Saltando Cuenta ${account.number}: Faltan credenciales en .env`)
            continue
        }

        console.log(`\n📂 Escaneando Cuenta ${account.number} (Bucket: ${account.bucketName})...`)

        const s3 = new S3Client({
            region: "auto",
            endpoint: `https://${account.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: account.accessKeyId,
                secretAccessKey: account.secretAccessKey
            }
        })

        try {
            let isTruncated = true
            let continuationToken = undefined

            while (isTruncated) {
                const command = new ListObjectsV2Command({
                    Bucket: account.bucketName,
                    ContinuationToken: continuationToken
                })

                const response = await s3.send(command)
                const contents = response.Contents || []

                console.log(`   -> Encontrados ${contents.length} objetos en este lote...`)

                for (const item of contents) {
                    if (!item.Key) continue

                    if (item.Key.endsWith('/') || (!item.Key.endsWith('.mp3') && !item.Key.endsWith('.m4a') && !item.Key.endsWith('.wav'))) {
                        continue;
                    }

                    // Verificar existencia
                    const { data: existing } = await supabase
                        .from('songs')
                        .select('id')
                        .ilike('blob_url', `%${item.Key}`)
                        .maybeSingle()

                    if (existing) {
                        totalSkipped++
                        continue
                    }

                    // Inferir metadatos
                    let title = item.Key
                    let artist = "Desconocido"

                    // Limpiar UUID prefijo (asumiendo uuid-nombre)
                    // Intenta detectar patrón UUID estándar al inicio
                    const uuidPattern = /^[0-9a-fA-F-]{36}-/
                    const cleanName = item.Key.replace(uuidPattern, '')

                    const nameWithoutExt = cleanName.replace(/\.[^/.]+$/, "")

                    if (nameWithoutExt.includes(' - ')) {
                        const parts = nameWithoutExt.split(' - ')
                        artist = parts[0].trim()
                        title = parts.slice(1).join(' - ').trim()
                    } else {
                        title = nameWithoutExt
                    }

                    const blobUrl = `${account.publicUrl}/${item.Key}`

                    // Insertar
                    const { error } = await supabase.from('songs').insert({
                        title: title,
                        artist: artist,
                        blob_url: blobUrl,
                        storage_account_number: account.number,
                        duration: 0,
                        user_id: '00000000-0000-0000-0000-000000000000'
                    })

                    if (error) {
                        console.error(`   ❌ Error insertando ${item.Key}:`, error.message)
                        totalErrors++
                    } else {
                        console.log(`   ✅ Recuperado: ${title} (${artist})`)
                        totalImported++
                    }
                }

                isTruncated = response.IsTruncated || false
                continuationToken = response.NextContinuationToken
            }

        } catch (err: any) {
            console.error(`   ❌ Error listando bucket ${account.bucketName}:`, err.message)
        }
    }

    console.log("\n============================================")
    console.log(`🏁 Recuperación completada`)
    console.log(`   📥 Importados: ${totalImported}`)
    console.log(`   ⏭️  Saltados (ya existían): ${totalSkipped}`)
    console.log(`   ❌ Errores: ${totalErrors}`)
    console.log("============================================")
}

repopulate()
