import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://wtbszhzcisxoswfvbaen.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YnN6aHpjaXN4b3N3ZnZiYWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg4MDIxMSwiZXhwIjoyMDc5NDU2MjExfQ.VaxhclhdZX7I0US8zKvi6bGxogeCPIuyvp4e9cuJLQc'
);

const { data, error } = await supabase
    .from('storage_buckets')
    .select('*')
    .order('account_number', { ascending: true });

if (error) {
    console.error('Error:', error.message);
    process.exit(1);
}

const THRESHOLD = 10627787776; // 9.9 GB

for (const bucket of data) {
    const usageGB = (bucket.current_usage_bytes / 1073741824).toFixed(2);
    const maxGB = bucket.max_capacity_bytes ? (bucket.max_capacity_bytes / 1073741824).toFixed(2) : 'N/A';
    const pct = bucket.max_capacity_bytes
        ? ((bucket.current_usage_bytes / bucket.max_capacity_bytes) * 100).toFixed(1)
        : 'N/A';
    const status = bucket.current_usage_bytes >= THRESHOLD ? 'LIMITE ALCANZADO' : 'OK';

    console.log(`\nCuenta R2 #${bucket.account_number} [${bucket.bucket_name}]`);
    console.log(`  Uso:       ${usageGB} GB`);
    console.log(`  Capacidad: ${maxGB} GB`);
    console.log(`  Uso %:     ${pct}%`);
    console.log(`  Estado:    ${status}`);
}

const totalUsage = data.reduce((s, b) => s + b.current_usage_bytes, 0);
const totalMax = data.reduce((s, b) => s + (b.max_capacity_bytes || 0), 0);
console.log(`\nTOTAL: ${(totalUsage / 1073741824).toFixed(2)} GB usados de ${(totalMax / 1073741824).toFixed(2)} GB totales`);
