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
  // Fix: Memoize initial values to prevent infinite re-render loops when props are undefined
  // because creating new [] on every render triggers useEffect.
  const initialSongs = useMemo(() => Array.isArray(propInitialSongs) ? propInitialSongs : [], [propInitialSongs]);
  const initialGenres = useMemo(() => Array.isArray(propInitialGenres) ? propInitialGenres : [], [propInitialGenres]);

  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [genres, setGenres] = useState<Genre[]>(initialGenres);
  const router = useRouter();

  // Update state when initial props change (e.g. after router.refresh())
  useEffect(() => {
    setSongs(initialSongs);
  }, [initialSongs]);

  useEffect(() => {
    setGenres(initialGenres);
  }, [initialGenres]);

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