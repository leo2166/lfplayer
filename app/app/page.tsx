import MusicLibrary from "./_components/music-library"

// Los datos de canciones y géneros ahora los carga el layout.tsx
// y los provee a través de MusicLibraryProvider
export default async function AppPage() {
  return <MusicLibrary />
}