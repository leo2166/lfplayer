import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"

// Cargar variables de entorno
try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k]
        }
    }
} catch (e) {
    console.warn("⚠️ Error leyendo .env.local:", e);
}

const R2_ACCOUNTS = {
    1: {
        accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID!,
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
        bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    },
    2: {
        accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID_2!,
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_2!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_2!,
        bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME_2!,
    },
}

async function fixCors() {
    console.log("🔧 Configurando CORS para Cloudflare R2...\n");

    const accounts = [1, 2] as const;

    for (const accNum of accounts) {
        const config = R2_ACCOUNTS[accNum];
        if (!config.accountId || !config.bucketName) {
            console.log(`⚠️ Saltando cuenta ${accNum}: Faltan credenciales.`);
            continue;
        }

        console.log(`📡 Procesando Cuenta ${accNum} (Bucket: ${config.bucketName})...`);

        const client = new S3Client({
            region: "auto",
            endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });

        const command = new PutBucketCorsCommand({
            Bucket: config.bucketName,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["PUT", "POST", "GET", "HEAD", "DELETE"],
                        AllowedOrigins: ["*"], // Permitir todo para evitar problemas en dev/prod
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3600
                    }
                ]
            }
        });

        try {
            await client.send(command);
            console.log(`✅ CORS aplicado exitosamente en bucket ${config.bucketName}`);
        } catch (error: any) {
            console.error(`❌ Error aplicando CORS en ${config.bucketName}:`, error.message);
        }
    }

    console.log("\n✨ Proceso finalizado.");
}

fixCors();
