# Progreso LFPlayer - Registro de Cambios

**Formato:** `YYYY-MM-DD HH:MM` | **Tipo** | **Descripción**

---

## 2026-11-05 04:30 | BACKUP | Snapshot completo del proyecto antes de cambios móviles
- **Ubicación:** `C:\Users\Lucidio\Proyectos\lfplayer_backup_20261105_043000\`
- **Contenido:** Código fuente completo (excluye node_modules, .next, *.zip)
- **Motivo:** Seguridad antes de implementar Wake Lock + Media Session API

## 2026-11-05 04:30 | DOCS | Creación documentación base
- **architectura.md** - Arquitectura completa de la webapp (estructura, flujos, BD, API, PWA, debt técnico)
- **progreso.md** - Este archivo (registro cronológico)

---

## 2026-11-05 04:35 | FIX | Audio en background móvil - Wake Lock + Media Session API

### Problema
Al reproducir música en móvil (celular), la app se detiene al apagar pantalla o poner en background. No ocurre en TV Box ni PC (no testado largo).

### Causa raíz
Navegadores móviles suspenden:
1. JavaScript timers
2. AudioContext / HTMLAudioElement
3. CPU/pantalla para ahorro batería

### Solución implementada (3 archivos)

#### 1. `components/music-player.tsx` - **REESCRITO COMPLETO**
**Cambios clave:**
- `useState([100])` �+' `useState(100)` (volume como number, no array)
- **Wake Lock API** (`navigator.wakeLock.request('screen')`)
  - Se adquiere al `isPlaying=true`
  - Se libera al `isPlaying=false` o `closePlayer()`
  - Re-adquisición automática en `visibilitychange: visible`
- **Media Session API** (`navigator.mediaSession`)
  - Metadata: título, artista, artwork (icon-512)
  - Action handlers: play, pause, previoustrack, nexttrack, seekto
  - Position state actualizado cada 1s (lock screen muestra progreso)
- **Visibility Change Handler**
  - Reanuda audio si se pausó al ocultar pestaña
  - Mantiene wake lock en background (comentado release en hidden)
- Limpieza de `useEffect` duplicados (había 3 para play/pause)
- Un solo `<audio>` ref para ambos layouts (card/bar)

#### 2. `public/manifest.json` - **MEJORADO**
- `start_url`: `"/"` �+' `"/app"`
- `orientation`: `"portrait-primary"`
- `categories`: `["music", "entertainment"]`
- Icons con `purpose: "any maskable"` (mejor instalabilidad)
- `shortcuts`: acceso directo "Reproducir"

#### 3. `next.config.mjs` - **PWA HABILITADO EN DEV**
- `disable: process.env.NODE_ENV === 'development'` �+' `disable: false`
- **Importante:** Requiere HTTPS para testear en móvil real
  - Usar `ngrok http 3000` o `vercel dev` para túnel HTTPS

### Cómo testear en móvil
1. `npm run build && npm run start` (producción local)
2. `ngrok http 3000` �+' obtener URL `https://xxx.ngrok-free.app`
3. Abrir URL en Chrome móvil
4. Menú (�<�) �+' "Instalar app" / "Añadir a pantalla de inicio"
5. Abrir desde icono instalado (no desde navegador)
6. Reproducir canción �+' apagar pantalla �+' esperar 2+ min
7. Verificar: lock screen muestra controles, música continúa

### Checklist verificación
- [ ] Pantalla apagada 2+ min �+' sigue sonando
- [ ] Lock screen �+' controles play/pause/next/prev
- [ ] Notificaciones (shade) �+' media controls
- [ ] Cambiar app �+' volver �+' posición correcta
- [ ] Auriculares BT conectar/desconectar �+' pausa/continúa

---

## Próximos pasos planificados (post-fix móvil)

| Prioridad | Tarea | Archivos afectados |
|-----------|-------|-------------------|
| Alta | Paginación fetch canciones en layout | `app/app/layout.tsx` |
| Alta | Dividir `music-library.tsx` en componentes | `components/music-library.tsx` + nuevos |
| Media | Integrar React Query (TanStack Query) | `package.json`, contexts, hooks |
| Media | RBAC real (columna role en profiles) | `app/app/layout.tsx`, `lib/supabase/server.ts`, APIs |
| Media | Virtualización grids (react-window) | `components/music-library.tsx` |
| Baja | TypeScript strict + eliminar `any` | `tsconfig.json`, `*.tsx` |
| Baja | Tests (Vitest + RTL) | `__tests__/`, `package.json` |
| Baja | i18n (español consistente) | `*.tsx`, `manifest.json` |

---

## Comandos útiles

```bash
# Desarrollo
npm run dev          # Next.js dev (puerto 3000)
npm run build        # Build producción
npm run start        # Servidor producción local

# Test móvil con HTTPS
ngrok http 3000      # Túnel HTTPS temporal
vercel dev           # Alternativa con Vercel CLI

# Lint / Typecheck
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check

# Backup manual
cp -r lfplayer lfplayer_backup_$(date +%Y%m%d_%H%M%S)
```

---

## 2026-11-05 04:45 | BUILD | Build producción exitoso
- `npm run build` �+' �o. Compilado en 7.8s
- **Nota:** next-pwa + Next.js 16 + Turbopack no genera `sw.js` en `.next/`
  - En producción (Vercel) Next.js usa webpack, no Turbopack �+' SW se genera
  - Workaround: desactivar `turbopack` en next.config.mjs si se necesita SW en local
  - **Wake Lock + Media Session funcionan SIN Service Worker** (solo requieren HTTPS + PWA instalada)

---

## 2026-11-05 04:45 | CONFIG | Próximo ajuste recomendado para SW local
```javascript
// next.config.mjs - descomentar para forzar webpack y generar SW en build local
// turbopack: {
//   root: __dirname,
// },
```
O usar: `DISABLE_PWA=true npm run build` para builds rápidos sin PWA

---

## 2026-11-05 04:55 | FIX | Corrección errores TypeScript en music-player.tsx
- `wakeLockRef.current` possibly null �+' uso variable local `sentinel` antes de asignar
- `releaseWakeLock` cleanup retorna Promise �+' convertido a sync (`.catch(console.warn)`)
- `seekto` handler tipado con `MediaSessionActionDetails` en lugar de `any`
- `npm run build` �+' �o. Compilado en 6.3s (sin errores en music-player.tsx)

---

## Notas para futuras sesiones

- Leer `arquitectura.md` para entender estructura sin recorrer todo el proyecto
- Leer `progreso.md` (este archivo) para saber qué se hizo y qué sigue
- Backup siempre en `lfplayer_backup_YYYYMMDD_HHMMSS/` antes de cambios grandes
- El fix móvil REQUIERE HTTPS - no funciona en `localhost` HTTP en móvil real
- **next-pwa + Turbopack = no SW en local** �+' testear en Vercel Preview Deploy o desactivar turbopack
