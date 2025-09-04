"use client";

import React from 'react';

export default function EaterySkeletonGrid({ count = 12 }: { count?: number }) {
  const items = Array.from({ length: count });
  return (
    <div className="restaurant-grid px-2 sm:px-4 lg:px-6" aria-hidden="true">
      {items.map((_, i) => (
        <div key={i} className="w-full">
          <div className="w-full rounded-lg bg-gray-100 overflow-hidden animate-pulse">
            <div className="h-40 sm:h-48 md:h-56 bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

