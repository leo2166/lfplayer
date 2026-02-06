import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🟡 GET /api/genres: Starting...");
    const supabase = await createClient()
    console.log("🟡 Supabase client created");

    const { data, error } = await supabase.from("genres").select("*")
    console.log("🟡 DB Query Result:", { dataCount: data?.length, error });

    if (error) throw error

    const customOrderNames = [
      "Romántica En Español", "Romántica en Ingles", "Merengues", "Salsa", "Guaracha",
      "Gaita Zuliana", "Clásica", "Urbana", "Tecno", "Moderna", "Pop", "Rock",
      "Rancheras", "Bachata", "Vallenato", "Venezolana"
    ];

    // Create a mapping of genre name to its desired order index
    const orderMap = new Map<string, number>();
    customOrderNames.forEach((name, index) => {
      orderMap.set(name.toLowerCase(), index);
    });

    // Sort the fetched genres according to the custom order
    // Genres not in customOrderNames will be appended at the end, sorted by name
    let sortedGenres = [];
    try {
      sortedGenres = [...(data || [])].sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';

        const indexA = orderMap.has(nameA) ? orderMap.get(nameA)! : 9999;
        const indexB = orderMap.has(nameB) ? orderMap.get(nameB)! : 9999;

        if (indexA !== indexB) {
          return indexA - indexB;
        }

        return nameA.localeCompare(nameB);
      });
    } catch (sortErr) {
      console.error("🔴 Error sorting genres:", sortErr);
      sortedGenres = data || []; // Fallback to unsorted
    }

    return NextResponse.json({ genres: sortedGenres })
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

    const { name, color } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Check if genre exists (case insensitive)
    const { data: existing } = await supabase
      .from("genres")
      .select("id")
      .ilike("name", name)
      .single()

    if (existing) {
      return NextResponse.json({ id: existing.id, created: false })
    }

    const { data: newGenre, error } = await supabase
      .from("genres")
      .insert({
        name,
        color: color || '#EC4899', // Default pink if not provided
        description: `Genre ${name}`
      })
      .select("id")
      .single()

    if (error) throw error

    return NextResponse.json({ id: newGenre.id, created: true })
  } catch (error) {
    console.error("Error creating genre:", error)
    return NextResponse.json({ error: "Failed to create genre" }, { status: 500 })
  }
}
