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

async function checkSongs() {
    console.log("🔍 Checking songs in production...")

    // 1. Get total songs count
    const { count, error: countError } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true })

    if (countError) {
        console.error("❌ Error counting songs:", countError.message)
        return
    }
    console.log(`📊 Total songs in DB: ${count}`)

    if (count === 0) {
        console.log("⚠️ No songs found in database!")
        return
    }

    // 2. Get a sample of songs with their genres
    const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select(`
      id, 
      title, 
      genre_id,
      blob_url,
      genres ( name )
    `)
        .limit(5)

    if (songsError) {
        console.error("❌ Error fetching songs sample:", songsError.message)
        return
    }

    console.log("\n🎵 Sample Songs Data:")
    songs.forEach(song => {
        console.log(`- [${song.genres?.name || 'NO GENRE'}] ${song.title} (ID: ${song.id})`)
        if (!song.genre_id) console.log("  ⚠️ Missing genre_id!")
    })
}

checkSongs()
