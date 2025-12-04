import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("genres").select("*")

    if (error) throw error

    const customOrderNames = [
      "Romántica En Español", "Romántica en Ingles", "Merengues", "Salsa", "Guaracha",
      "Gaita Zuliana", "Clásica", "Urbana", "Tecno", "Moderna", "Pop", "Rock",
      "Rancheras", "Bachata", "Vallenato", "Venezolana"
    ];

    // Create a mapping of genre name to its desired order index
    const orderMap = new Map<string, number>();
    customOrderNames.forEach((name, index) => {
      orderMap.set(name, index);
    });

    // Sort the fetched genres according to the custom order
    // Genres not in customOrderNames will be appended at the end, sorted by name
    const sortedGenres = [...data].sort((a, b) => {
      const orderA = orderMap.has(a.name) ? orderMap.get(a.name)! : customOrderNames.length + a.name.localeCompare(b.name);
      const orderB = orderMap.has(b.name) ? orderMap.get(b.name)! : customOrderNames.length + b.name.localeCompare(a.name);
      return orderA - orderB;
    });

    return NextResponse.json({ genres: sortedGenres })
  } catch (error) {
    console.error("Error fetching genres:", error)
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 })
  }
}
