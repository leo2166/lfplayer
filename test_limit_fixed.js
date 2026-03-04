const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://wtbszhzcisxoswfvbaen.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YnN6aHpjaXN4b3N3ZnZiYWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg4MDIxMSwiZXhwIjoyMDc5NDU2MjExfQ.VaxhclhdZX7I0US8zKvi6bGxogeCPIuyvp4e9cuJLQc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("Testing Supabase reach...");

    // Attempt 1: Large range
    const { data: songs1, count, error: error1 } = await supabase
        .from('songs')
        .select('id', { count: 'exact' })
        .range(0, 5000);

    console.log(`Attempt 1 (0-5000): Received ${songs1?.length || 0} rows. Total count in DB: ${count}`);

    if (error1) console.error("Error 1:", error1);

    // Attempt 2: Batching
    if (songs1?.length === 1000 && count > 1000) {
        console.log("Hypothesis confirmed: Capped at 1000. Trying batch 2...");
        const { data: songs2, error: error2 } = await supabase
            .from('songs')
            .select('id')
            .range(1000, 1999);
        console.log(`Attempt 2 (1000-1999): Received ${songs2?.length || 0} rows.`);
    }
}

testFetch();
