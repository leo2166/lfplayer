import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: batchSongs, error } = await supabase
          .from('songs')
          .select('*')
          .order('title', { ascending: true })
          .range(0, 999);
          
        return NextResponse.json({
            songsCount: batchSongs?.length,
            error: error
        });
    } catch (e) {
        return NextResponse.json({ exception: String(e) }, { status: 500 });
    }
}
