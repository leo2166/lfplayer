# Arquitectura LFPlayer

**Última actualización:** 5 de noviembre de 2026
**Versión:** 1.0

---

## Visión General

LFPlayer es una **webapp de streaming de música personal** construida con:
- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19** (Client Components para interactividad)
- **TypeScript** (strict mode)
- **Tailwind CSS 4** + **Radix UI** (componentes accesibles)
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Cloudflare R2** (almacenamiento de archivos de audio)
- **PWA** (next-pwa, Service Worker, instalación en móvil)

---

## Estructura de Carpetas

```
lfplayer/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Server)
│   │   ├── songs/                # CRUD canciones
│   │   ├── genres/               # CRUD géneros
│   │   ├── playlists/            # CRUD playlists
│   │   ├── download/             # Descargas ZIP
│   │   ├── cleanup/              # Mantenimiento BD/R2
│   │   └── ...
│   ├── app/                      # Ruta principal "/app" (protegida)
│   │   ├── _components/          # Componentes de página
│   │   ├── layout.tsx            # Server Component: fetch inicial + providers
│   │   └── page.tsx              # Entry point
│   ├── auth/                     # Login/registro (Supabase Auth)
│   ├── layout.tsx                # Root layout (providers globales)
│   ├── page.tsx                  # Landing page
│   └── providers.tsx             # ThemeProvider (next-themes)
├── components/                   # Componentes UI reutilizables
│   ├── ui/                       # Radix UI wrappers (button, slider, dialog, etc.)
│   ├── music-player.tsx          # Player principal (audio + controles)
│   ├── global-music-player.tsx   # Overlay modal player
│   ├── landing-page.tsx          # Landing
│   ├── genre-filter.tsx          # Filtro por género
│   ├── song-card.tsx             # Tarjeta canción
│   ├── playlist-wizard.tsx       # Crear playlists
│   ├── add-music-dialog.tsx      # Subir música
│   └── ...
├── contexts/                     # React Context (estado global cliente)
│   ├── MusicPlayerContext.tsx    # Estado reproducción (currentSong, queue, time)
│   ├── MusicLibraryContext.tsx   # Biblioteca (songs, genres, playlists, refetch)
│   └── UserRoleContext.tsx       # Rol usuario (guest/admin)
├── hooks/                        # Custom hooks
│   ├── usePWAInstall.ts          # Instalación PWA
│   ├── use-toast.ts              # Sonner toasts
│   └── use-mobile.ts             # Detectar móvil
├── lib/                          # Utilidades y clientes
│   ├── supabase/
│   │   ├── server.ts             # Cliente Supabase (Server Components)
│   │   └── client.ts             # Cliente Supabase (Client Components)
│   ├── cloudflare/
│   │   └── r2-manager.ts         # Gestión R2 (multi-cuenta, presigned URLs)
│   ├── utils.ts                  # cn() para classnames
│   └── types.ts                  # Interfaces TypeScript
├── public/                       # Assets estáticos + manifest.json + SW
├── scripts/                      # Scripts de mantenimiento (TS/JS)
├── audio_normalizer/             # Python script normalización audio
└── *.sql                         # Migraciones y fixes BD
```

---

## Flujo de Datos

### 1. Carga Inicial (Server Side)
```
app/app/layout.tsx (Server Component)
    │
    ├─► createClient() (supabase/server.ts) → Supabase SSR
    │
    ├─► Fetch genres (ordenados por display_order)
    │
    ├─► Fetch ALL songs (paginado 1000) ⚠️ PROBLEMA: sin límite
    │
    └─► Render ClientLayout
            │
            ├─► UserRoleProvider (initialRole)
            └─► MusicLibraryProvider (initialSongs, initialGenres)
                    │
                    └─► MusicLibrary (Client Component)
                            │
                            ├─► useMusicLibrary() → songs, genres, refetchSongs
                            ├─► useMusicPlayer() → currentSong, isPlaying, playSong...
                            └─► Render UI
```

### 2. Reproducción (Client Side)
```
User click song
    │
    ▼
MusicLibrary.playSong(song, playbackQueue)
    │
    ▼
MusicPlayerContext.playSong() → setSongs(playlist), setCurrentSong(song), setIsPlaying(true)
    │
    ▼
GlobalMusicPlayer (overlay) → MusicPlayer (layout="card")
    │
    ▼
<audio ref> src=song.blob_url → play()
    │
    ▼
onTimeUpdate → setCurrentTime → MediaSession positionState
```

### 3. Subida de Música (Admin)
```
AddMusicDialog → FormData (archivo + metadata)
    │
    ▼
POST /api/upload → R2 presigned URL → PUT directo a R2
    │
    ▼
POST /api/songs → Supabase insert (con storage_account_number)
    │
    ▼
MusicLibraryContext.refetchSongs() → router.refresh()
```

---

## Estado Global (Contexts)

### MusicPlayerContext (`contexts/MusicPlayerContext.tsx`)
| Estado | Tipo | Descripción |
|--------|------|-------------|
| `songs` | `Song[]` | Queue actual de reproducción |
| `currentSong` | `Song \| null` | Canción sonando |
| `isPlaying` | `boolean` | Play/Pause |
| `currentTime` | `number` | Posición actual (segundos) |
| `playSong(song, playlist)` | fn | Inicia reproducción con queue |
| `togglePlay()` | fn | Play/Pause |
| `playNext()` / `playPrev()` | fn | Navegación queue |
| `seek(time)` | fn | Seek manual |
| `closePlayer()` | fn | Limpia todo |

