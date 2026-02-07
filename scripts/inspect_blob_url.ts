import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkBlobUrl() {
    const { data, error } = await supabase
        .from('songs')
        .select('id, title, blob_url')
        .not('blob_url', 'is', null)
        .limit(3)

    if (error) { console.error(error); return; }
    console.log("Found songs with blob_url:", data)
}

checkBlobUrl()
