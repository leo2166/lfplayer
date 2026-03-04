
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    const artist = "Los mundiales y originales";
    const titles = [
        "los mundiales - esa mujer",
        "los originales - el aguardiente",
        "los originales - el gallo de mi vecina(2)"
    ];

    console.log(`Checking duplicates for Artist: "${artist}"...`);

    for (const title of titles) {
        const { data, error } = await supabase
            .from('songs')
            .select('id, title, artist, created_at')
            .eq('artist', artist)
            .eq('title', title)
            .maybeSingle();

        if (error) {
            console.error(`Error checking "${title}":`, error.message);
        } else if (data) {
            console.log(`[FOUND] "${title}" already exists (ID: ${data.id}, Created: ${data.created_at})`);
        } else {
            console.log(`[NOT FOUND] "${title}" does not exist for this artist.`);
        }
    }
}

checkDuplicates();
