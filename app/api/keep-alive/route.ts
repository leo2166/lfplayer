import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Vercel Cron Job Configuration (see vercel.json)
// Runs daily to keep Supabase and Cloudflare Worker active
export async function GET() {
    const timestamp = new Date().toISOString();
    const results: Record<string, any> = { timestamp };

    // ── 1. Ping Supabase (via admin client) ───────────────────────────────────
    try {
        const { error } = await supabaseAdmin
            .from('genres')
            .select('id')
            .limit(1);

        if (error) {
            console.error('[keep-alive] Supabase ping failed:', error.message);
            results.supabase = { status: 'error', message: error.message };
        } else {
            console.log('[keep-alive] ✅ Supabase pinged OK');
            results.supabase = { status: 'ok' };
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[keep-alive] Supabase exception:', msg);
        results.supabase = { status: 'error', message: msg };
    }

    // ── 2. Ping Cloudflare Worker (CDN) ──────────────────────────────────────
    // A lightweight HEAD request to the Worker URL is enough to keep it warm
    const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
    if (workerUrl) {
        try {
            const res = await fetch(workerUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
            console.log(`[keep-alive] ✅ Cloudflare Worker pinged OK (status: ${res.status})`);
            results.cloudflare_worker = { status: 'ok', httpStatus: res.status };
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error('[keep-alive] Cloudflare Worker ping failed:', msg);
            results.cloudflare_worker = { status: 'error', message: msg };
        }
    } else {
        results.cloudflare_worker = { status: 'skipped', reason: 'NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL not set' };
    }

    // ── 3. Determine overall status ──────────────────────────────────────────
    const allOk = results.supabase?.status === 'ok';
    const overallStatus = allOk ? 'ok' : 'degraded';

    console.log(`[keep-alive] Done — overall: ${overallStatus}`);

    return NextResponse.json(
        { status: overallStatus, ...results },
        { status: allOk ? 200 : 500 }
    );
}
