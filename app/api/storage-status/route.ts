import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStorageStats } from "@/lib/cloudflare/r2-manager"

/**
 * GET /api/storage-status
 * Retorna estadísticas de uso de almacenamiento de todas las cuentas R2
 * Solo accesible para administradores
 */
export async function GET() {
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

        // Obtener estadísticas de almacenamiento
        const stats = await getStorageStats()

        return NextResponse.json(stats)
    } catch (error) {
        console.error("Error fetching storage stats:", error)
        return NextResponse.json({ error: "Failed to fetch storage statistics" }, { status: 500 })
    }
}
