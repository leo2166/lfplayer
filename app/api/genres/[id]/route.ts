import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// PUT /api/genres/[id] - Update a genre
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      return NextResponse.json({ error: "Forbidden: Only admins can update genres" }, { status: 403 })
    }

    const { id: genreId } = await params
    const { name, color } = await request.json()

    if (!genreId) {
      return NextResponse.json({ error: "Genre ID is required" }, { status: 400 })
    }

    const updatePayload: { name?: string; color?: string } = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: "Genre name must be a non-empty string" }, { status: 400 })
      }
      updatePayload.name = name.trim()
    }
    if (color !== undefined) {
      if (typeof color !== 'string') {
        return NextResponse.json({ error: "Color must be a string" }, { status: 400 })
      }
      updatePayload.color = color
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No update data provided" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("genres")
      .update(updatePayload)
      .eq("id", genreId)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: "Genre not found or no changes made" }, { status: 404 })
    }

    return NextResponse.json({ genre: data })

  } catch (error) {
    console.error("Error updating genre:", error)
    return NextResponse.json({ error: "Failed to update genre" }, { status: 500 })
  }
}

// DELETE /api/genres/[id] - Delete a genre
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      return NextResponse.json({ error: "Forbidden: Only admins can delete genres" }, { status: 403 })
    }

    const { id: genreId } = await params

    if (!genreId) {
      return NextResponse.json({ error: "Genre ID is required" }, { status: 400 })
    }

    // Check for associated songs before deleting
    const { count: songCount, error: countError } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('genre_id', genreId);

    if (countError) throw countError;

    if (songCount && songCount > 0) {
      return NextResponse.json({ error: "Cannot delete genre with associated songs. Reassign or delete songs first." }, { status: 409 });
    }

    const { error } = await supabase
      .from("genres")
      .delete()
      .eq("id", genreId)

    if (error) throw error

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error("Error deleting genre:", error)
    return NextResponse.json({ error: "Failed to delete genre" }, { status: 500 })
  }
}