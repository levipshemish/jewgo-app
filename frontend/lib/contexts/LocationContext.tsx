'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface UserLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface LocationState {
  userLocation: UserLocation | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unsupported';
  isLoading: boolean;
  error: string | null;
}

interface LocationContextType extends LocationState {
  requestLocation: () => void;
  setLocation: (location: UserLocation) => void;
  clearLocation: () => void;
  setPermissionStatus: (status: LocationState['permissionStatus']) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_STORAGE_KEY = 'jewgo_location_data';

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: React.ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationState['permissionStatus']>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load location data from localStorage on mount
  useEffect(() => {
    const savedLocationData = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (savedLocationData) {
      try {
        const data = JSON.parse(savedLocationData);
        
        // Check if the saved location is still valid (less than 1 hour old)
        if (data.userLocation && data.userLocation.timestamp) {
          const age = Date.now() - data.userLocation.timestamp;
          const maxAge = 60 * 60 * 1000; // 1 hour
          
          if (age < maxAge) {
            setUserLocation(data.userLocation);
            if (process.env.NODE_ENV === 'development') {
              console.log('📍 LocationContext: Loaded valid location data from localStorage', data.userLocation);
            }
          } else {
            // Location is too old, clear it
            localStorage.removeItem(LOCATION_STORAGE_KEY);
            if (process.env.NODE_ENV === 'development') {
              console.log('📍 LocationContext: Cleared expired location data (age: ' + Math.floor(age / (1000 * 60)) + ' minutes)');
            }
          }
        }
        
        if (data.permissionStatus) {
          setPermissionStatus(data.permissionStatus);
        }
      } catch (error) {
        // Clear corrupted data
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    }
    
    // Mark as initialized to prevent premature saves
    setHasInitialized(true);
  }, []);

  // Save location data to localStorage whenever it changes (only save if we have valid data)
  useEffect(() => {
    // Don't save until component has initialized from localStorage
    if (!hasInitialized) {
      return;
    }
    
    // Only save to localStorage if we have actual location data or meaningful permission status
    if (userLocation || permissionStatus !== 'prompt') {
      const locationData = {
        userLocation,
        permissionStatus,
        lastUpdated: new Date().toISOString(),
      };
      
      try {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 LocationContext: Saved location data to localStorage', locationData);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ LocationContext: Failed to save location data:', error);
        }
      }
    }
  }, [hasInitialized, userLocation, permissionStatus]);

  const requestLocation = useCallback(() => {
    console.log('📍 LocationContext: requestLocation called', {
      isLoading,
      lastRequestTime,
      timeSinceLastRequest: Date.now() - lastRequestTime
    });
    
    // Prevent multiple simultaneous requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const minRequestInterval = 5000; // Reduced to 5 seconds for testing
    
    if (isLoading || timeSinceLastRequest < minRequestInterval) {
      console.log('📍 LocationContext: Request blocked', { isLoading, timeSinceLastRequest });
      return;
    }
    
    if (!navigator.geolocation) {
      setPermissionStatus('unsupported');
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLastRequestTime(now);
    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 LocationContext: Geolocation success', position);
        setIsLoading(false);
        setPermissionStatus('granted');
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
        };
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 LocationContext: Successfully obtained location', location);
        }
        setUserLocation(location);
      },
      (error: GeolocationPositionError) => {
        console.log('📍 LocationContext: Geolocation error', error);
        setIsLoading(false);
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setPermissionStatus('denied');
            errorMessage = 'Location access was denied. Please enable location services in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        setError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 600000, // 10 minutes - increased to reduce frequency
      }
    );
  }, [isLoading, lastRequestTime]);

  const setLocation = useCallback((location: UserLocation) => {
    setUserLocation(location);
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setPermissionStatus('prompt');
    setError(null);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
  }, []);

  const setPermissionStatusHandler = useCallback((status: LocationState['permissionStatus']) => {
    setPermissionStatus(status);
  }, []);

  const setErrorHandler = useCallback((error: string | null) => {
    setError(error);
  }, []);

  const setLoadingHandler = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const value: LocationContextType = {
    userLocation,
    permissionStatus,
    isLoading,
    error,
    requestLocation,
    setLocation,
    clearLocation,
    setPermissionStatus: setPermissionStatusHandler,
    setError: setErrorHandler,
    setLoading: setLoadingHandler,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
