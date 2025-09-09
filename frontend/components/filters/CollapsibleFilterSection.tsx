"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleFilterSectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  compact?: boolean;
}

export function CollapsibleFilterSection({
  title,
  icon: Icon,
  children,
  defaultExpanded = true,
  className = '',
  compact = false
}: CollapsibleFilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-600" />}
          <span className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
            {title}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
