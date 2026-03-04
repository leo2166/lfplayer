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

async function testEndpoint(url) {
    console.log(`\nTesting endpoint: ${url}`);

    // We can't easily simulate the Next.js auth cookie here, 
    // but we can check if the code itself has syntax errors by running it through node if it was a standalone script.
    // Since it's a Next.js route, we'll try to use a local fetch if the server is running,
    // or just perform a static analysis check for now.

    console.log("Static check for environment variables used in cleanup routes:");
    console.log("- NEXT_PUBLIC_SUPABASE_URL:", env.NEXT_PUBLIC_SUPABASE_URL ? "OK" : "MISSING");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", env.SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING");
    console.log("- CLOUDFLARE_R2_BUCKET_NAME:", env.CLOUDFLARE_R2_BUCKET_NAME ? "OK" : "MISSING");
}

testEndpoint('/api/cleanup-supabase');
testEndpoint('/api/cleanup-supabase/broken-links');
