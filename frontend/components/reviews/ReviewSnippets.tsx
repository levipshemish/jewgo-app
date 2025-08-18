'use client';

import React, { useState } from 'react';
import { User, Calendar, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { StarRating } from '@/components/ui/StarRating';
import { formatDate } from '@/lib/utils/dateUtils';

export interface ReviewSnippet {
  author: string;
  rating: number;
  text: string;
  time: number;
}

interface ReviewSnippetsProps {
  snippets: ReviewSnippet[];
  maxDisplayed?: number;
  className?: string;
  showExpandButton?: boolean;
}

export default function ReviewSnippets({
  snippets, maxDisplayed = 3, className = '', showExpandButton = true
}: ReviewSnippetsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!snippets || snippets.length === 0) {
    return null;
  }

  const displayedSnippets = showAll ? snippets : snippets.slice(0, maxDisplayed);
  const hasMore = snippets.length > maxDisplayed;

  // Using unified date formatting utility

  // Using unified StarRating component

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <Star className="h-4 w-4 text-yellow-400 mr-1" />
          Customer Reviews
        </h3>
        <span className="text-xs text-gray-500">
          {snippets.length} review{snippets.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {displayedSnippets.map((snippet, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
          >
            {/* Review Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {snippet.author}
                  </p>
                  <div className="flex items-center space-x-1">
                    <StarRating rating={snippet.rating} size="sm" />
                    <span className="text-xs text-gray-500 ml-1">
                      {snippet.rating}/5
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(snippet.time)}
              </div>
            </div>

            {/* Review Text */}
            <div className="relative">
              <p
                className={cn(
                  'text-sm text-gray-700 leading-relaxed',
                  !isExpanded && snippet.text.length > 150 && 'line-clamp-3'
                )}
              >
                {snippet.text}
              </p>
              
              {/* Expand/Collapse for long reviews */}
              {snippet.text.length > 150 && showExpandButton && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show more
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && showExpandButton && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-sm text-blue-600 hover:text-blue-800 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4 inline mr-1" />
              Show fewer reviews
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 inline mr-1" />
              Show all {snippets.length} reviews
            </>
          )}
        </button>
      )}

      {/* Average Rating Summary */}
      {snippets.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <StarRating
                  rating={Math.round(
                    snippets.reduce((sum, s) => sum + s.rating, 0) / snippets.length
                  )}
                  size="sm"
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {(
                  snippets.reduce((sum, s) => sum + s.rating, 0) / snippets.length
                ).toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-gray-600">
              Average rating
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
