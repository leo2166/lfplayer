import { getAvailableBucket, getR2ClientForAccount, updateBucketUsage } from "@/lib/cloudflare/r2-manager"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 })
    }

    const { filename, contentType, fileSize } = await request.json()

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 })
    }

    // Obtener bucket disponible (selección automática multi-cuenta)
    const { accountNumber, bucketName, publicUrl } = await getAvailableBucket()

    // Obtener cliente R2 para la cuenta seleccionada
    const r2Client = getR2ClientForAccount(accountNumber)

    const key = `${randomUUID()}-${filename}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    })

    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 })

    // Actualizar el contador de uso para activar el failover cuando se llene la cuenta
    if (fileSize && fileSize > 0) {
      await updateBucketUsage(accountNumber, fileSize)
    }

    return NextResponse.json({
      url,
      downloadUrl: `${publicUrl}/${key}`,
      accountNumber, // Importante: el frontend necesita esto para guardar en DB
    })
  } catch (error) {
    console.error("Error generating signed URL:", error)
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 })
  }
}
