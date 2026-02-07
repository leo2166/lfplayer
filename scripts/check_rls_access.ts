import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkPolicies() {
    console.log("🔍 Checking RLS Policies on 'songs' table...")

    const { data, error } = await supabase
        .rpc('get_policies', { table_name: 'songs' })
    // Note: get_policies is not a standard RPC. 
    // We usually query pg_policies directly via SQL if we have direct access, 
    // but via client we can only guess or try to insert/select as anon.

    // Better approach: Test access as ANON
}

// Since we can't query system tables easily via JS client without a specific RPC,
// Let's test ACCESS.

async function testAccess() {
    console.log("🕵️ Testing ANONYMOUS access...")
    const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data: anonData, error: anonError } = await anonClient
        .from('songs')
        .select('count')
        .limit(1)

    if (anonError) console.log("❌ Anon Access Error:", anonError.message)
    else console.log(`✅ Anon Access Count: ${anonData?.length}`) // Should be 0 if public read is off, or >0 if on

    // We can't easily test "Authenticated but not me" without a token.
    // But we can check if I can see them with the service role (we know yes).

    console.log("\n💡 Recommendation: Run SQL to 'ENABLE RLS' and 'CREATE POLICY'")
}

// Actually, let's just output a SQL to SHOW policies if user runs it in dashboard.
console.log("To check policies, run this in Supabase SQL Editor:")
console.log("SELECT * FROM pg_policies WHERE tablename = 'songs';")

testAccess()
