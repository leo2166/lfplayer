# Preferencia Musical - Guía de Configuración

## Descripción General
Preferencia Musical es una aplicación full-stack para gestionar, organizar y reproducir música. Incluye:

- Autenticación con Supabase
- Almacenamiento de archivos de audio en Vercel Blob
- Organización por géneros
- Sistema de playlists
- Reproductor de música con controles completos
- Diseño responsive para mobile y desktop

## Instalación

### 1. Instalar el Proyecto
\`\`\`bash
npx shadcn-cli@latest init
# o descargar el ZIP desde v0
\`\`\`

### 2. Crear la Base de Datos
Los scripts SQL están en `scripts/`:

1. `001_create_profiles.sql` - Tabla de perfiles de usuario
2. `002_create_genres.sql` - Tabla de géneros
3. `003_create_songs.sql` - Tabla de canciones
4. `004_create_playlists.sql` - Tabla de playlists
5. `005_create_playlist_songs.sql` - Relación M2M playlist-canciones
6. `006_insert_default_genres.sql` - Inserta 10 géneros por defecto
7. `007_create_profile_trigger.sql` - Trigger auto-crear perfil en signup

Ejecuta estos scripts directamente en Supabase dashboard o usa el v0 script runner.

### 3. Verificar Integraciones
Asegúrate de que:
- **Supabase**: Conectado con URLs y keys en variables de entorno
- **Vercel Blob**: Configurado con `BLOB_READ_WRITE_TOKEN`

## Estructura del Proyecto

\`\`\`
app/
├── auth/                  # Páginas de autenticación
│   ├── login/
│   ├── signup/
│   └── check-email/
├── app/                   # Aplicación protegida
│   ├── page.tsx          # Mi Música (inicio)
│   ├── layout.tsx        # Layout con sidebar
│   └── playlists/        # Sistema de playlists
│       ├── page.tsx      # Lista de playlists
│       └── [id]/page.tsx # Detalle de playlist
├── api/                   # API Routes
│   ├── upload/           # Subir archivos a Blob
│   ├── delete/           # Eliminar archivos
│   ├── songs/            # CRUD de canciones
│   ├── genres/           # Obtener géneros
│   └── playlists/        # CRUD de playlists
├── layout.tsx            # Layout raíz
├── page.tsx              # Redirect a /app
└── globals.css           # Estilos globales

components/
├── music-player.tsx      # Reproductor con controles
├── song-card.tsx         # Tarjeta de canción
├── upload-music.tsx      # Formulario de subida
├── genre-filter.tsx      # Filtro por géneros
├── playlist-card.tsx     # Tarjeta de playlist
└── create-playlist-dialog.tsx  # Crear playlist

lib/
└── supabase/
    ├── client.ts         # Cliente browser
    └── server.ts         # Cliente server

middleware.ts            # Protección de rutas
\`\`\`

## Características

### Autenticación
- Registro con confirmación de email
- Login seguro
- Middleware que protege rutas `/app`

### Gestión de Música
- Subir archivos MP3/WAV/FLAC a Vercel Blob
- Organizar por 10 géneros predeterminados
- Ver duración de canciones
- Eliminar canciones (también de Blob)

### Reproductor
- Play/Pause
- Anterior/Siguiente
- Barra de progreso draggable
- Control de volumen
- Mostrar tiempo actual y duración
- Auto-avance a siguiente canción

### Playlists
- Crear playlists con nombre y descripción
- Seleccionar color de portada
- Agregar/remover canciones
- Ver canciones por playlist
- Reproductor por playlist
- Eliminar playlists

### Responsive
- Sidebar colapsable en mobile
- Grillas adaptables (1/2/3 columnas)
- Reproductor optimizado para touch
- Header sticky

## Variables de Entorno
(Ya están configuradas automáticamente por las integraciones)

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
POSTGRES_URL=
BLOB_READ_WRITE_TOKEN=
\`\`\`

## Diseño
- **Tema**: Gradiente púrpura a rosa
- **Paleta**: 
  - Primario: Púrpura (#7C3AED)
  - Secundario: Rosa (#EC4899)
  - Acentos: Múltiples colores para géneros
  - Neutros: Grises y blancos
- **Tipografía**: Geist (sans-serif) y Geist Mono
- **Responsive**: Mobile-first con breakpoints md y lg

## Próximas Mejoras Sugeridas
1. Reporte de reproducción (última canción escuchada)
2. Búsqueda y filtrado avanzado
3. Editar información de canciones/playlists
4. Importar canciones desde YouTube
5. Compartir playlists
6. Estadísticas de reproducción

## Soporte
Si necesitas ayuda, abre un ticket en: https://vercel.com/help
