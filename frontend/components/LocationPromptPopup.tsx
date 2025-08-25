'use client';

import React, { useState, useEffect } from 'react';
import { useLocation } from '@/lib/contexts/LocationContext';

interface LocationPromptPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationGranted: () => void;
}

export const LocationPromptPopup: React.FC<LocationPromptPopupProps> = ({
  isOpen,
  onClose,
  onLocationGranted,
}) => {
  const { requestLocation, permissionStatus, isLoading, error } = useLocation();
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    if (isOpen && !hasRequested) {
      setHasRequested(true);
    }
  }, [isOpen, hasRequested]);

  // Don't auto-close just because permission is granted
  // Only close when user actually gets location or manually closes

  const handleRequestLocation = () => {
    // console.log('📍 LocationPromptPopup: Requesting location...', {
    //   permissionStatus,
    //   isLoading,
    //   error
    // });
    
    // Check current permission status first
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        // console.log('📍 LocationPromptPopup: Current permission state:', result.state);
        
        if (result.state === 'granted') {
          // Permission already granted, just get location
          requestLocation();
        } else if (result.state === 'prompt') {
          // Show browser permission dialog
          requestLocation();
        } else if (result.state === 'denied') {
          // Permission denied, show instructions
          // console.log('📍 LocationPromptPopup: Permission denied, showing instructions');
        }
      });
    } else {
      // Fallback for browsers that don't support permissions API
      requestLocation();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleResetPermission = () => {
    // Clear stored location data to reset permission state
    localStorage.removeItem('jewgo_location_data');
    // Reload the page to reset the location context
    window.location.reload();
  };

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="location-popup-modal bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        style={{
          backgroundColor: 'white',
          background: 'white',
        }}
      >
        <div className="text-center">
          {/* Location Icon */}
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Enable Location Services
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-6">
            To provide you with the best dining experience, we need your location to show nearby restaurants and accurate delivery times.
            {permissionStatus === 'prompt' && (
              <span className="block mt-2 text-sm text-blue-600">
                Click &quot;Enable Location&quot; to allow location access in your browser.
              </span>
            )}
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
              {permissionStatus === 'denied' && (
                <div className="mt-2">
                  <p className="text-red-600 text-xs font-medium mb-2">Location access was denied. To enable it:</p>
                  <div className="text-red-600 text-xs space-y-1">
                    <p><strong>Chrome/Edge:</strong> Click the lock icon 🔒 in the address bar → Location → Allow</p>
                    <p><strong>Safari:</strong> Safari → Settings → Websites → Location → Allow for localhost</p>
                    <p><strong>Firefox:</strong> Click the shield icon → Location → Allow</p>
                    <p className="mt-2 text-blue-600">Or click &quot;Reset Location Settings&quot; below to try again.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Getting your location...</span>
            </div>
          )}

                                {/* Buttons */}
                      <div className="flex flex-col space-y-3">
                        <button
                          onClick={handleRequestLocation}
                          disabled={isLoading || permissionStatus === 'denied'}
                          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoading ? 'Getting Location...' : 
                           permissionStatus === 'denied' ? 'Location Access Denied' : 'Enable Location'}
                        </button>

                        {permissionStatus === 'denied' && (
                          <button
                            onClick={handleResetPermission}
                            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                          >
                            Reset Location Settings
                          </button>
                        )}

                        <button
                          onClick={handleSkip}
                          className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                          Skip for Now
                        </button>
                      </div>

          {/* Privacy Note */}
          <p className="text-xs text-gray-500 mt-4">
            Your location is only used to find nearby restaurants and is never shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};
