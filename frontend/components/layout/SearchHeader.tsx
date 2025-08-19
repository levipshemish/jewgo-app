'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import React, { useState } from 'react';

interface SearchHeaderProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  showFilters?: boolean;
  onShowFilters?: () => void;
}

export default function SearchHeader({
  onSearch, placeholder = "Find your Eatery", showFilters = true, onShowFilters, }: SearchHeaderProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="bg-white px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="max-w-md sm:max-w-lg lg:max-w-xl mx-auto">
        {/* Search Bar matching reference */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative w-full">
            {/* Search Icon - Left side */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            
            {/* Search Input - Larger and matching reference */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-14 pr-14 py-4 lg:py-5 rounded-3xl bg-gray-100 text-lg lg:text-xl placeholder-gray-400 focus:outline-none focus:ring-0 focus:bg-gray-100 transition-all duration-200 border-0 font-normal"
            />
            
            {/* Right Side Actions */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center z-10">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors mr-2"
                  title="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              
              {/* Filters Icon - Three horizontal lines with circles */}
              {showFilters && onShowFilters && (
                <button
                  type="button"
                  onClick={onShowFilters}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                  title="Filters"
                >
                  <SlidersHorizontal className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 