import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import { FilterState, FilterValue } from '@/lib/filters/filters.types';
import { Restaurant } from '@/lib/types/restaurant';

interface UseOptimizedFiltersOptions {
  debounceMs?: number;
  enableMemoization?: boolean;
  enableServerSideFiltering?: boolean;
  maxClientSideItems?: number;
  enableDraftMode?: boolean; // New: Enable draft filters that don't apply immediately
}

interface UseOptimizedFiltersReturn {
  activeFilters: FilterState;
  draftFilters: FilterState; // New: Draft filters that haven't been applied yet
  hasActiveFilters: boolean;
  hasDraftFilters: boolean; // New: Check if there are unapplied draft filters
  setFilter: (filterType: keyof FilterState, value: FilterValue) => void;
  setDraftFilter: (filterType: keyof FilterState, value: FilterValue) => void; // New: Set draft filter
  toggleFilter: (filterType: keyof FilterState) => void;
  toggleDraftFilter: (filterType: keyof FilterState) => void; // New: Toggle draft filter
  clearFilter: (filterType: keyof FilterState) => void;
  clearDraftFilter: (filterType: keyof FilterState) => void; // New: Clear draft filter
  clearAllFilters: () => void;
  clearAllDraftFilters: () => void; // New: Clear all draft filters
  applyDraftFilters: () => void; // New: Apply draft filters to active filters
  discardDraftFilters: () => void; // New: Discard draft filters
  getFilterCount: () => number;
  getDraftFilterCount: () => number; // New: Get count of draft filters
  applyFilters: (restaurants: Restaurant[]) => Restaurant[];
  applyDraftFiltersToData: (restaurants: Restaurant[]) => Restaurant[]; // New: Apply draft filters to data for preview
  getFilteredCount: () => number;
  isFiltering: boolean;
  filterPerformance: {
    lastFilterTime: number;
    averageFilterTime: number;
    filterCount: number;
  };
}

// Pre-compiled filter functions for better performance
const FILTER_FUNCTIONS = {
  search: (restaurant: Restaurant, query: string) => {
    const searchQuery = query.toLowerCase().trim();
    return (
      restaurant.name?.toLowerCase().includes(searchQuery) ||
      restaurant.address?.toLowerCase().includes(searchQuery) ||
      restaurant.city?.toLowerCase().includes(searchQuery) ||
      restaurant.state?.toLowerCase().includes(searchQuery) ||
      restaurant.listing_type?.toLowerCase().includes(searchQuery) ||
      restaurant.certifying_agency?.toLowerCase().includes(searchQuery)
    );
  },

  agency: (restaurant: Restaurant, agency: string) => {
    return restaurant.certifying_agency?.toLowerCase().includes(agency.toLowerCase()) || false;
  },

  dietary: (restaurant: Restaurant, dietary: string) => {
    const kosherCategory = restaurant.kosher_category?.toLowerCase() || '';
    switch (dietary) {
      case 'meat': return kosherCategory === 'meat';
      case 'dairy': return kosherCategory === 'dairy';
      case 'pareve': return kosherCategory === 'pareve';
      default: return true;
    }
  },

  category: (restaurant: Restaurant, category: string) => {
    return restaurant.listing_type?.toLowerCase().includes(category.toLowerCase()) || false;
  },

  nearMe: (restaurant: Restaurant, userLocation: { latitude: number; longitude: number }, maxDistance: number) => {
    if (!restaurant.latitude || !restaurant.longitude) {
      return false;
    }
    
    // Optimized distance calculation using Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = (restaurant.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (restaurant.longitude - userLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(restaurant.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance <= maxDistance;
  },

  openNow: (restaurant: Restaurant) => {
    if (!restaurant.hours_of_operation) {
      return false;
    }
    
    try {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const hours = typeof restaurant.hours_of_operation === 'string'
        ? JSON.parse(restaurant.hours_of_operation)
        : restaurant.hours_of_operation;
      
      if (!Array.isArray(hours)) {
        return false;
      }
      
      const todayHours = hours.find((h: any) => h.day === currentDay);
      if (!todayHours) {
        return false;
      }
      
      const openTime = timeToMinutes(todayHours.open);
      const closeTime = timeToMinutes(todayHours.close);
      
      if (openTime === -1 || closeTime === -1) {
        return false;
      }
      
      // Handle past midnight
      if (closeTime < openTime) {
        return currentTime >= openTime || currentTime <= closeTime;
      } else {
        return currentTime >= openTime && currentTime <= closeTime;
      }
    } catch {
      return false;
    }
  }
};

