'use client';

import React from 'react';

type Props = {
  shown: number;
  total: number;
  showMoreHint: boolean;
};

export default function StatusInfo({ shown, total, showMoreHint }: Props) {
  return (
    <div className="text-center text-sm text-gray-600 py-4" aria-live="polite">
      Showing {shown} of {total} restaurants
      {showMoreHint && (
        <span className="ml-2">• Scroll to load more</span>
      )}
    </div>
  );
}

