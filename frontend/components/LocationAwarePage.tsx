/**
 * LocationAwarePage Component
 * 
 * A higher-order component that provides location functionality to any page.
 * This component handles location permission prompts and provides location
 * utilities to child components.
 */

'use client';

import React, { ReactNode } from 'react';
import { LocationProvider } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { useLocation } from '@/lib/contexts/LocationContext';

interface LocationAwarePageProps {
  children: ReactNode;
  /** Whether to show location permission prompt */
  showLocationPrompt?: boolean;
  /** Custom location prompt component */
  locationPromptComponent?: ReactNode;
  /** Whether to require location for the page to function */
  requireLocation?: boolean;
}

/**
 * Inner component that uses location context
 */
function LocationAwareContent({
  children,
  showLocationPrompt = true,
  locationPromptComponent,
  requireLocation = false
}: LocationAwarePageProps) {
  const {
    userLocation,
    permissionStatus: _permissionStatus,
    isLoading,
    requestLocation,
    shouldShowPopup,
    markPopupShown
  } = useLocation();

  // Show location prompt if needed (using global popup state)
  const shouldShowPrompt = showLocationPrompt && shouldShowPopup(requireLocation);

  // If location is required but not available, show prompt
  const needsLocation = requireLocation && !userLocation && !isLoading;

  return (
    <>
      {children}
      
      {/* Location permission prompt */}
      {shouldShowPrompt && (
        locationPromptComponent || (
          <LocationPromptPopup
            isOpen={true}
            onClose={() => {
              markPopupShown();
            }}
            onSkip={() => {
              markPopupShown();
            }}
          />
        )
      )}
      
      {/* Required location not available */}
      {needsLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Location Required</h2>
            <p className="text-gray-600 mb-4">
              This page requires your location to function properly.
            </p>
            <button
              onClick={requestLocation}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Enable Location
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * LocationAwarePage - HOC that provides location functionality
 * 
 * @param props Component props
 * @returns Location-aware page component
 * 
 * @example
 * ```tsx
 * function MyPage() {
 *   return (
 *     <LocationAwarePage showLocationPrompt={true}>
 *       <div>
 *         <h1>My Location-Aware Page</h1>
 *         <RestaurantList />
 *       </div>
 *     </LocationAwarePage>
 *   );
 * }
 * ```
 */
export default function LocationAwarePage(props: LocationAwarePageProps) {
  return (
    <LocationProvider>
      <LocationAwareContent {...props} />
    </LocationProvider>
  );
}

/**
 * Hook to check if location is available and required
 */
export function useLocationRequirement(requireLocation: boolean = false) {
  const { userLocation, isLoading, permissionStatus } = useLocation();
  
  const isLocationAvailable = !!userLocation;
  const isLocationRequired = requireLocation;
  const needsLocation = isLocationRequired && !isLocationAvailable && !isLoading;
  const canProceed = !isLocationRequired || isLocationAvailable;
  
  return {
    isLocationAvailable,
    isLocationRequired,
    needsLocation,
    canProceed,
    permissionStatus,
    isLoading
  };
}
