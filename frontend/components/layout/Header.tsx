'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import Logo from '@/components/ui/Logo';

interface HeaderProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  showFilters?: boolean;
  onShowFilters?: () => void;
}

export default function Header({
  onSearch, placeholder = "Find your Eatery", showFilters = true, onShowFilters, }: HeaderProps = {}) {
  const [query, setQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search to prevent excessive API calls
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim() && onSearch) {
        onSearch(searchQuery.trim());
      }
    }, 300); // 300ms debounce delay
  }, [onSearch]);

  // Handle input change with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query.trim());
    }
  };

  return (
    <header className="bg-white shadow-soft border-b border-neutral-200 backdrop-blur-lg bg-white/95 w-full">
      <div className="px-4 py-3 sm:px-6 sm:py-4 lg:py-6">
        <div className="flex items-center space-x-4 lg:space-x-6">
          {/* Search Bar with inline logo */}
          {onSearch && (
            <div className="flex-1 w-full">
              <form onSubmit={handleSubmit} className="relative">
                <div className="relative w-full">
                  {/* Logo - Left side inline with search */}
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 flex items-center space-x-3">
                    {/* Logo Container - Clean logo without heavy shadows */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                      <Logo size="md" variant="dark" className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    
                    {/* Brand Text - Show on all screen sizes for consistent branding */}
                    <div className="block">
                      <h1 
                        className="text-sm sm:text-base lg:text-lg font-bold text-[#292B2D] tracking-wide"
                        style={{ 
                          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                          fontWeight: '700',
                          letterSpacing: '0.025em',
                          fontStyle: 'normal'
                        }}
                      >
                        Jewgo
                      </h1>
                    </div>
                  </div>
                  
                  {/* Search Input - Adjusted padding to accommodate larger logo */}
                  <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full pl-36 sm:pl-52 lg:pl-56 pr-12 sm:pr-14 py-3 sm:py-4 lg:py-5 rounded-2xl sm:rounded-3xl bg-gray-100 text-base sm:text-lg lg:text-xl placeholder-gray-400 focus:outline-none focus:ring-0 focus:bg-gray-100 transition-all duration-200 border-0 font-normal"
                    style={{
                      fontSize: '16px', // Prevents zoom on iOS
                      WebkitAppearance: 'none',
                      touchAction: 'manipulation'
                    }}
                  />
                  
                  {/* Right Side Actions */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center z-10">
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors mr-2"
                        title="Clear search"
                        style={{
                          minHeight: '44px',
                          minWidth: '44px',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    
                    {/* Filters Icon */}
                    {showFilters && onShowFilters && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onShowFilters();
                        }}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                        title="Filters"
                        style={{
                          minHeight: '44px',
                          minWidth: '44px',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        <SlidersHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 