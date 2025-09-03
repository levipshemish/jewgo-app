'use client';

import React from 'react';
import { Star, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ReviewSnippet {
  id: string;
  user_name: string;
  rating: number;
  title?: string;
  content: string;
  created_at: string;
  verified_purchase: boolean;
}

interface ReviewSnippetsProps {
  snippets: ReviewSnippet[];
  maxSnippets?: number;
  showRating?: boolean;
  className?: string;
}

export default function ReviewSnippets({ 
  snippets, 
  maxSnippets = 3,
  showRating = true,
  className = '' 
}: ReviewSnippetsProps) {
  const displaySnippets = snippets.slice(0, maxSnippets);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={cn(
          'w-3 h-3',
          index < rating 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'fill-gray-200 text-gray-200'
        )}
      />
    ));
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength).trim()}...`;
  };

  if (snippets.length === 0) {
    return (
      <div className={cn('text-center py-4', className)}>
        <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {displaySnippets.map((snippet, index) => (
        <div 
          key={snippet.id} 
          className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-gray-200 transition-colors"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-blue-600">
                  {snippet.user_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {snippet.user_name}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(snippet.created_at)}
                </span>
              </div>
            </div>
            
            {showRating && (
              <div className="flex items-center space-x-1">
                {renderStars(snippet.rating)}
                <span className="text-xs text-gray-600 ml-1">
                  {snippet.rating}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-1">
            {snippet.title && (
              <h4 className="text-sm font-medium text-gray-900">
                {truncateText(snippet.title, 60)}
              </h4>
            )}
            
            <p className="text-sm text-gray-700 leading-relaxed">
              {truncateText(snippet.content, 120)}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              {snippet.verified_purchase && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Verified
                </span>
              )}
            </div>
            
            <span className="text-xs text-gray-500">
              {index + 1} of {Math.min(snippets.length, maxSnippets)}
            </span>
          </div>
        </div>
      ))}

      {/* Show More Link */}
      {snippets.length > maxSnippets && (
        <div className="text-center pt-2">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all {snippets.length} reviews
          </button>
        </div>
      )}
    </div>
  );
}
