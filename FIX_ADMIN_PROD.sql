-- Script para otorgar permisos de administrador al usuario 'lucidio'
-- Ejecutar en el Editor SQL de Supabase

-- 1. Verificar si el usuario existe en auth.users
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'lucidio@lfplayer.local';
  
  IF user_id IS NULL THEN
    RAISE NOTICE 'Usuario lucidio@lfplayer.local no encontrado.';
  ELSE
    RAISE NOTICE 'Usuario encontrado con ID: %', user_id;
    
    -- 2. Asegurar que existe en public.profiles
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (user_id, 'Lucidio Admin', 'admin')
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin';
    
    RAISE NOTICE 'Rol de administrador asignado exitosamente.';
  END IF;
END $$;
