const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually to be sure
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
    console.log("Checking profiles...");
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(p => {
        console.log(`- ID: ${p.id} | Email Hint: ${p.email || 'N/A'} | Role: ${p.role}`);
    });

    console.log("\nChecking for artist 'guaracha' (case-insensitive)...");
    const { data: songs, error: songError } = await supabase
        .from('songs')
        .select('artist, title')
        .ilike('artist', 'guaracha');

    if (songError) {
        console.error("Error fetching songs:", songError);
    } else {
        console.log(`Found ${songs.length} songs for 'guaracha'.`);
        if (songs.length > 0) {
            const uniqueArtists = [...new Set(songs.map(s => s.artist))];
            console.log("Actual artist names in DB:", uniqueArtists.map(a => `'${a}'`).join(', '));
        }
    }
}

main();
