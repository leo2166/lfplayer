const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        let key = parts[0].trim();
        if (key.startsWith('#')) return;
        let value = parts.slice(1).join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log("Fetching ALL music data to see artists...");
    const { data: songs, error } = await supabase
        .from('songs')
        .select('artist, title')
        .range(0, 50000);

    if (error) {
        console.error("Error:", error);
        return;
    }

    const artistCounts = {};
    songs.forEach(s => {
        const artist = s.artist || "NULL/EMPTY";
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });

    console.log(`Found ${Object.keys(artistCounts).length} unique artists across ${songs.length} songs:`);
    Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1]) // Sort by count desc
        .forEach(([artist, count]) => {
            console.log(`- '${artist}': ${count} songs`);
        });
}

main();
