import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing environment variables")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function inspectSchema() {
    console.log("🔍 Inspecting 'songs' table columns...")

    // Method 1: Select one row and print keys
    const { data, error } = await supabase
        .from('songs')
        .select('*')
        .limit(1)

    if (error) {
        console.error("❌ Error fetching row:", error.message)
        return
    }

    if (!data || data.length === 0) {
        console.log("⚠️ Table is empty, cannot infer columns from data.")
        return
    }

    console.log("📊 Columns found in 'songs' table:")
    const columns = Object.keys(data[0])
    columns.forEach(col => console.log(`- ${col} (${typeof data[0][col]})`))

    // Specific checks
    console.log("\n---- Analysis ----")
    if (columns.includes('storage_path')) console.log("✅ 'storage_path' exists")
    else console.log("❌ 'storage_path' MISSING")

    if (columns.includes('file_path')) console.log("✅ 'file_path' exists")
    else console.log("❌ 'file_path' MISSING")

    if (columns.includes('url')) console.log("✅ 'url' exists")
    else console.log("❌ 'url' MISSING")
}

inspectSchema()