// Helper function to convert time string to minutes
const timeToMinutes = (timeStr: string): number => {
  const time = timeStr.toLowerCase().trim();
  const match = time.match(/(\d+):?(\d*)\s*(am|pm)/);
  
  if (!match || !match[1] || !match[3]) {
    return -1;
  }
  
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3];
  
  if (period === 'pm' && hours !== 12) {
    hours += 12;
  }
  if (period === 'am' && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
};

export const useOptimizedFilters = (
  initialFilters: FilterState = {},
  options: UseOptimizedFiltersOptions = {}
): UseOptimizedFiltersReturn => {
  const {
    debounceMs = 300,
    enableMemoization = true,
    enableServerSideFiltering = false,
    maxClientSideItems = 1000,
    enableDraftMode = true // Default to draft mode for better UX
  } = options;

  const [activeFilters, setActiveFilters] = useState<FilterState>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<FilterState>({}); // New: Draft filters state
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterPerformance, setFilterPerformance] = useState({
    lastFilterTime: 0,
    averageFilterTime: 0,
    filterCount: 0
  });

  const debounceRef = useRef<NodeJS.Timeout>();
  const performanceRef = useRef<number[]>([]);

  // Memoized filter state
  const hasActiveFilters = useMemo(() => {
    return Object.values(activeFilters).some(filter => 
      filter !== undefined && filter !== false && filter !== ''
    );
  }, [activeFilters]);

  // New: Check if there are draft filters
  const hasDraftFilters = useMemo(() => {
    return Object.values(draftFilters).some(filter => 
      filter !== undefined && filter !== false && filter !== ''
    );
  }, [draftFilters]);

  // Debounced filter setter (for immediate filters)
  const setFilter = useCallback((filterType: keyof FilterState, value: FilterValue) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setActiveFilters(prev => ({
        ...prev,
        [filterType]: value,
      }));
    }, debounceMs);
  }, [debounceMs]);

  // New: Set draft filter (doesn't apply immediately)
  const setDraftFilter = useCallback((filterType: keyof FilterState, value: FilterValue) => {
    setDraftFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  }, []);

  const toggleFilter = useCallback((filterType: keyof FilterState) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType],
    }));
  }, []);

  // New: Toggle draft filter
  const toggleDraftFilter = useCallback((filterType: keyof FilterState) => {
    setDraftFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType],
    }));
  }, []);

  const clearFilter = useCallback((filterType: keyof FilterState) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterType];
      return newFilters;
    });
  }, []);

  // New: Clear draft filter
  const clearDraftFilter = useCallback((filterType: keyof FilterState) => {
    setDraftFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterType];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  // New: Clear all draft filters
  const clearAllDraftFilters = useCallback(() => {
    setDraftFilters({});
  }, []);

  // New: Apply draft filters to active filters
  const applyDraftFilters = useCallback(() => {
    setActiveFilters(prev => ({
      ...prev,
      ...draftFilters
    }));
    setDraftFilters({}); // Clear draft filters after applying
  }, [draftFilters]);

  // New: Discard draft filters
  const discardDraftFilters = useCallback(() => {
    setDraftFilters({});
  }, []);

  const getFilterCount = useCallback(() => {
    return Object.values(activeFilters).filter(filter => 
      filter !== undefined && filter !== false && filter !== ''
    ).length;
  }, [activeFilters]);

  // New: Get count of draft filters
  const getDraftFilterCount = useCallback(() => {
    return Object.values(draftFilters).filter(filter => 
      filter !== undefined && filter !== false && filter !== ''
    ).length;
  }, [draftFilters]);

  // Optimized filter application with performance tracking (for active filters)
  const applyFilters = useCallback((restaurants: Restaurant[]) => {
    const startTime = performance.now();
    setIsFiltering(true);

    try {
      let filtered = [...restaurants];

      // Apply search query filter
      if (activeFilters.searchQuery?.trim()) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.search(restaurant, activeFilters.searchQuery!)
        );
      }

      // Apply agency filter
      if (activeFilters.agency) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.agency(restaurant, activeFilters.agency!)
        );
      }

      // Apply dietary filter
      if (activeFilters.dietary) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.dietary(restaurant, activeFilters.dietary!)
        );
      }

      // Apply category filter
      if (activeFilters.category) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.category(restaurant, activeFilters.category!)
        );
      }

      // Apply "near me" filter
      if (activeFilters.nearMe && activeFilters.userLocation) {
        const maxDistance = activeFilters.maxDistance ?? 10;
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.nearMe(restaurant, activeFilters.userLocation!, maxDistance)
        );
      }

      // Apply "open now" filter
      if (activeFilters.openNow) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.openNow(restaurant)
        );
      }

      // Sort by distance if user location is available
      if (activeFilters.userLocation) {
        filtered.sort((a, b) => {
          if (!a.latitude || !a.longitude) {
            return 1;
          }
          if (!b.latitude || !b.longitude) {
            return -1;
          }

          const distanceA = FILTER_FUNCTIONS.nearMe(a, activeFilters.userLocation!, Infinity) ? 0 : Infinity;
          const distanceB = FILTER_FUNCTIONS.nearMe(b, activeFilters.userLocation!, Infinity) ? 0 : Infinity;

          return distanceA - distanceB;
        });
      }

      const endTime = performance.now();
      const filterTime = endTime - startTime;

      // Update performance metrics
      performanceRef.current.push(filterTime);
      if (performanceRef.current.length > 10) {
        performanceRef.current.shift();
      }

      const averageTime = performanceRef.current.reduce((a, b) => a + b, 0) / performanceRef.current.length;

      setFilterPerformance({
        lastFilterTime: filterTime,
        averageFilterTime: averageTime,
        filterCount: performanceRef.current.length
      });

      return filtered;
    } finally {
      setIsFiltering(false);
    }
  }, [activeFilters]);

  // New: Apply draft filters to data for preview
  const applyDraftFiltersToData = useCallback((restaurants: Restaurant[]) => {
    const startTime = performance.now();

    try {
      let filtered = [...restaurants];

      // Combine active and draft filters for preview
      const previewFilters = { ...activeFilters, ...draftFilters };

      // Apply search query filter
      if (previewFilters.searchQuery?.trim()) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.search(restaurant, previewFilters.searchQuery!)
        );
      }

      // Apply agency filter
      if (previewFilters.agency) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.agency(restaurant, previewFilters.agency!)
        );
      }

      // Apply dietary filter
      if (previewFilters.dietary) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.dietary(restaurant, previewFilters.dietary!)
        );
      }

      // Apply category filter
      if (previewFilters.category) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.category(restaurant, previewFilters.category!)
        );
      }

      // Apply "near me" filter
      if (previewFilters.nearMe && previewFilters.userLocation) {
        const maxDistance = previewFilters.maxDistance ?? 10;
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.nearMe(restaurant, previewFilters.userLocation!, maxDistance)
        );
      }

      // Apply "open now" filter
      if (previewFilters.openNow) {
        filtered = filtered.filter(restaurant => 
          FILTER_FUNCTIONS.openNow(restaurant)
        );
      }

      // Sort by distance if user location is available
      if (previewFilters.userLocation) {
        filtered.sort((a, b) => {
          if (!a.latitude || !a.longitude) {
            return 1;
          }
          if (!b.latitude || !b.longitude) {
            return -1;
          }

          const distanceA = FILTER_FUNCTIONS.nearMe(a, previewFilters.userLocation!, Infinity) ? 0 : Infinity;
          const distanceB = FILTER_FUNCTIONS.nearMe(b, previewFilters.userLocation!, Infinity) ? 0 : Infinity;

          return distanceA - distanceB;
        });
      }

      return filtered;
    } finally {
      // Don't update performance metrics for draft previews
    }
  }, [activeFilters, draftFilters]);

  const getFilteredCount = useCallback(() => {
    // This would be updated by the component using this hook
    return 0;
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    activeFilters,
    draftFilters,
    hasActiveFilters,
    hasDraftFilters,
    setFilter,
    setDraftFilter,
    toggleFilter,
    toggleDraftFilter,
    clearFilter,
    clearDraftFilter,
    clearAllFilters,
    clearAllDraftFilters,
    applyDraftFilters,
    discardDraftFilters,
    getFilterCount,
    getDraftFilterCount,
    applyFilters,
    applyDraftFiltersToData,
    getFilteredCount,
    isFiltering,
    filterPerformance
  };
};
