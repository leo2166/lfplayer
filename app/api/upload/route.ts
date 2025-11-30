import { r2, CLOUDFLARE_R2_BUCKET_NAME } from "@/lib/cloudflare/r2"
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

    const { filename, contentType } = await request.json()

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 })
    }

    const key = `${randomUUID()}-${filename}`

    const command = new PutObjectCommand({
      Bucket: CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    const url = await getSignedUrl(r2, command, { expiresIn: 3600 })

    const publicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL
    if (!publicUrl) {
      return NextResponse.json({ error: "Missing Cloudflare R2 public URL configuration" }, { status: 500 })
    }

    return NextResponse.json({ 
      url,
      downloadUrl: `${publicUrl}/${key}` 
    })
  } catch (error) {
    console.error("Error generating signed URL:", error)
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 })
  }
}
