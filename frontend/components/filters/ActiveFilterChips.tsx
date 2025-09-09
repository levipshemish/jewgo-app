"use client";

import React from 'react';
import { X, MapPin, Clock, Star, DollarSign, Search, Building, Tag } from 'lucide-react';
import { AppliedFilters, DraftFilters } from '@/lib/filters/filters.types';
import { getFilterDescription, getCanonicalDistance } from '@/lib/utils/filterValidation';

interface ActiveFilterChipsProps {
  filters: AppliedFilters | DraftFilters;
  onRemoveFilter: (filterKey: string) => void;
  onClearAll: () => void;
  className?: string;
  showClearAll?: boolean;
  variant?: 'compact' | 'full';
}

export function ActiveFilterChips({
  filters,
  onRemoveFilter,
  onClearAll,
  className = '',
  showClearAll = true,
  variant = 'full'
}: ActiveFilterChipsProps) {
  const activeFilters = getActiveFilterEntries(filters);
  const hasFilters = activeFilters.length > 0;

  if (!hasFilters) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {activeFilters.map(([key, value]) => (
        <FilterChip
          key={key}
          filterKey={key}
          value={value}
          onRemove={() => onRemoveFilter(key)}
          variant={variant}
        />
      ))}
      {showClearAll && activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          Clear All
        </button>
      )}
    </div>
  );
}

function FilterChip({
  filterKey,
  value,
  onRemove,
  variant
}: {
  filterKey: string;
  value: any;
  onRemove: () => void;
  variant: 'compact' | 'full';
}) {
  const { icon: Icon, label, color } = getFilterChipInfo(filterKey, value);

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${color}`}>
      <Icon className="w-3 h-3" />
      <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>{label}</span>
      <button
        onClick={onRemove}
        className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function getActiveFilterEntries(filters: AppliedFilters | DraftFilters): Array<[string, any]> {
  const entries: Array<[string, any]> = [];

  // Search query
  if (filters.q) {
    entries.push(['q', filters.q]);
  }

  // Category
  if (filters.category) {
    entries.push(['category', filters.category]);
  }

  // Agency
  if (filters.agency) {
    entries.push(['agency', filters.agency]);
  }

  // Distance (use canonical distance)
  const distance = getCanonicalDistance(filters);
  if (distance) {
    entries.push(['distance', distance]);
  }

  // Price range
  if (filters.priceRange) {
    entries.push(['priceRange', filters.priceRange]);
  }

  // Rating
  if (filters.ratingMin) {
    entries.push(['ratingMin', filters.ratingMin]);
  }

  // Hours filter
  if (filters.hoursFilter) {
    entries.push(['hoursFilter', filters.hoursFilter]);
  }

  // Open now
  if (filters.openNow) {
    entries.push(['openNow', filters.openNow]);
  }

  return entries;
}

function getFilterChipInfo(filterKey: string, value: any): {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
} {
  switch (filterKey) {
    case 'q':
      return {
        icon: Search,
        label: `"${value}"`,
        color: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      };
    case 'category':
      return {
        icon: Tag,
        label: value,
        color: 'bg-green-100 text-green-800 hover:bg-green-200'
      };
    case 'agency':
      return {
        icon: Building,
        label: value,
        color: 'bg-purple-100 text-purple-800 hover:bg-purple-200'
      };
    case 'distance':
      return {
        icon: MapPin,
        label: `Within ${value} mi`,
        color: 'bg-orange-100 text-orange-800 hover:bg-orange-200'
      };
    case 'priceRange':
      const [min, max] = value;
      const priceSymbols = ['$', '$$', '$$$', '$$$$'];
      const label = min === max 
        ? priceSymbols[min - 1] 
        : `${priceSymbols[min - 1]} - ${priceSymbols[max - 1]}`;
      return {
        icon: DollarSign,
        label,
        color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      };
    case 'ratingMin':
      return {
        icon: Star,
        label: `${value}+ stars`,
        color: 'bg-amber-100 text-amber-800 hover:bg-amber-200'
      };
    case 'hoursFilter':
      const hourLabels: Record<string, string> = {
        openNow: 'Open Now',
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening',
        lateNight: 'Late Night'
      };
      return {
        icon: Clock,
        label: hourLabels[value] || value,
        color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
      };
    case 'openNow':
      return {
        icon: Clock,
        label: 'Open Now',
        color: 'bg-green-100 text-green-800 hover:bg-green-200'
      };
    default:
      return {
        icon: Tag,
        label: String(value),
        color: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      };
  }
}
