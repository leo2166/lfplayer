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
    const searchTerm = "salsa para hacer el amor";
    console.log(`Buscando canciones con término: '${searchTerm}'...`);

    // Search in Artist OR Title
    const { data: songs, error, count } = await supabase
        .from('songs')
        .select('*', { count: 'exact' })
        .or(`artist.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error querying Supabase:", error);
        return;
    }

    console.log(`Encontradas: ${songs.length} canciones.`);

    if (songs.length > 0) {
        console.log("Muestra (Primeras 5):");
        songs.slice(0, 5).forEach(s => {
            console.log(`- [${s.id}] '${s.title}' | Artist: '${s.artist}' | Subido: ${s.created_at}`);
        });

        // Check finding index in total list to confirm if > 1000
        // We'll do a separate light query for that or just infer from current logic
    }
}

main();
