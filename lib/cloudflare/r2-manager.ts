import { S3Client } from "@aws-sdk/client-s3"
import { supabaseAdmin } from "@/lib/supabase/admin"

// Configuración de cuentas de Cloudflare R2
const R2_ACCOUNTS = {
    1: {
        accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID!,
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
        bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        publicUrl: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL!,
    },
    2: {
        accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID_2!,
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_2!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_2!,
        bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME_2!,
        publicUrl: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL_2!,
    },
}

// Límite de uso antes de cambiar de cuenta (9.9GB en bytes)
const USAGE_THRESHOLD = 10627787776 // 9.9GB

// Cache de clientes S3
const r2Clients: Record<number, S3Client> = {}

/**
 * Obtiene o crea un cliente S3 para una cuenta específica
 */
export function getR2ClientForAccount(accountNumber: 1 | 2): S3Client {
    if (r2Clients[accountNumber]) {
        return r2Clients[accountNumber]
    }

    const config = R2_ACCOUNTS[accountNumber]
    if (!config) {
        throw new Error(`Invalid account number: ${accountNumber}`)
    }

    const client = new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    })

    r2Clients[accountNumber] = client
    return client
}

/**
 * Obtiene información del bucket para una cuenta específica
 */
export function getBucketConfig(accountNumber: 1 | 2) {
    const config = R2_ACCOUNTS[accountNumber]
    if (!config) {
        throw new Error(`Invalid account number: ${accountNumber}`)
    }
    return config
}

/**
 * Determina qué cuenta de R2 usar basándose en el uso actual
 * Retorna el número de cuenta (1 o 2) y su configuración
 */
export async function getAvailableBucket(): Promise<{
    accountNumber: 1 | 2
    bucketName: string
    publicUrl: string
}> {
    try {
        // Consultar uso actual de las cuentas
        const { data: buckets, error } = await supabaseAdmin
            .from("storage_buckets")
            .select("*")
            .order("account_number", { ascending: true })

        if (error) {
            console.error("Error fetching storage buckets:", error)
            // Fallback a cuenta 1
            return {
                accountNumber: 1,
                bucketName: R2_ACCOUNTS[1].bucketName,
                publicUrl: R2_ACCOUNTS[1].publicUrl,
            }
        }

        // Buscar primera cuenta con espacio disponible
        for (const bucket of buckets) {
            if (bucket.current_usage_bytes < USAGE_THRESHOLD) {
                const accountNumber = bucket.account_number as 1 | 2
                const config = R2_ACCOUNTS[accountNumber]

                return {
                    accountNumber,
                    bucketName: config.bucketName,
                    publicUrl: config.publicUrl,
                }
            }
        }

        // Si todas están llenas, usar la última (esto debería generar una alerta)
        console.warn("⚠️ WARNING: All R2 accounts are near capacity!")
        return {
            accountNumber: 2,
            bucketName: R2_ACCOUNTS[2].bucketName,
            publicUrl: R2_ACCOUNTS[2].publicUrl,
        }
    } catch (error) {
        console.error("Error in getAvailableBucket:", error)
        // Fallback a cuenta 1
        return {
            accountNumber: 1,
            bucketName: R2_ACCOUNTS[1].bucketName,
            publicUrl: R2_ACCOUNTS[1].publicUrl,
        }
    }
}

/**
 * Actualiza el uso de almacenamiento de una cuenta
 * @param accountNumber - Número de cuenta (1 o 2)
 * @param bytesChange - Cantidad de bytes a añadir (positivo) o quitar (negativo)
 */
export async function updateBucketUsage(
    accountNumber: 1 | 2,
    bytesChange: number
): Promise<void> {
    try {
        // Obtener uso actual
        const { data: bucket, error: fetchError } = await supabaseAdmin
            .from("storage_buckets")
            .select("current_usage_bytes")
            .eq("account_number", accountNumber)
            .single()

        if (fetchError) {
            console.error("Error fetching bucket usage:", fetchError)
            return
        }

        const newUsage = Math.max(0, (bucket.current_usage_bytes || 0) + bytesChange)

        // Actualizar uso
        const { error: updateError } = await supabaseAdmin
            .from("storage_buckets")
            .update({ current_usage_bytes: newUsage })
            .eq("account_number", accountNumber)

        if (updateError) {
            console.error("Error updating bucket usage:", updateError)
        }
    } catch (error) {
        console.error("Error in updateBucketUsage:", error)
    }
}

/**
 * Determina de qué cuenta leer un archivo basándose en su URL
 */
export function getAccountNumberFromUrl(blobUrl: string): 1 | 2 {
    if (blobUrl.includes(R2_ACCOUNTS[1].publicUrl)) {
        return 1
    } else if (blobUrl.includes(R2_ACCOUNTS[2].publicUrl)) {
        return 2
    }
    // Default a cuenta 1 si no se puede determinar
    return 1
}

/**
 * Obtiene estadísticas de uso de todas las cuentas
 */
export async function getStorageStats() {
    try {
        const { data: buckets, error } = await supabaseAdmin
            .from("storage_buckets")
            .select("*")
            .order("account_number", { ascending: true })

        if (error) {
            throw error
        }

        const stats = buckets.map((bucket) => ({
            account_number: bucket.account_number,
            bucket_name: bucket.bucket_name,
            usage_bytes: bucket.current_usage_bytes,
            usage_gb: (bucket.current_usage_bytes / 1073741824).toFixed(2),
            capacity_gb: (bucket.max_capacity_bytes / 1073741824).toFixed(2),
            percentage_used: ((bucket.current_usage_bytes / bucket.max_capacity_bytes) * 100).toFixed(1),
            is_active: bucket.is_active,
        }))

        const totalUsageBytes = buckets.reduce((sum, b) => sum + b.current_usage_bytes, 0)
        const totalCapacityBytes = buckets.reduce((sum, b) => sum + b.max_capacity_bytes, 0)

        return {
            accounts: stats,
            total_usage_gb: (totalUsageBytes / 1073741824).toFixed(2),
            total_capacity_gb: (totalCapacityBytes / 1073741824).toFixed(2),
            total_percentage_used: ((totalUsageBytes / totalCapacityBytes) * 100).toFixed(1),
        }
    } catch (error) {
        console.error("Error getting storage stats:", error)
        throw error
    }
}
