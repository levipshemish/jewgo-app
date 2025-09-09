"use client"

import React from 'react'

interface EateryGridSkeletonProps {
  count?: number
  showBackendError?: boolean
}

export default function EateryGridSkeleton({ 
  count = 8, 
  showBackendError = false 
}: EateryGridSkeletonProps) {
  return (
    <div className="px-4 py-4">
      {/* Backend Status Indicator Skeleton */}
      {showBackendError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md animate-pulse">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 bg-yellow-300 rounded"></div>
            </div>
            <div className="ml-3 flex-1">
              <div className="h-4 bg-yellow-200 rounded w-48 mb-2"></div>
              <div className="h-3 bg-yellow-200 rounded w-64"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Grid Layout Skeleton - Using 2-column layout as per project requirements */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
            {/* Image skeleton - matching Card component aspect ratio */}
            <div className="relative aspect-[4/3] bg-gray-200">
              {/* Image tag skeleton */}
              <div className="absolute top-2 left-2 w-16 h-5 bg-gray-300 rounded-full"></div>
              
              {/* Heart button skeleton */}
              <div className="absolute top-2 right-2 w-6 h-6 bg-gray-300 rounded-full"></div>
              
              {/* Rating badge skeleton */}
              <div className="absolute bottom-2 right-2 w-12 h-5 bg-gray-300 rounded-lg"></div>
            </div>
            
            {/* Content skeleton - matching Card component structure */}
            <div className="p-3 space-y-2">
              {/* Title and rating row */}
              <div className="flex justify-between items-start gap-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-8"></div>
              </div>
              
              {/* Subtitle and additional text row */}
              <div className="flex justify-between items-center gap-3">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
