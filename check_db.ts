import { supabaseAdmin } from './lib/supabase/admin';

async function checkSongs() {
    const { count, error } = await supabaseAdmin
        .from('songs')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error checking songs:', error.message);
    } else {
        console.log(`Total songs in DB: ${count}`);
    }

    const { data: sample, error: sampleError } = await supabaseAdmin
        .from('songs')
        .select('blob_url')
        .limit(5);

    if (sampleError) {
        console.error('Error getting sample:', sampleError.message);
    } else {
        console.log('Sample URLs:', JSON.stringify(sample, null, 2));
    }
}

checkSongs();
