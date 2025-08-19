import React from 'react';

import { SearchSuggestion } from '@/lib/hooks/useSearchSuggestions';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  selectedIndex: number;
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
  onSuggestionHover: (index: number) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions, selectedIndex, onSuggestionSelect, onSuggestionHover, isLoading = false, error = null, className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto ${className}`}>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading suggestions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto ${className}`}>
        <div className="p-4 text-center">
          <div className="text-red-500 text-sm mb-2">⚠️</div>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto ${className}`}>
      <div className="py-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            onClick={() => onSuggestionSelect(suggestion)}
            onMouseEnter={() => onSuggestionHover(index)}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-3 ${
              index === selectedIndex ? 'bg-green-50 border-l-4 border-green-500' : ''
            }`}
          >
            {/* Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${suggestion.color}`}>
              {suggestion.icon}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {suggestion.title}
              </div>
              {suggestion.subtitle && (
                <div className="text-xs text-gray-500 truncate">
                  {suggestion.subtitle}
                </div>
              )}
            </div>
            
            {/* Type indicator */}
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              {suggestion.type.replace('_', ' ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}; 