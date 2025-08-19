import { useState, useCallback, useEffect } from 'react';

export const useRecentSearches = (maxSearches: number = 5) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('jewgo-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // // console.error('Error loading recent searches:', error);
        // Clear corrupted data
        localStorage.removeItem('jewgo-recent-searches');
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((search: string) => {
    if (!search.trim()) {return;}
    
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, maxSearches);
    setRecentSearches(updated);
    
    try {
      localStorage.setItem('jewgo-recent-searches', JSON.stringify(updated));
    } catch {
      // // console.error('Error saving recent searches:', error);
    }
  }, [recentSearches, maxSearches]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('jewgo-recent-searches');
    } catch {
      // // console.error('Error clearing recent searches:', error);
    }
  }, []);

  // Remove a specific search
  const removeRecentSearch = useCallback((search: string) => {
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    
    try {
      localStorage.setItem('jewgo-recent-searches', JSON.stringify(updated));
    } catch {
      // // console.error('Error removing recent search:', error);
    }
  }, [recentSearches]);

  return {
    recentSearches,
    saveRecentSearch,
    clearRecentSearches,
    removeRecentSearch
  };
}; 