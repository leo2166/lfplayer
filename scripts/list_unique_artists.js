const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    console.log("Fetching unique artists...");
    const { data: songs, error } = await supabase
        .from('songs')
        .select('artist')
        .order('artist');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const artists = [...new Set(songs.map(s => s.artist))];
    console.log(`Found ${artists.length} unique artists:`);
    artists.forEach(a => {
        console.log(`'${a}' (length: ${a ? a.length : 0})`);
        if (a && a.includes("'")) console.log(`  WARNING: Contains single quote!`);
        if (a && a.trim() !== a) console.log(`  WARNING: Contains leading/trailing spaces!`);
    });
}

main();
