"use client";

import React from 'react';
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface LocationAccessProps {
  onLocationGranted?: (coords: { latitude: number; longitude: number }) => void;
  onLocationDenied?: () => void;
  redirectTo?: string;
}

export default function LocationAccess({ 
  onLocationGranted, 
  onLocationDenied, 
  redirectTo = '/eatery' 
}: LocationAccessProps) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const requestLocation = useCallback(async () => {
    setStatus('requesting');
    setError('');

    try {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser.');
        setStatus('error');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ latitude, longitude });
          setStatus('granted');
          
          // Call the callback if provided
          if (onLocationGranted) {
            onLocationGranted({ latitude, longitude });
          }
          
          // Redirect after a short delay to show success state
          setTimeout(() => {
            router.push(redirectTo);
          }, 1000);
        },
        (geolocationError) => {
          // eslint-disable-next-line no-console
          console.error('Geolocation error:', geolocationError);
          setStatus('denied');
          
          switch (geolocationError.code) {
            case geolocationError.PERMISSION_DENIED:
              setError('Location access was denied. You can still use the app without location services.');
              break;
            case geolocationError.POSITION_UNAVAILABLE:
              // Enhanced messaging for iOS CoreLocation issues
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              if (isIOS) {
                setError('Location temporarily unavailable. This is normal on iOS - please wait a moment and try again.');
              } else {
                setError('Location information is unavailable.');
              }
              break;
            case geolocationError.TIMEOUT:
              setError('Location request timed out.');
              break;
            default:
              setError('An unknown error occurred while getting location.');
          }
          
          // Call the callback if provided
          if (onLocationDenied) {
            onLocationDenied();
          }
          
          // Mark that location was requested (even if denied)
          localStorage.setItem('locationRequested', 'true');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Location request error:', err);
      setError('Failed to request location access.');
      setStatus('error');
    }
  }, [onLocationGranted, onLocationDenied, redirectTo, router]);

  const skipLocation = () => {
    setStatus('denied');
    if (onLocationDenied) {
      onLocationDenied();
    }
    // Mark that location was requested (even if skipped)
    localStorage.setItem('locationRequested', 'true');
    router.push(redirectTo);
  };

  useEffect(() => {
    // Auto-request location when component mounts
    requestLocation();
  }, [requestLocation]);

  return (
    <div className="min-h-screen bg-neutral-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-jewgo-400 rounded-lg flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-white">g</span>
          </div>
        </div>

        <div className="text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Location Access
            </h2>
            <p className="text-neutral-400 text-base">
              {status === 'idle' && 'We need your location to show you nearby restaurants and services.'}
              {status === 'requesting' && 'Requesting location access...'}
              {status === 'granted' && 'Location access granted! Redirecting...'}
              {status === 'denied' && 'Location access was denied or unavailable.'}
              {status === 'error' && 'There was an error accessing your location.'}
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex justify-center">
            {status === 'requesting' && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jewgo-400"></div>
            )}
            {status === 'granted' && (
              <div className="w-12 h-12 bg-jewgo-400 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'denied' && (
              <div className="w-12 h-12 bg-neutral-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-700 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {status === 'denied' && (
              <>
                <button
                  onClick={requestLocation}
                  className="w-full inline-flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-jewgo-400 hover:bg-jewgo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jewgo-400 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={skipLocation}
                  className="w-full inline-flex justify-center py-2 px-4 border border-neutral-600 rounded-lg shadow-sm bg-neutral-700 text-sm font-medium text-neutral-300 hover:bg-neutral-600 transition-colors"
                >
                  Continue Without Location
                </button>
              </>
            )}
            
            {status === 'error' && (
              <>
                <button
                  onClick={requestLocation}
                  className="w-full inline-flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-jewgo-400 hover:bg-jewgo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jewgo-400 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={skipLocation}
                  className="w-full inline-flex justify-center py-2 px-4 border border-neutral-600 rounded-lg shadow-sm bg-neutral-700 text-sm font-medium text-neutral-300 hover:bg-neutral-600 transition-colors"
                >
                  Continue Without Location
                </button>
              </>
            )}
          </div>

          {/* Location info */}
          {coords && (
            <div className="text-sm text-neutral-400">
              <p>Latitude: {coords.latitude.toFixed(6)}</p>
              <p>Longitude: {coords.longitude.toFixed(6)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
