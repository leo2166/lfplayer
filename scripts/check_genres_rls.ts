import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

async function checkGenresAccess() {
    console.log("🔍 Checking Genres Access for ANONYMOUS user...")
    const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data, error } = await anonClient
        .from('genres')
        .select('*')
        .limit(5)

    if (error) {
        console.log("❌ ERROR reading genres:", error.message)
    } else {
        console.log(`✅ Success! Found ${data.length} genres.`)
        if (data.length > 0) console.log("Sample:", data[0].name)
        else console.log("⚠️ Table is empty or no access.")
    }
}

checkGenresAccess()
