# Pasos para Completar la Recuperación

## 🚨 PASO 1: Ejecutar Script SQL en Supabase

La recuperación falló porque falta la columna `storage_account_number` en la tabla `songs`.

### Instrucciones:

1. **Abre el Dashboard de Supabase en el navegador:**
   - https://supabase.com/dashboard/project/wtbszhzcisxoswfvbaen

2. **Ve a SQL Editor:**
   - En el menú lateral, busca el ícono **🔧 SQL Editor**

3. **Crea una Nueva Query:**
   - Haz clic en **+ New Query**

4. **Copia y pega este SQL completo:**

```sql
-- Añadir columna a la tabla songs para trackear el bucket
ALTER TABLE songs ADD COLUMN IF NOT EXISTS storage_account_number INTEGER DEFAULT 1;

-- Índice para búsqueda por cuenta de almacenamiento
CREATE INDEX IF NOT EXISTS idx_songs_storage_account ON songs(storage_account_number);

-- Comentario
COMMENT ON COLUMN songs.storage_account_number IS 'Número de cuenta de R2 donde está almacenado el archivo (1 o 2)';

-- Crear tabla para tracking de buckets de almacenamiento
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_storage_buckets_active ON storage_buckets(is_active);
CREATE INDEX IF NOT EXISTS idx_storage_buckets_account ON storage_buckets(account_number);

-- Insert inicial para las cuentas
INSERT INTO storage_buckets (account_number, account_id, bucket_name, is_active, current_usage_bytes)
VALUES 
  (1, '2e4ce46b69496d4672be6e105ad32329', 'lfplayer-almacen-musica', true, 0),
  (2, 'ef00c93cf25c2564210cdb1e387c0586', 'lfplayer-2', true, 0)
ON CONFLICT (account_number) DO NOTHING;
```

5. **Ejecuta el script:**
   - Haz clic en **Run** o presiona `Ctrl+Enter`

6. **Verifica que se ejecutó correctamente:**
   - Deberías ver "Success. No rows returned"

---

## 🔄 PASO 2: Reejecutar Recuperación

Una vez ejecutado el SQL, vuelve a ejecutar:

```cmd
.\recover.bat
```

O manualmente:
```cmd
set NODE_TLS_REJECT_UNAUTHORIZED=0
npx tsx scripts/repopulate_db_from_r2.ts
```

---

## 📊 Resultado Esperado

El script debería importar las **1874 canciones** que encontró en R2 Cuenta #1.

**Nota:** La Cuenta #2 tiene un problema de credenciales que resolveremos después si es necesario.
