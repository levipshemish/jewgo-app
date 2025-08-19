import { Clock, X } from 'lucide-react';
import React from 'react';

interface RecentSearchesProps {
  recentSearches: string[];
  onSearchSelect: (search: string) => void;
  onSearchRemove: (search: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  recentSearches, onSearchSelect, onSearchRemove, onClearAll, className = ''
}) => {
  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
          </div>
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
      
      <div className="py-2">
        {recentSearches.map((search, index) => (
          <div
            key={`${search}-${index}`}
            className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors duration-150"
          >
            <button
              onClick={() => onSearchSelect(search)}
              className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900 truncate"
            >
              {search}
            </button>
            <button
              onClick={() => onSearchRemove(search)}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Remove from recent searches"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 