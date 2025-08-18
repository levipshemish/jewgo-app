import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface UseSearchInputProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
  autoFocus?: boolean;
}

export const useSearchInput = ({ onSearch, debounceMs = 300, autoFocus = false }: UseSearchInputProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced search
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        onSearch(searchQuery.trim());
      }
    }, debounceMs);
  }, [onSearch, debounceMs]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Handle input blur
  const handleBlur = useCallback(() => {
    // Delay blur to allow for suggestion clicks
    setTimeout(() => {
      setIsFocused(false);
      setSelectedIndex(-1);
    }, 150);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, maxIndex: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, maxIndex - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0) {
          // Trigger suggestion selection
          return { type: 'select-suggestion' as const, index: selectedIndex };
        } else if (query.trim()) {
          // Perform search
          onSearch(query.trim());
          return { type: 'perform-search' as const };
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsFocused(false);
        setSelectedIndex(-1);
        break;
    }
    return null;
  }, [query, selectedIndex, onSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setSelectedIndex(-1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    isFocused,
    selectedIndex,
    setSelectedIndex,
    inputRef,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleKeyDown,
    clearSearch
  };
}; 