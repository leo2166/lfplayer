import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * 🎵 Keep-Alive + Anti-Pausa Supabase
 *
 * Vercel Cron Job — ver vercel.json: "0 8 * * *" (cada día a las 8:00 UTC)
 *
 * Estrategia: simula actividad real del sistema consultando canciones
 * aleatorias (como si se estuviera reproduciendo una canción), lo cual
 * Supabase interpreta como uso genuino de la base de datos y NO pausa el proyecto.
 *
 * Protegido con CRON_SECRET para que solo Vercel pueda invocarlo.
 */
export async function GET(req: NextRequest) {
    // ── 0. Verificar CRON_SECRET (obligatorio para Vercel Cron) ───────────────
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Solo validar en producción (en desarrollo se permite sin token)
    if (process.env.NODE_ENV === 'production' && cronSecret) {
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const timestamp = new Date().toISOString();
    const results: Record<string, unknown> = { timestamp, trigger: 'vercel-cron' };

    // ── 1. Simular reproducción de canción aleatoria en Supabase ─────────────
    //     Esto hace múltiples queries como lo haría un usuario real:
    //     - Cuenta el total de canciones
    //     - Obtiene una canción aleatoria
    //     - Lee sus metadatos (artista, género)
    //     Supabase detecta actividad real y NO pausa el proyecto.
    try {
        // 1a. Contar canciones disponibles
        const { count, error: countError } = await supabaseAdmin
            .from('songs')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        const totalSongs = count ?? 0;

        // 1b. Seleccionar una canción aleatoria (simula "reproducir")
        let songResult = null;
        if (totalSongs > 0) {
            const randomOffset = Math.floor(Math.random() * Math.min(totalSongs, 100));
            const { data: songs, error: songError } = await supabaseAdmin
                .from('songs')
                .select('id, title, artist, genre_id, duration, file_url')
                .range(randomOffset, randomOffset)
                .limit(1);

            if (songError) throw songError;
            songResult = songs?.[0] ?? null;
        }

        // 1c. También consultar géneros (tabla secundaria)
        const { data: genres, error: genreError } = await supabaseAdmin
            .from('genres')
            .select('id, name')
            .limit(5);

        if (genreError) throw genreError;

        console.log(`[keep-alive] ✅ Supabase OK — ${totalSongs} canciones en BD`);
        if (songResult) {
            console.log(`[keep-alive] 🎵 Canción "reproducida": "${songResult.title}" por ${songResult.artist}`);
        }

        results.supabase = {
            status: 'ok',
            totalSongs,
            songPlayed: songResult
                ? { id: songResult.id, title: songResult.title, artist: songResult.artist }
                : null,
            genresChecked: genres?.length ?? 0,
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[keep-alive] ❌ Supabase falló:', msg);
        results.supabase = { status: 'error', message: msg };
    }

    // ── 2. Ping al CDN Cloudflare R2 ─────────────────────────────────────────
    const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
    if (workerUrl) {
        try {
            const res = await fetch(workerUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(10_000),
            });
            console.log(`[keep-alive] ✅ Cloudflare R2 OK (HTTP ${res.status})`);
            results.cloudflare = { status: 'ok', httpStatus: res.status };
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error('[keep-alive] ⚠️ Cloudflare R2 ping falló:', msg);
            results.cloudflare = { status: 'error', message: msg };
        }
    } else {
        results.cloudflare = { status: 'skipped', reason: 'URL no configurada' };
    }

    // ── 3. Estado final ───────────────────────────────────────────────────────
    const supabaseOk = (results.supabase as Record<string, unknown>)?.status === 'ok';
    const overallStatus = supabaseOk ? 'ok' : 'degraded';

    console.log(`[keep-alive] Finalizado — estado: ${overallStatus} | ${timestamp}`);

    // Siempre retornar 200 para que Vercel NO marque el cron como fallido
    return NextResponse.json(
        { status: overallStatus, ...results },
        { status: 200 }
    );
}
