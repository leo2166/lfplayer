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
    const targetTitles = [
        "deja que te cante",
        "teresa vuelva",
        "tu volveras",
        "el son del caballo",
        "Las Cajas",
        "sabre olvidar",
        "tal para cual"
    ];

    console.log("Normalizando Artista a 'Joe Arroyo' para 7 canciones...");

    // Update query
    const { data, error } = await supabase
        .from('songs')
        .update({ artist: 'Joe Arroyo' }) // Valid Title Case
        .or(targetTitles.map(t => `title.ilike.%${t}%`).join(','))
        .select();

    if (error) {
        console.error("Error updating Supabase:", error);
        return;
    }

    console.log(`Actualizadas ${data.length} canciones.`);
    data.forEach(s => {
        console.log(`- [${s.title}] Ahora Artista: '${s.artist}'`);
    });
}

main();
