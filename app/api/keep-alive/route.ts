import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Vercel Cron Job Configuration (see vercel.json)
// Runs every 2 days to keep Supabase project active
export async function GET() {
    try {
        // A simple query to wake up/keep alive the database
        // We only need to fetch 1 row from any table
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Keep-alive ping failed:', error.message);
            return NextResponse.json(
                { status: 'error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: 'success',
            message: 'Supabase project pinged successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Keep-alive ping exception:', message);
        return NextResponse.json(
            { status: 'error', message },
            { status: 500 }
        );
    }
}
