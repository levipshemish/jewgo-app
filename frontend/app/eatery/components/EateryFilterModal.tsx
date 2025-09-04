'use client';

import React from 'react';
import { ModernFilterPopup } from '@/components/filters/ModernFilterPopup';
import { AppliedFilters } from '@/lib/filters/filters.types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AppliedFilters) => void;
  initialFilters: AppliedFilters;
  userLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  onRequestLocation: () => void;
};

export default function EateryFilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  initialFilters,
  userLocation,
  locationLoading,
  onRequestLocation,
}: Props) {
  return (
    <ModernFilterPopup
      isOpen={isOpen}
      onClose={onClose}
      onApplyFilters={onApplyFilters}
      initialFilters={initialFilters}
      userLocation={userLocation}
      locationLoading={locationLoading}
      onRequestLocation={onRequestLocation}
      preloadedFilterOptions={null}
    />
  );
}

