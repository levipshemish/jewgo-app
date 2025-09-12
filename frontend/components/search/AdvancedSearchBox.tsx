'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, MapPin, Building2, Star } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useDebounce } from '@/lib/hooks/useDebounce';

interface SearchSuggestion {
  text: string;
  type: 'restaurant' | 'city' | 'agency';
  context?: string;
  kosher_type?: string;
}

interface AdvancedSearchBoxProps {
  onSearch: (query: string, filters?: Record<string, unknown>) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  initialQuery?: string;
  showFilters?: boolean;
}

export default function AdvancedSearchBox({
  onSearch, onClear, placeholder = "Search restaurants, cities, or certifying agencies...", className = "", initialQuery = "", showFilters: _showFilters = true
}: AdvancedSearchBoxProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('jewgo_search_history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (_e) {
        // eslint-disable-next-line no-console
        }
    }
  }, []);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
        const response = await fetch(
          `${backendUrl}/api/v5/search/suggest?q=${encodeURIComponent(debouncedQuery)}&limit=8`
        );
        
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.data?.suggestions || []);
        }
      } catch {
        // eslint-disable-next-line no-console
        // // console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      // Add to search history
      const newHistory = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('jewgo_search_history', JSON.stringify(newHistory));
      
      onSearch(query.trim());
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [query, searchHistory, onSearch]);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    onSearch(suggestion.text);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, [onSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (suggestions.length === 0) {return;}

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const picked = suggestions[selectedIndex];
          if (picked) {
            handleSuggestionClick(picked);
          } else {
            handleSearch();
          }
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [suggestions, selectedIndex, handleSearch, handleSuggestionClick]);

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onClear?.();
    inputRef.current?.focus();
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'city':
        return <MapPin className="w-4 h-4 text-green-500" />;
      case 'agency':
        return <Star className="w-4 h-4 text-yellow-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const getKosherTypeColor = (kosherType?: string) => {
    switch (kosherType?.toLowerCase()) {
      case 'dairy':
        return 'bg-blue-100 text-blue-800';
      case 'meat':
        return 'bg-red-100 text-red-800';
      case 'parve':
      case 'pareve':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay hiding suggestions to allow for clicks
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                     bg-white shadow-sm transition-all duration-200
                     placeholder-gray-500 text-gray-900"
        />
        
        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          </button>
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-10 flex items-center">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          >
            {/* Recent Searches */}
            {suggestions.length === 0 && searchHistory.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-1">
                  Recent Searches
                </div>
                {searchHistory.map((item, index) => (
                  <button
                    key={`history-${item}-${index}`}
                    onClick={() => handleSuggestionClick({ text: item, type: 'restaurant' })}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-center space-x-2"
                  >
                    <Search className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{item}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-1">
                  Suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.text}-${index}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center space-x-3 transition-colors ${
                      selectedIndex === index ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 font-medium truncate">
                        {suggestion.text}
                      </div>
                      {suggestion.context && (
                        <div className="text-sm text-gray-500 truncate">
                          {suggestion.context}
                        </div>
                      )}
                    </div>
                    {suggestion.kosher_type && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getKosherTypeColor(suggestion.kosher_type)}`}>
                        {suggestion.kosher_type}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Search Button */}
            {query.trim() && (
              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={handleSearch}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 
                           transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Search &quot;{query}&quot;</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
