'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';


import { useSearchInput, useSearchSuggestions, useRecentSearches } from '@/lib/hooks';
import { SearchSuggestion } from '@/lib/hooks/useSearchSuggestions';

import { RecentSearches } from './RecentSearches';
import { SearchSuggestions } from './SearchSuggestions';

interface SmartSearchProps {
  onSearch: (query: string) => void;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  placeholder?: string;
  className?: string;
  showAdvancedFilters?: boolean;
  useGoogleAPI?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputClassName?: string;
  onVoiceInput?: () => void;
  suggestions?: Array<{ text: string; icon?: string; color?: string }>;
  autoFocus?: boolean;
  debounceMs?: number;
  onFilterClick?: () => void;
}

export default function SmartSearchRefactored({
  onSearch, placeholder = "Search for kosher restaurants, agencies, or locations...", className = "", showAdvancedFilters = true, useGoogleAPI = false, leftIcon, rightIcon, inputClassName, onVoiceInput: _onVoiceInput, suggestions: _customSuggestions, autoFocus = false, debounceMs = 300, onFilterClick
}: SmartSearchProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Custom hooks
  const {
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
  } = useSearchInput({
    onSearch,
    debounceMs,
    autoFocus
  });

  const {
    suggestions,
    setSuggestions,
    isLoadingGoogle,
    setIsLoadingGoogle,
    googleError,
    setGoogleError,
    generateDatabaseSuggestions
  } = useSearchSuggestions();

  const {
    recentSearches,
    saveRecentSearch,
    clearRecentSearches,
    removeRecentSearch
  } = useRecentSearches();

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    suggestion.action();
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, [setSelectedIndex]);

  // Handle search query selection
  const handleSearchSelect = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    onSearch(searchQuery);
    saveRecentSearch(searchQuery);
    setShowSuggestions(false);
  }, [setQuery, onSearch, saveRecentSearch]);

  // Fetch Google Places suggestions
  const fetchGooglePlacesSuggestions = useCallback(async (_query: string) => {
    if (!useGoogleAPI || !_query.trim() || _query.length < 3) {
      return;
    }

    setIsLoadingGoogle(true);
    setGoogleError(null);

    try {
      // const results = await searchGooglePlaces(query);
      const googleSuggestions: SearchSuggestion[] = []; // results.map((place, _index) => ({
      //   id: `google-${place.place_id}`, 
      //   type: 'google_place' as const, 
      //   title: place.name, 
      //   subtitle: place.formatted_address, 
      //   icon: '📍', 
      //   color: 'bg-blue-500', 
      //   action: () => {
      //     if (onLocationSelect) {
      //       // For Google Places, we'd need to get coordinates
      //       // This is a simplified version
      //       onLocationSelect({
      //         lat: 0, // Would need to fetch from Google Places API
      //         lng: 0,
      //         address: place.formatted_address
      //       });
      //     }
      //     handleSearchSelect(place.formatted_address);
      //   },
      //   metadata: place
      // }));

      setSuggestions(googleSuggestions);
    } catch {
      // // console.error('Error fetching Google Places suggestions:', error);
      setGoogleError('Failed to load suggestions');
    } finally {
      setIsLoadingGoogle(false);
    }
  }, [useGoogleAPI, setSuggestions, setIsLoadingGoogle, setGoogleError]);

  // Generate suggestions based on query
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    if (useGoogleAPI) {
      fetchGooglePlacesSuggestions(query);
    } else {
      const databaseSuggestions = generateDatabaseSuggestions(query, handleSearchSelect);
      setSuggestions(databaseSuggestions);
    }
  }, [query, useGoogleAPI, fetchGooglePlacesSuggestions, generateDatabaseSuggestions, handleSearchSelect, setSuggestions]);

  // Handle keyboard navigation
  const handleKeyDownWrapper = useCallback((event: React.KeyboardEvent) => {
    const result = handleKeyDown(event, suggestions.length);
    if (result?.type === 'select-suggestion') {
      const suggestion = suggestions[result.index];
      if (suggestion) {
        handleSuggestionSelect(suggestion);
      }
    } else if (result?.type === 'perform-search') {
      saveRecentSearch(query);
    }
  }, [handleKeyDown, suggestions, handleSuggestionSelect, saveRecentSearch, query]);

  // Handle suggestion hover
  const handleSuggestionHover = useCallback((index: number) => {
    setSelectedIndex(index);
  }, [setSelectedIndex]);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDownWrapper}
            placeholder={placeholder}
            className={`
              w-full px-4 py-3 pl-${leftIcon ? '12' : '4'} pr-${rightIcon || query ? '12' : '4'}
              border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent
              transition-all duration-200 ${inputClassName || ''}
            `}
          />

          {/* Right Icon or Clear Button */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {query ? (
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            ) : rightIcon ? (
              <div className="text-gray-400">{rightIcon}</div>
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Filter Button */}
        {showAdvancedFilters && (
          <button
            onClick={() => {
              setShowFilters(!showFilters);
              onFilterClick?.();
            }}
            className="absolute right-12 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isFocused && (showSuggestions || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="space-y-2">
            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <RecentSearches
                recentSearches={recentSearches}
                onSearchSelect={handleSearchSelect}
                onSearchRemove={removeRecentSearch}
                onClearAll={clearRecentSearches}
              />
            )}

            {/* Search Suggestions */}
            {query && (
              <SearchSuggestions
                suggestions={suggestions}
                selectedIndex={selectedIndex}
                onSuggestionSelect={handleSuggestionSelect}
                onSuggestionHover={handleSuggestionHover}
                isLoading={isLoadingGoogle}
                error={googleError}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
} 