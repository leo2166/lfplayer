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

async function verifyAdmin() {
    console.log("🔍 Checking user role in production...")

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
        console.error("Error listing users:", userError)
        return
    }

    const user = users.find(u => u.email === 'lucidio@lfplayer.local')

    if (!user) {
        console.error("❌ User lucidio@lfplayer.local NOT found in auth.users")
        return
    }

    console.log(`✅ User found: ${user.email} (${user.id})`)

    // 2. Check Profile Role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error("❌ Error fetching profile:", profileError.message)
        return
    }

    console.log("📊 Profile Data:", profile)

    if (profile.role === 'admin') {
        console.log("✅ SUCCESS: User has 'admin' role!")
    } else {
        console.log(`⚠️ FAILURE: User has '${profile.role}' role (expected 'admin')`)
    }
}

verifyAdmin()
