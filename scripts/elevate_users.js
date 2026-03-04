const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        let key = parts[0].trim();
        if (key.startsWith('#')) return;
        let value = parts.slice(1).join('=').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        env[key] = value;
    }
});

const supabaseAdmin = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function elevateAllUsers() {
    try {
        console.log("Setting ALL profiles to admin...");
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'admin' })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy where clause to apply to all

        if (error) throw error;

        console.log("Done. Checking profiles again...");
        const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*');
        if (profileError) throw profileError;

        console.log(`Current roles:`);
        profiles.forEach(p => console.log(`- ID: ${p.id} | Role: ${p.role}`));

    } catch (e) {
        console.error("ERROR:", e);
    }
}

elevateAllUsers();
