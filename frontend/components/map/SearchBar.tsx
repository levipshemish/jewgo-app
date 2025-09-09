/**
 * Search Bar - Advanced Search Component with Google Places Integration
 * 
 * Restored the sophisticated search bar with autocomplete and place suggestions.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import { onSearchChanged } from '@/services/triggers';
import { googlePlacesAPI } from '@/lib/google/places';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [_isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesApiError, setPlacesApiError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const placesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filters = useLivemapStore((state) => state.filters);

  // Initialize search query from store
  useEffect(() => {
    setQuery(filters.query || '');
  }, [filters.query]);

  // Initialize Google Places services
  useEffect(() => {
    const initializeGooglePlaces = async () => {
      try {
        await googlePlacesAPI.initialize();
        setPlacesApiError(null);
      } catch {
        setPlacesApiError('Failed to initialize Places API');
      }
    };

    initializeGooglePlaces();
  }, []);

  // Debounced search for places
  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setPlaceSuggestions([]);
      return;
    }

    try {
      setIsLoadingPlaces(true);
      setPlacesApiError(null);

      const suggestions = await googlePlacesAPI.getPlacePredictions(searchQuery, {
        types: ['establishment', 'restaurant', 'food'],
        country: 'us'
      });

      setPlaceSuggestions(suggestions || []);
    } catch (error) {
      console.error('Places API error:', error);
      setPlacesApiError('Failed to load suggestions');
      setPlaceSuggestions([]);
    } finally {
      setIsLoadingPlaces(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      onSearchChanged(value);
    }, 300);

    // Clear existing places timeout
    if (placesTimeoutRef.current) {
      clearTimeout(placesTimeoutRef.current);
    }

    // Set new timeout for places search
    placesTimeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 500);
  };

  const handleSuggestionClick = (suggestion: PlaceSuggestion) => {
    setQuery(suggestion.description);
    setShowSuggestions(false);
    onSearchChanged(suggestion.description);
  };

  const handleClearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    onSearchChanged('');
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (query.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow clicking
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (placesTimeoutRef.current) clearTimeout(placesTimeoutRef.current);
    };
  }, []);

  return (
    <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border max-w-md">
      <div className="p-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search restaurants, agencies, or dietary preferences..."
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
          
          {/* Clear button */}
          {query && (
            <button
              onClick={handleClearSearch}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              ✕
            </button>
          )}

          {/* Search icon */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {isLoadingPlaces ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (placeSuggestions.length > 0 || placesApiError) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-30">
            {placesApiError ? (
              <div className="p-3 text-sm text-red-600">{placesApiError}</div>
            ) : (
              placeSuggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {suggestion.structured_formatting.main_text}
                  </div>
                  <div className="text-sm text-gray-500">
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
