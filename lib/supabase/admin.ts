import { createClient } from '@supabase/supabase-js';

// IMPORTANT: This client is for server-side use with admin privileges.
// Do not expose this to the client-side.
// It requires SUPABASE_SERVICE_ROLE_KEY to be set in your .env.local file.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Remove ALL whitespace characters (spaces, newlines, tabs) from the key.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/\s/g, '');

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // In service role mode, auto-refreshing tokens is not needed.
    autoRefreshToken: false,
    persistSession: false
  }
});
