"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { DraftFilters } from '@/lib/filters/filters.types';
import { validateFilters, normalizeFilters } from '@/lib/utils/filterValidation';
// import { deduplicatedFetch } from '@/lib/utils/request-deduplication';
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

  // Normalize filters once and create a stable signature to trigger preview updates
  const normalizedFilters = useMemo(() => normalizeFilters(filters as any), [filters]);
  
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
      // Build location payload (fetchRestaurants will attach radius if present)
      const location = userLocation
        ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
        : undefined;

      // For distance sorting, we need to ensure the backend properly calculates the total count
      // by using the same sorting parameters as the main grid
      const previewFilters = { ...normalizedFilters } as any;
      
      // Map frontend filter names to API parameter names (same as EateryGrid)
      if (previewFilters.q && previewFilters.q.trim()) {
        previewFilters.search = previewFilters.q.trim();
        delete previewFilters.q; // Remove the frontend field name
      }
      
      if (previewFilters.category) {
        previewFilters.kosher_category = previewFilters.category;
        delete previewFilters.category; // Remove the frontend field name
      }
      
      // Map price range to separate min/max fields
      if (previewFilters.priceRange && Array.isArray(previewFilters.priceRange)) {
        const [min, max] = previewFilters.priceRange;
        if (min) previewFilters.price_min = min.toString();
        if (max) previewFilters.price_max = max.toString();
        delete previewFilters.priceRange; // Remove the frontend field name
      }
      
      
      // If user location is available, ensure distance sorting is applied for accurate count
      if (userLocation) {
        previewFilters.sort = 'distance_asc';
      }
      
      // Ensure distance filter is properly converted to radius (same as main API)
      const distanceMi = previewFilters.distanceMi;
      if (userLocation && distanceMi) {
        const radiusKm = Number(distanceMi) * 1.60934;
        previewFilters.radius = radiusKm.toString();
      }

      // Debug: Log the filters being sent to the API
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 FilterPreview final filters being sent:', previewFilters);
      }

      // Ask backend for count by requesting minimal page
      
      const response = await fetchRestaurants({
        page: 1,
        limit: 1, // Only need count; backend returns total_count
        filters: previewFilters,
        location,
        includeFilterOptions: false,
      });
      
      // Debug: Log the response structure to understand what we're getting
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 FilterPreview response total_count:', (response as any).total_count);
      }
      
      // Handle different response structures
      // Prefer backend-provided total_count when available
      const total = (response as any).total_count ?? (response as any).totalRestaurants ?? (response.restaurants?.length || 0);


      setPreview({
        count: Number(total) || 0,
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
  }, [userLocation, validation.errors.length, hasActiveFilters, normalizedFilters]);

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
