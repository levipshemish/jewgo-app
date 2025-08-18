'use client';

import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface MobileSearchHeaderProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  showFilters?: boolean;
  onShowFilters?: () => void;
}

export default function MobileSearchHeader({
  onSearch, placeholder = "Find your Eatery", showFilters = true, onShowFilters, }: MobileSearchHeaderProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="w-full">
        {/* Mobile Search Bar */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative w-full">
            {/* Search Icon - Left-aligned */}
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10">
              <Search size={18} />
            </div>
            
            {/* Search Input */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all duration-200 hover:bg-gray-50 border-0"
            />
            
            {/* Right Side Actions */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 z-10">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              
              {/* Filters Icon */}
              {showFilters && onShowFilters && (
                <button
                  type="button"
                  onClick={onShowFilters}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Filters"
                >
                  <SlidersHorizontal size={16} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 