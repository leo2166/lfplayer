-- =====================================================
-- Script: Habilitar RLS en storage_buckets
-- Propósito: Proteger tabla storage_buckets con políticas de seguridad
-- Fecha: 2025-12-25
-- =====================================================

-- Habilitar Row Level Security en storage_buckets
ALTER TABLE storage_buckets ENABLE ROW LEVEL SECURITY;

-- Política: Los admins pueden leer toda la tabla storage_buckets
CREATE POLICY "Admins can read storage_buckets"
ON storage_buckets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Solo el sistema (service_role) puede insertar/actualizar
-- Esto permite que el código backend (que usa service_role) pueda escribir
CREATE POLICY "Service role can manage storage_buckets"
ON storage_buckets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON POLICY "Admins can read storage_buckets" ON storage_buckets 
IS 'Permite a usuarios con rol admin leer información de uso de almacenamiento';

COMMENT ON POLICY "Service role can manage storage_buckets" ON storage_buckets 
IS 'Permite al backend (service_role) gestionar el tracking de uso de R2';
