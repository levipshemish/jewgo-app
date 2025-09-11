"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { DraftFilters } from '@/lib/filters/filters.types';
import { validateFilters, normalizeFilters } from '@/lib/utils/filterValidation';
import { deduplicatedFetch } from '@/lib/utils/request-deduplication';
import { fetchRestaurants } from '@/lib/api/restaurants';

interface FilterPreviewProps {
  filters: DraftFilters;
  userLocation?: { latitude: number; longitude: number } | null;
  className?: string;
  debounceMs?: number;
}

interface PreviewResult {
  count: number;
  loading: boolean;
  error: string | null;
  hasValidationErrors: boolean;
}

export function FilterPreview({
  filters,
  userLocation,
  className = '',
  debounceMs = 500
}: FilterPreviewProps) {
  const [preview, setPreview] = useState<PreviewResult>({
    count: 0,
    loading: false,
    error: null,
    hasValidationErrors: false
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize validation to prevent infinite re-renders
  const validation = useMemo(() => validateFilters(filters, userLocation), [filters, userLocation]);
  
  // Memoize hasActiveFilters calculation
  const hasActiveFilters = useMemo(() => 
    Object.values(filters).some(value => 
      value !== undefined && value !== null && value !== '' && 
      !(Array.isArray(value) && value.length === 0)
    ), [filters]
  );

  // Debounced preview fetch
  const fetchPreview = useCallback(async () => {
    if (!hasActiveFilters || validation.errors.length > 0) {
      setPreview(prev => ({
        ...prev,
        loading: false,
        error: null,
        hasValidationErrors: validation.errors.length > 0
      }));
      return;
    }

    setPreview(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Use the restaurants API module
      const filters: Record<string, any> = {};
      
      // Normalize filters to use standard field names
      const normalizedFilters = normalizeFilters(filters);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.set('limit', '1'); // Only need count, not actual data
      
      // Add filter parameters
      Object.entries(normalizedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              params.set(key, JSON.stringify(value));
            }
          } else {
            // Special handling for distance: convert miles to meters and use radius_m parameter
            if (key === 'distanceMi' && typeof value === 'number') {
              const radiusMeters = value * 1609.34; // Convert miles to meters
              params.set('radius_m', radiusMeters.toString());
            } else {
              params.set(key, String(value));
            }
          }
        }
      });

      // Add location if available
      if (userLocation) {
        params.set('lat', userLocation.latitude.toString());
        params.set('lng', userLocation.longitude.toString());
      }
      for (const [key, value] of params.entries()) {
        if (key !== 'lat' && key !== 'lng') {
          filters[key] = value;
        }
      }
      
      const location = userLocation ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      } : undefined;
      
      const response = await fetchRestaurants({
        page: 1,
        limit: 50,
        filters,
        location
      });
      
      // Debug: Log the response structure to understand what we're getting
      console.log('FilterPreview response structure:', {
        hasSuccess: 'success' in response,
        hasItems: 'items' in response,
        hasData: 'data' in response,
        responseKeys: Object.keys(response),
        responseType: typeof response,
        isArray: Array.isArray(response)
      });
      
      // Handle different response structures
      let items: any[] = [];
      if (response.success && Array.isArray(response.restaurants)) {
        // Direct response format
        items = response.restaurants;
      } else if (Array.isArray(response)) {
        // Array response format
        items = response;
      } else {
        console.error('Unexpected response format:', response);
        throw new Error('Invalid response format');
      }
      
      setPreview({
        count: items.length,
        loading: false,
        error: null,
        hasValidationErrors: false
      });
    } catch (error) {
      console.error('Error fetching filter preview:', error);
      setPreview({
        count: 0,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load preview',
        hasValidationErrors: false
      });
    }
  }, [filters, userLocation, validation.errors.length, hasActiveFilters]);

  // Debounced effect
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const timeout = setTimeout(fetchPreview, debounceMs);
    debounceTimeoutRef.current = timeout;

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [fetchPreview, debounceMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  if (!hasActiveFilters) {
    return null;
  }

  if (validation.errors.length > 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Please fix validation errors to see preview</span>
      </div>
    );
  }

  if (validation.warnings.length > 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-amber-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Warning: {validation.warnings[0].message}</span>
      </div>
    );
  }

  if (preview.loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking results...</span>
      </div>
    );
  }

  if (preview.error) {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Unable to preview results</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <Users className="w-4 h-4 text-green-600" />
      <span className="text-gray-700">
        <span className="font-medium text-green-600">{preview.count}</span>
        {' '}
        {preview.count === 1 ? 'restaurant' : 'restaurants'} found
      </span>
    </div>
  );
}
