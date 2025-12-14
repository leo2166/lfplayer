import { r2, CLOUDFLARE_R2_BUCKET_NAME } from "@/lib/cloudflare/r2"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (profileError || !profile || profile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: User is not an admin" }, { status: 403 })
        }

        const body = await request.json().catch(() => ({}));
        const genreId = body.genreId || null; // Optional: Apply this genre to recovered songs

        // 1. Get all files from R2
        const allR2Keys = new Set<string>();
        let continuationToken: string | undefined = undefined;

        do {
            const command = new ListObjectsV2Command({
                Bucket: CLOUDFLARE_R2_BUCKET_NAME,
                ContinuationToken: continuationToken,
            })
            const response: any = await r2.send(command)

            response.Contents?.forEach((item: any) => {
                if (item.Key) allR2Keys.add(item.Key);
            })

            continuationToken = response.NextContinuationToken
        } while (continuationToken)

        // 2. Get all songs from Supabase for this user
        // We only check against THIS user's songs to be safe, 
        // effectively "claiming" any orphan as our own if we rectify it.
        // NOTE: This assumes orphans belong to the current user.
        const { data: songs, error: dbError } = await supabase
            .from('songs')
            .select('blob_url')
            .eq('user_id', user.id); // Filter by user_id

        if (dbError) {
            console.error("Error fetching songs from Supabase:", dbError)
            return NextResponse.json({ error: "Database error" }, { status: 500 })
        }

        const dbUrls = new Set(songs?.map(s => s.blob_url) || []);

        // 3. Identify Orphans
        const orphans: string[] = [];
        const publicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || '';

        for (const key of allR2Keys) {
            const fullUrl = `${publicUrl}/${key}`;
            if (!dbUrls.has(fullUrl)) {
                orphans.push(key);
            }
        }

        if (orphans.length === 0) {
            return NextResponse.json({
                message: "No orphans found to rectify",
                rectifiedCount: 0
            });
        }

        // 4. Rectify (Create Supabase records)
        let rectifiedCount = 0;
        const errors = [];

        for (const key of orphans) {
            try {
                // Extract filename from Key (UUID-filename.mp3)
                // Example: "123e4567-e89b-12d3...-MySong.mp3"
                const parts = key.split('-');
                // If split has > 5 parts (UUID has 4 hyphens), join the rest. 
                // UUID format: 8-4-4-4-12 (5 parts, 4 hyphens)
                // So index 0,1,2,3,4 are UUID parts. Index 5+ is filename.

                let originalFilename = key;
                if (parts.length > 5) {
                    originalFilename = parts.slice(5).join('-');
                } else {
                    // Fallback if format is unexpected, just use the whole key or parts after first hyphen
                    originalFilename = key.substring(key.indexOf('-') + 1);
                }

                // Remove extension for Title
                let title = originalFilename.replace(/\.[^/.]+$/, "");
                let artist = "Artista Desconocido";

                // Attempt to extract Artist from "Artist - Title" format
                if (title.includes(' - ')) {
                    const titleParts = title.split(' - ');
                    artist = titleParts[0].trim();
                    title = titleParts.slice(1).join(' - ').trim();
                } else {
                    // If the key has folder structure "Artist/Song.mp3" encoded?
                    // R2 keys usually store slashes literally.
                    // let's check for forward slash
                    if (originalFilename.includes('/')) {
                        const pathParts = originalFilename.split('/');
                        if (pathParts.length >= 2) {
                            artist = pathParts[0].trim();
                            title = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, "").trim();
                        }
                    }
                }

                const fullUrl = `${publicUrl}/${key}`;

                const { error: insertError } = await supabase
                    .from('songs')
                    .insert({
                        user_id: user.id,
                        title: title,
                        artist: artist,
                        blob_url: fullUrl,
                        genre_id: genreId, // Can be null, user will have to categorize later
                        duration: 0, // Cannot determine without downloading
                        created_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error(`Failed to insert record for ${key}:`, insertError);
                    errors.push({ key, error: insertError.message });
                } else {
                    rectifiedCount++;
                }

            } catch (err: any) {
                console.error(`Error processing key ${key}:`, err);
                errors.push({ key, error: err.message });
            }
        }

        return NextResponse.json({
            message: "Rectification complete",
            rectifiedCount,
            totalOrphansFound: orphans.length,
            errors: errors.length > 0 ? errors : undefined
        })

    } catch (error) {
        console.error("Error in rectify-orphans:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
