"use client"

import { createContext, useContext, useState, type ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { Song, Genre } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface MusicLibraryContextType {
  songs: Song[];
  genres: Genre[];
  playlists: any[];
  refetchSongs: () => Promise<void>;
  fetchPlaylists: () => Promise<void>;
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
  const [songs, setSongs] = useState<Song[]>(Array.isArray(propInitialSongs) ? propInitialSongs : []);
  const [genres, setGenres] = useState<Genre[]>(Array.isArray(propInitialGenres) ? propInitialGenres : []);
  const router = useRouter();

  const [playlists, setPlaylists] = useState<any[]>([]);

  // Update state ONLY when content actually changes
  // Optimization: Move JSON.stringify inside useEffect to avoid calculation on every render
  // Update state when content changes from server (e.g. after refresh)
  // We use a simplified check (length + timestamp/id sum) solely to detect meaningful server changes
  // without triggering expensive JSON.stringify on every render or potential loops.
  useEffect(() => {
    if (propInitialSongs && Array.isArray(propInitialSongs)) {
      setSongs(prev => {
        if (prev === propInitialSongs) return prev;
        if (prev.length === propInitialSongs.length) {
          // Simple heuristic to avoid deep comparison loops:
          // If length is same and first/last IDs match, assume it's the same data to prevent re-render loop
          const prevIds = prev.length > 0 ? prev[0].id + prev[prev.length - 1].id : "";
          const newIds = propInitialSongs.length > 0 ? propInitialSongs[0].id + propInitialSongs[propInitialSongs.length - 1].id : "";
          if (prevIds === newIds) return prev;
        }
        return propInitialSongs;
      });
    }
  }, [propInitialSongs]);

  useEffect(() => {
    if (propInitialGenres && Array.isArray(propInitialGenres)) {
      setGenres(prev => {
        if (prev === propInitialGenres) return prev;
        if (JSON.stringify(prev) === JSON.stringify(propInitialGenres)) return prev;
        return propInitialGenres;
      });
    }
  }, [propInitialGenres]);

  const fetchPlaylists = useCallback(async () => {
    try {
      const response = await fetch('/api/playlists', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch playlists');
      const data = await response.json();
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  }, []);

  // Fetch playlists on mount
  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const refetchSongs = useCallback(async () => {
    try {
      const response = await fetch('/api/songs', { cache: 'no-store' });
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
    playlists,
    refetchSongs,
    fetchPlaylists,
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