import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("genres").select("*").order("name")

    if (error) throw error

    return NextResponse.json({ genres: data })
  } catch (error) {
    console.error("Error fetching genres:", error)
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Only admins can create genres" }, { status: 403 })
    }

    const { name, color } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: "Genre name is required and must be a non-empty string" }, { status: 400 })
    }

    // Optional: basic color validation
    if (color && typeof color !== 'string') {
      return NextResponse.json({ error: "Color must be a string" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("genres")
      .insert({ name: name.trim(), color: color || '#CCCCCC' }) // Default color if not provided
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ genre: data }, { status: 201 })

  } catch (error) {
    console.error("Error creating genre:", error)
    return NextResponse.json({ error: "Failed to create genre" }, { status: 500 })
  }
}
