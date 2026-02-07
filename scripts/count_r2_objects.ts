import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"

// Cargar .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

async function countR2Objects() {
    console.log("📊 Iniciando conteo de archivos en Cloudflare R2...")

    // Definir cuentas (Hardcoded fallbacks + process.env)
    const accounts = [
        {
            number: 1,
            accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID || "2e4ce46b69496d4672be6e105ad32329",
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "ccd6358464255b0802d99a9dc2104789",
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "c6e13017eb54138a3bc2c6c2cd37da5dcd748338d1a08f0fa5c13266ca866b11",
            bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || "lfplayer-almacen-musica",
        },
        {
            number: 2,
            accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID_2 || "ef00c93cf25c2564210cdb1e387c0586",
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_2 || "c4bb622049118a962c15104b6e821d66",
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_2 || "dc666bcb87c89eb6b23dcecdf427d2df5c449eab3087bc8255ef9f9bbeedf2",
            bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME_2 || "lfplayer-2",
        },
        // Agregar más cuentas si existen en env vars
        {
            number: 3,
            accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID_3,
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_3,
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_3,
            bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME_3 || "lfplayer-3"
        },
        {
            number: 4,
            accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID_4,
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_4,
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_4,
            bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME_4 || "lfplayer-4"
        },
        {
            number: 5,
            accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID_5,
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_5,
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_5,
            bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME_5 || "lfplayer-5"
        }
    ].filter(acc => acc.accountId && acc.accessKeyId && acc.secretAccessKey);

    let grandTotal = 0;

    for (const account of accounts) {
        console.log(`\n🔎 Escaneando Bucket: ${account.bucketName} (Cuenta ${account.number})...`)

        const s3 = new S3Client({
            region: "auto",
            endpoint: `https://${account.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: account.accessKeyId,
                secretAccessKey: account.secretAccessKey
            }
        })

        let bucketCount = 0;
        let isTruncated = true;
        let continuationToken = undefined;

        try {
            while (isTruncated) {
                const command = new ListObjectsV2Command({
                    Bucket: account.bucketName,
                    ContinuationToken: continuationToken
                })

                const response = await s3.send(command).catch(e => {
                    // Si el bucket no existe o falla, notificar y salir del loop
                    console.error(`   ❌ Error accediendo al bucket: ${e.message}`);
                    return null;
                });

                if (!response) {
                    isTruncated = false;
                    continue;
                }

                const contents = response.Contents || []

                // Filtrar carpetas o archivos que no sean música (opcional, pero consistente con repopulate)
                // Aquí contaremos TODO lo que parezca un archivo válido
                const validFiles = contents.filter(item =>
                    item.Key && !item.Key.endsWith('/') && item.Size && item.Size > 0
                );

                bucketCount += validFiles.length;

                isTruncated = response.IsTruncated || false
                continuationToken = response.NextContinuationToken

                if (validFiles.length > 0) process.stdout.write(`.`);
            }
            console.log(`\n   ✅ Total en ${account.bucketName}: ${bucketCount} archivos.`);
            grandTotal += bucketCount;

        } catch (err: any) {
            console.error(`   ❌ Error en bucket ${account.bucketName}:`, err.message)
        }
    }

    console.log("\n============================================")
    console.log(`🏁 RECUENTO FINAL DE R2`)
    console.log(`   🗂️  Total de archivos encontrados: ${grandTotal}`)
    console.log("============================================")
}

countR2Objects()
