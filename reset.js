const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://welywltyuhfwkluevgkn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlbHl3bHR5dWhmd2tsdWV2Z2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzk0NzUwNywiZXhwIjoyMDc5NTIzNTA3fQ.O9-lQyW6w4q7QlyeBvOQTAbIpOG4tm7bN4ODUAXyF48', {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  const adminUser = users.users.find(u => u.email === 'jubiladocantv@gmail.com');
  const { error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, { password: 'Musica2026!' });
  if (updateError) console.error(updateError); else console.log('Password reset to Musica2026!');
}
run();
