'use client';

import React, { useEffect } from 'react';
import { useLocation } from '@/lib/contexts/LocationContext';
import { MapPin, X, AlertCircle, CheckCircle } from 'lucide-react';

interface LocationPromptPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
}

export default function LocationPromptPopup({
  isOpen,
  onClose,
  onSkip,
}: LocationPromptPopupProps) {
  const { requestLocation, permissionStatus, isLoading, error } = useLocation();

  const handleRequestLocation = async () => {
    await requestLocation();
  };

  const handleResetPermission = () => {
    // Reset location permission by reloading the page
    window.location.reload();
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  // Auto-close popup when permission is granted or denied
  useEffect(() => {
    if (isOpen && (permissionStatus === 'granted' || permissionStatus === 'denied')) {
      // Small delay to show success/denied message
      const timer = setTimeout(() => {
        onClose();
      }, 2000); // Longer delay for denied to let user read the message
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, permissionStatus, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Enable Location Services
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            To provide you with the best experience, we&apos;d like to access your location to show nearby kosher restaurants and services.
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-red-800">
                <p>{error}</p>
                {error.includes('timed out') && (
                  <p className="mt-1 text-xs">This can happen on slower connections. Please try again.</p>
                )}
              </div>
            </div>
          )}

          {permissionStatus === 'granted' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Location access granted! You can now see nearby places.
              </span>
            </div>
          )}

          {permissionStatus === 'denied' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Location access was denied. You can still use the app, but won&apos;t see nearby places.
                </span>
              </div>
              <button
                onClick={handleResetPermission}
                className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
              >
                Reset Permission Settings
              </button>
            </div>
          )}

          <div className="flex gap-3">
            {permissionStatus === 'prompt' && (
              <button
                onClick={handleRequestLocation}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Getting location...</span>
                  </>
                ) : (
                  'Enable Location'
                )}
              </button>
            )}
            
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Skip for Now
            </button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Your location is only used to show nearby kosher places</p>
            <p>• We don&apos;t store or share your location data</p>
            <p>• You can change this setting anytime in your browser</p>
          </div>
        </div>
      </div>
    </div>
  );
}
