'use client';

import React from 'react';

type Props = {
  show: boolean;
};

export default function LocationBanner({ show }: Props) {
  if (!show) return null;
  return (
    <div className="max-w-7xl mx-auto flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm text-green-800 font-medium">
          Restaurants sorted by distance from you
        </span>
      </div>
    </div>
  );
}

