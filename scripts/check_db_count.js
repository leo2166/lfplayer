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
    console.log("Verificando cantidad TOTAL de canciones en DB...");

    const { count, error } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`TOTAL REGISTROS REALES EN DB: ${count}`);

        // Check if there are more than 1000
        if (count > 1000) {
            console.log("¡ALERTA! Hay más de 1000 canciones. La API por defecto solo devuelve 1000.");
            console.log("Esto explica por qué desaparecen las canciones antiguas.");
        } else {
            console.log("El conteo está dentro del límite por defecto (1000).");
        }
    }
}

main();
