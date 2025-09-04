'use client';

import React from 'react';

type Props = {
  shown: number;
  total: number;
  showMoreHint: boolean;
  loading?: boolean;
};

export default function StatusInfo({ shown, total, showMoreHint, loading = false }: Props) {
  return (
    <div 
      className="text-center text-sm text-gray-600 py-4" 
      role="status" 
      aria-live="polite"
      aria-label={`Showing ${shown} of ${total} restaurants`}
    >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500" aria-hidden="true"></div>
          <span>Loading...</span>
        </div>
      ) : (
        <>
          <span>Showing {shown} of {total} restaurants</span>
          {showMoreHint && (
            <span className="ml-2">• Scroll to load more</span>
          )}
        </>
      )}
    </div>
  );
}

