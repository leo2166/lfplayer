-- =====================================================
-- Script: Crear tabla de tracking de buckets R2
-- Propósito: Gestionar múltiples cuentas de Cloudflare R2
-- Fecha: 2025-12-25
-- =====================================================

-- Crear tabla para tracking de buckets de almacenamiento
CREATE TABLE IF NOT EXISTS storage_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number INTEGER NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  current_usage_bytes BIGINT DEFAULT 0,
  max_capacity_bytes BIGINT DEFAULT 10737418240, -- 10GB en bytes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_storage_buckets_active ON storage_buckets(is_active);
CREATE INDEX IF NOT EXISTS idx_storage_buckets_account ON storage_buckets(account_number);

-- Comentarios para documentación
COMMENT ON TABLE storage_buckets IS 'Tracking de buckets de Cloudflare R2 para sistema multi-cuenta';
COMMENT ON COLUMN storage_buckets.account_number IS 'Número de cuenta (1, 2, 3, etc.)';
COMMENT ON COLUMN storage_buckets.current_usage_bytes IS 'Uso actual en bytes';
COMMENT ON COLUMN storage_buckets.max_capacity_bytes IS 'Capacidad máxima en bytes (10GB para cuentas gratuitas)';

-- Insert inicial para la cuenta 1 (existente)
INSERT INTO storage_buckets (account_number, account_id, bucket_name, is_active, current_usage_bytes)
VALUES (1, '2e4ce46b69496d4672be6e105ad32329', 'lfplayer', true, 0)
ON CONFLICT (account_number) DO NOTHING;

-- Insert para la cuenta 2 (nueva)
INSERT INTO storage_buckets (account_number, account_id, bucket_name, is_active, current_usage_bytes)
VALUES (2, 'ef00c93cf25c2564210cdb1e387c0586', 'lfplayer-2', true, 0)
ON CONFLICT (account_number) DO NOTHING;

-- Añadir columna a la tabla songs para trackear el bucket
ALTER TABLE songs ADD COLUMN IF NOT EXISTS storage_account_number INTEGER DEFAULT 1;

-- Índice para búsqueda por cuenta de almacenamiento
CREATE INDEX IF NOT EXISTS idx_songs_storage_account ON songs(storage_account_number);

-- Comentario
COMMENT ON COLUMN songs.storage_account_number IS 'Número de cuenta de R2 donde está almacenado el archivo (1 o 2)';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_storage_buckets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER storage_buckets_updated_at
  BEFORE UPDATE ON storage_buckets
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_buckets_updated_at();
