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

async function checkUsers() {
    try {
        console.log("Fetching users from Supabase Auth...");
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        console.log(`Found ${users.length} users in Auth:`);
        users.forEach(u => console.log(`- ID: ${u.id} | Email: ${u.email}`));

        console.log("\nFetching profiles from DB...");
        const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*');
        if (profileError) throw profileError;

        console.log(`Found ${profiles.length} profiles:`);
        profiles.forEach(p => console.log(`- ID: ${p.id} | Role: ${p.role}`));

    } catch (e) {
        console.error("ERROR:", e);
    }
}

checkUsers();
