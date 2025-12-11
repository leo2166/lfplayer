import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { artistName: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const artistName = decodeURIComponent(params.artistName)

    if (!artistName) {
      return NextResponse.json({ error: "Artist name is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("songs")
      .select("title")
      .eq("user_id", user.id)
      .eq("artist", artistName)

    if (error) {
      throw error
    }

    // Return a simple array of titles
    const titles = data.map(song => song.title)
    return NextResponse.json({ titles })
    
  } catch (error) {
    console.error(`Error fetching songs for artist ${params.artistName}:`, error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `Failed to fetch songs: ${errorMessage}` }, { status: 500 })
  }
}
