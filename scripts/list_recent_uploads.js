
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function main() {
    // Load Env
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[match[1].trim()] = value;
            }
        });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Get songs uploaded in the last 24 hours
    const twoHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: songs, error } = await supabase
        .from('songs')
        .select('title, artist, created_at, blob_url')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error DB:", error);
        return;
    }

    console.log(`\n--- LISTA DE ARCHIVOS RECIENTES (${songs.length}) ---`);
    const sorted = songs.sort((a, b) => a.title.localeCompare(b.title));
    sorted.forEach((s, i) => console.log(`${i + 1}. ${s.title}\n   URL: ${s.blob_url}`));
}

main();
