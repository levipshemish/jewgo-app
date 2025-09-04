'use client';

import React from 'react';
import { Header } from '@/components/layout';

type Props = {
  message: string;
  onSearch: (q: string) => void;
  onShowFilters: () => void;
  onRetry: () => void;
};

export default function ErrorState({ message, onSearch, onShowFilters, onRetry }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 eatery-page">
      <Header 
        onSearch={onSearch}
        placeholder="Search restaurants..."
        showFilters={true}
        onShowFilters={onShowFilters}
      />
      
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Restaurants</h2>
        <p className="text-gray-600 text-center mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

