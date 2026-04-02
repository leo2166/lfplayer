-- Script para actualizar las URLs de las canciones en la base de datos Supabase
-- Reemplazando las URLs de r2.dev por las del nuevo Cloudflare Worker

-- 1. Actualizar las canciones de la Cuenta 1 (lfplayer-almacen-musica)
UPDATE public.songs
SET blob_url = REPLACE(
    blob_url, 
    'https://pub-9aa79c86fd3a40eba66854524815a9be.r2.dev', 
    'https://lfplayer-cdn.jubiladocantv.workers.dev'
)
WHERE 
    storage_account_number = 1 
    OR blob_url LIKE 'https://pub-9aa79c86fd3a40eba66854524815a9be.r2.dev%';

-- 2. Actualizar las canciones de la Cuenta 2 (lfplayer-2)
-- (Aunque está vacía actualmente, por si acaso existe algún registro huérfano)
UPDATE public.songs
SET blob_url = REPLACE(
    blob_url, 
    'https://pub-2f774f2a26ea44feb5ee92f7c8471093.r2.dev', 
    'https://lfplayer-cdn.jubiladocantv.workers.dev/b2'
)
WHERE 
    storage_account_number = 2 
    OR blob_url LIKE 'https://pub-2f774f2a26ea44feb5ee92f7c8471093.r2.dev%';

-- Verificar el número de canciones que aún podrían tener urls viejas:
-- SELECT count(*) FROM public.songs WHERE blob_url LIKE '%r2.dev%';