### MusicLibraryContext (`contexts/MusicLibraryContext.tsx`)
| Estado | Tipo | Descripción |
|--------|------|-------------|
| `songs` | `Song[]` | Todas las canciones (inicial + refetch) |
| `genres` | `Genre[]` | Géneros ordenados |
| `playlists` | `any[]` | Playlists usuario |
| `refetchSongs()` | fn | Re-fetch desde `/api/songs` + `router.refresh()` |
| `fetchPlaylists()` | fn | Fetch `/api/playlists` |

### UserRoleContext (`contexts/UserRoleContext.tsx`)
| Estado | Tipo | Descripción |
|--------|------|-------------|
| `role` | `'guest' \| 'admin'` | Determinado en server (layout.tsx) |
| `setRole()` | fn | Para login/logout |

---

## API Routes (Server)

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/songs` | GET | Público* | Listar canciones (filtros: genre_id, artist, count_only) |
| `/api/songs` | POST | Admin | Crear canción(es) + check duplicados |
| `/api/songs` | DELETE | Admin | Borrar canción + archivo R2 |
| `/api/songs/[id]` | DELETE | Admin | Borrar por ID |
| `/api/genres` | GET | Público | Listar géneros (orden custom) |
| `/api/genres` | POST | Admin | Crear género (idempotente) |
| `/api/playlists` | GET | Público | Listar playlists |
| `/api/playlists` | POST | Admin | Crear playlist + canciones |
| `/api/playlists/[id]` | DELETE | Admin | Borrar playlist |
| `/api/upload` | POST | Admin | Presigned URL R2 + multipart |
| `/api/download` | GET | Admin | ZIP por género/artista |
| `/api/download-all` | GET | Admin | Lista completa para descarga masiva |
| `/api/cleanup-supabase` | GET/DELETE | Admin | Huérfanos R2 vs Supabase |
| `/api/cleanup-supabase/broken-links` | GET/DELETE | Admin | Registros rotos en Supabase |

*Público con RLS habilitado en Supabase.

---

## Base de Datos (Supabase)

### Tablas Principales
```sql
-- profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT DEFAULT 'user',  -- 'admin' | 'user' | 'guest'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- genres
CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#EC4899',
  display_order INT DEFAULT 999,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- songs
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  artist TEXT,
  genre_id UUID REFERENCES genres(id),
  duration INT,  -- segundos
  blob_url TEXT NOT NULL,  -- URL pública R2
  storage_account_number INT DEFAULT 1,  -- 1 o 2 (multi-R2)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- playlists
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  cover_color TEXT DEFAULT '#7C3AED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- playlist_songs
CREATE TABLE playlist_songs (
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  position INT NOT NULL,
  PRIMARY KEY (playlist_id, song_id)
);
```

### RLS (Row Level Security)
- `songs`: SELECT público, INSERT/UPDATE/DELETE solo admin (role check en API)
- `genres`: SELECT público, INSERT solo admin
- `playlists`: SELECT público, INSERT/DELETE solo admin
- `profiles`: SELECT own, UPDATE own

---

## PWA / Service Worker

- **next-pwa** genera `public/sw.js` en build (webpack only; **no Turbopack**)
- `manifest.json` configurado para `display: standalone`, `orientation: portrait-primary`, `categories: ["music","entertainment"]`, icons `purpose: "any maskable"`, shortcuts
- **Service Worker** cachea: HTML, JS, CSS, imágenes, manifest
- **Estrategia**: NetworkFirst para API, CacheFirst para assets estáticos
- **Wake Lock API** (`navigator.wakeLock.request('screen')`) - mantiene CPU/pantalla activa durante reproducción
- **Media Session API** (`navigator.mediaSession`) - controles en lock screen, notificaciones, auriculares BT
  - Metadata: título, artista, artwork (icon-512)
  - Actions: play, pause, previoustrack, nexttrack, seekto
  - Position state actualizado cada 1s
- **Visibility Change Handler** - reanuda audio al volver a foreground, mantiene wake lock en background
- **Requisito:** HTTPS obligatorio (Wake Lock + Media Session + PWA install)
- **Test móvil:** `ngrok http 3000` o `vercel dev` → instalar PWA → abrir desde icono

---

## Despliegue

| Entorno | URL | Notas |
|---------|-----|-------|
| Desarrollo | `localhost:3000` | PWA **habilitado** (`disable: false` en next.config.mjs) |
| Producción | Vercel | HTTPS obligatorio para PWA + Wake Lock + Media Session |
| Preview | Vercel Preview Deployments | Para testear en móvil real (SW se genera aquí) |

**Variables de entorno críticas:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (solo server)
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
CLOUDFLARE_R2_BUCKET_NAME_2 (opcional, 2da cuenta)
CLOUDFLARE_R2_PUBLIC_URL
```

**Testing móvil local:**
```bash
npm run build && npm run start    # Producción local (puerto 3000)
ngrok http 3000                   # Túnel HTTPS → https://xxx.ngrok-free.app
# Abrir en Chrome móvil → Menú → "Instalar app" → Abrir desde icono
```

---

## Problemas Conocidos (Technical Debt)

1. **Layout fetch ALL songs** - Sin paginación, rompe con 10k+ canciones
2. **God Component** - `music-library.tsx` 1000+ líneas, 30+ useState
3. ~~**Audio player duplicado** - Dos `<audio>` elements, race conditions~~ ✅ **FIXED 2026-11-05** - Un solo `<audio>` ref, Wake Lock + Media Session API
4. **Context re-renders** - `contextValue` nuevo cada render
5. **Sin React Query/SWR** - Refetch manual con `router.refresh()`
6. **Admin por email** - Hardcoded `lucidio` en vez de RBAC real
7. **Sin virtualización** - Lag en grids grandes
8. **Sin tests** - 0% coverage
9. **Idiomas mezclados** - ES/EN en código y UI
10. **next-pwa + Turbopack** - No genera SW en build local (solo webpack en Vercel)