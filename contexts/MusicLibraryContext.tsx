"use client"

import { createContext, useContext, useState, type ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { Song, Genre } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface MusicLibraryContextType {
  songs: Song[];
  genres: Genre[];
  refetchSongs: () => Promise<void>;
}

const MusicLibraryContext = createContext<MusicLibraryContextType | undefined>(undefined);

export function MusicLibraryProvider({
  children,
  initialSongs: propInitialSongs,
  initialGenres: propInitialGenres,
}: {
  children: ReactNode;
  initialSongs: Song[] | undefined;
  initialGenres: Genre[] | undefined;
}) {
  // Fix: Use JSON.stringify to compare content, not references.
  // router.refresh() creates new array references even if data is same.
  // This prevents infinite loops.
  const songsHash = JSON.stringify(propInitialSongs || []);
  const genresHash = JSON.stringify(propInitialGenres || []);

  const [songs, setSongs] = useState<Song[]>(Array.isArray(propInitialSongs) ? propInitialSongs : []);
  const [genres, setGenres] = useState<Genre[]>(Array.isArray(propInitialGenres) ? propInitialGenres : []);
  const router = useRouter();

  // Update state ONLY when content actually changes
  useEffect(() => {
    if (propInitialSongs && Array.isArray(propInitialSongs)) {
      setSongs(propInitialSongs);
    }
  }, [songsHash]); // Depend on the HASH/String, not the array reference

  useEffect(() => {
    if (propInitialGenres && Array.isArray(propInitialGenres)) {
      setGenres(propInitialGenres);
    }
  }, [genresHash]);

  const refetchSongs = useCallback(async () => {
    try {
      const response = await fetch('/api/songs');
      if (!response.ok) {
        throw new Error('Failed to refetch songs');
      }
      const data = await response.json();
      setSongs(data.songs);
      router.refresh(); // Force a re-render of server components
    } catch (error) {
      // It's better to handle this with a user-facing notification
      // For now, we'll just log to avoid breaking the app
      console.error("Error refetching songs:", error);
    }
  }, []);

  const contextValue = {
    songs,
    genres,
    refetchSongs,
  };

  return (
    <MusicLibraryContext.Provider value={contextValue}>
      {children}
    </MusicLibraryContext.Provider>
  );
}

export function useMusicLibrary() {
  const context = useContext(MusicLibraryContext);
  if (context === undefined) {
    throw new Error('useMusicLibrary must be used within a MusicLibraryProvider');
  }
  return context;
}