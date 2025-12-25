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
  storage_account_number?: number // Número de cuenta R2 (1 o 2)
}

// Represents a genre in the database
export interface Genre extends SupabaseTable {
  name: string
  description?: string
  color?: string
  display_order?: number
  created_by?: string
}
