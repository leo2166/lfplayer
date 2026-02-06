-- 1. Agregar la columna display_order a la tabla genres
ALTER TABLE public.genres 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- 2. Actualizar el orden de los 14 géneros
UPDATE genres SET display_order = 1 WHERE name = 'Romántica En Español';
UPDATE genres SET display_order = 2 WHERE name = 'Romántica en Ingles';
UPDATE genres SET display_order = 3 WHERE name = 'Merengues';
UPDATE genres SET display_order = 4 WHERE name = 'Salsa';
UPDATE genres SET display_order = 5 WHERE name = 'Guaracha';
UPDATE genres SET display_order = 6 WHERE name = 'Gaita Zuliana';
UPDATE genres SET display_order = 7 WHERE name = 'Clásica';
UPDATE genres SET display_order = 8 WHERE name = 'Urbana';
UPDATE genres SET display_order = 9 WHERE name = 'Tecno';
UPDATE genres SET display_order = 10 WHERE name = 'Moderna';
UPDATE genres SET display_order = 11 WHERE name = 'Pop';
UPDATE genres SET display_order = 12 WHERE name = 'Musica Venezolana';
UPDATE genres SET display_order = 13 WHERE name = 'Vallenatos';
UPDATE genres SET display_order = 14 WHERE name = 'La hora loca';

-- 3. Verificar los resultados
SELECT name, display_order FROM genres ORDER BY display_order ASC;
