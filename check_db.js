const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://welywltyuhfwkluevgkn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlbHl3bHR5dWhmd2tsdWV2Z2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzk0NzUwNywiZXhwIjoyMDc5NTIzNTA3fQ.O9-lQyW6w4q7QlyeBvOQTAbIpOG4tm7bN4ODUAXyF48';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function check() {
  const { data, error } = await supabase.from('songs').select('blob_url').limit(5);
  if (error) {
    console.error('Error:', error);
  }
  console.log(JSON.stringify(data, null, 2));
}
check();
