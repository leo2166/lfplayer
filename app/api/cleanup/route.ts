import { r2, CLOUDFLARE_R2_BUCKET_NAME } from "@/lib/cloudflare/r2"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (!profile || profile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 })
        }

        const { blob_url } = await request.json()

        if (!blob_url) {
            return NextResponse.json({ error: "blob_url is required" }, { status: 400 })
        }

        try {
            const url = new URL(blob_url)
            const objectKey = url.pathname.substring(1)

            await r2.send(new DeleteObjectCommand({
                Bucket: CLOUDFLARE_R2_BUCKET_NAME,
                Key: objectKey,
            }))

            console.log(`[CLEANUP] Successfully deleted orphan file from R2: ${objectKey}`)
            return NextResponse.json({ success: true, deletedKey: objectKey })
        } catch (r2Error) {
            console.error("[CLEANUP] Error deleting from R2:", r2Error)
            return NextResponse.json({ error: "Failed to delete from R2" }, { status: 500 })
        }
    } catch (error) {
        console.error("[CLEANUP] Error in cleanup:", error)
        return NextResponse.json({ error: "Failed to cleanup" }, { status: 500 })
    }
}
