---
description: Flujo seguro para subir cambios a producción con backup y rollback
---

# Flujo de Trabajo Seguro para Cambios

## Pasos Obligatorios

### 1. Hacer cambios en el código
- Editar los archivos necesarios

### 2. Compilar y probar en local
```powershell
npm run build
npm run dev
```
- Verificar que funcione correctamente

### 3. Crear backup (commit) - ANTES de push
// turbo
```powershell
git add .
git commit -m "backup: descripción del cambio"
```

### 4. Crear tag de backup (opcional pero recomendado)
```powershell
git tag backup-YYYYMMDD-HHMM
```

### 5. Subir a producción
```powershell
git push
```

### 6. Verificar en web
- Si funciona → ✅ Listo
- Si falla → Ejecutar rollback inmediato

## Rollback de Emergencia

### Revertir al commit anterior:
```powershell
git revert HEAD --no-edit
git push
```

### O revertir a un commit específico:
```powershell
git log --oneline -5
git revert <hash-del-commit-malo> --no-edit
git push
```

### Descartar cambios locales no commiteados:
```powershell
git checkout -- <archivo>
```

## Notas
- NUNCA hacer push sin haber probado en local primero
- SIEMPRE crear commit de backup antes de push
- El objetivo es que la webapp NUNCA quede fuera de servicio
