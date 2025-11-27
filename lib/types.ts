// Generic type for Supabase tables
export interface SupabaseTable {
  id: string
  created_at?: string
  updated_at?: string
}

// Represents a song in the database
export interface Song extends SupabaseTable {
  user_id: string
  title: string
  artist?: string
  genre_id?: string
  duration?: number
  blob_url: string
}

// Represents a genre in the database
export interface Genre extends SupabaseTable {
  name: string
  description?: string
  color?: string
  created_by?: string
}
