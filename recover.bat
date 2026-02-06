@echo off
echo ====================================
echo  LF Player - Recuperacion desde R2
echo ====================================
echo.
echo [1/3] Configurando entorno...
set NODE_TLS_REJECT_UNAUTHORIZED=0

echo [2/3] Iniciando recuperacion...
echo.
echo IMPORTANTE: Cuando el script pida la SERVICE_ROLE_KEY,
echo copia y pega esta clave:
echo.
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YnN6aHpjaXN4b3N3ZnZiYWVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg4MDIxMSwiZXhwIjoyMDc5NDU2MjExfQ.VaxhclhdZX7I0US8zKvi6bGxogeCPIuyvp4e9cuJLQc
echo.
pause
echo.
echo [3/3] Ejecutando script...
npx tsx scripts/repopulate_db_from_r2.ts

set NODE_TLS_REJECT_UNAUTHORIZED=

echo.
echo ====================================
echo  Recuperacion completada
echo ====================================
pause
