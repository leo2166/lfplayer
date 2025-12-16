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
    console.log("=== VERIFICANDO ORDEN DE GÉNEROS ===\n");

    const { data: genres, error } = await supabase
        .from('genres')
        .select('name, display_order')
        .order('display_order', { ascending: true });

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Orden actual (display_order):");
    genres.forEach((g, i) => {
        console.log(`${i + 1}. [${g.display_order}] ${g.name}`);
    });
}

main();
