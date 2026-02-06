-- ============================================
-- SQL SIMPLIFICADO PARA RECUPERACIÓN LF PLAYER
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- 1. CREAR TABLA storage_buckets
CREATE TABLE IF NOT EXISTS storage_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number INTEGER NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  current_usage_bytes BIGINT DEFAULT 0,
  limit_bytes BIGINT DEFAULT 10737418240,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_storage_buckets_active ON storage_buckets(is_active);
CREATE INDEX IF NOT EXISTS idx_storage_buckets_account ON storage_buckets(account_number);

-- 3. INSERTAR CONFIGURACIÓN DE BUCKETS
INSERT INTO storage_buckets (account_number, account_id, bucket_name, is_active, current_usage_bytes)
VALUES 
  (1, '2e4ce46b69496d4672be6e105ad32329', 'lfplayer-almacen-musica', true, 0),
  (2, 'ef00c93cf25c2564210cdb1e387c0586', 'lfplayer-2', true, 0)
ON CONFLICT (account_number) DO NOTHING;

-- 4. VERIFICAR (deberías ver 2 filas)
SELECT * FROM storage_buckets;
