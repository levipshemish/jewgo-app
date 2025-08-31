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
  checkPermissionStatus: () => Promise<'granted' | 'denied' | 'prompt' | 'unsupported'>;
  refreshPermissionStatus: () => Promise<void>;
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

  // Load location data from localStorage on mount and check actual browser permissions
  useEffect(() => {
    const savedLocationData = localStorage.getItem(LOCATION_STORAGE_KEY);
    
    // First, check the actual browser permission status
    const checkBrowserPermission = async () => {
      if (!navigator.geolocation) {
        setPermissionStatus('unsupported');
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 LocationContext: Geolocation not supported');
        }
        return 'unsupported';
      }

      try {
        // Check if we can get the permission state (modern browsers)
        if ('permissions' in navigator && 'query' in navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (process.env.NODE_ENV === 'development') {
            console.log('📍 LocationContext: Browser permission state:', permission.state);
          }
          setPermissionStatus(permission.state);
          
          // Create permission change handler
          const handlePermissionChange = () => {
            const newState = permission.state;
            if (process.env.NODE_ENV === 'development') {
              console.log('📍 LocationContext: Permission state changed to:', newState);
            }
            setPermissionStatus(newState);
            
            if (newState === 'denied') {
              setUserLocation(null);
              setError('Location access was denied');
              // Clear localStorage when permission is denied
              localStorage.removeItem(LOCATION_STORAGE_KEY);
              if (process.env.NODE_ENV === 'development') {
                console.log('📍 LocationContext: Permission denied, cleared location data');
              }
            } else if (newState === 'granted') {
              setError(null);
              if (process.env.NODE_ENV === 'development') {
                console.log('📍 LocationContext: Permission granted');
              }
            }
          };
          
          // Listen for permission changes
          permission.addEventListener('change', handlePermissionChange);
          
          return permission.state;
        } else {
          // Fallback for older browsers - we'll check when user actually requests location
          if (process.env.NODE_ENV === 'development') {
            console.log('📍 LocationContext: Permissions API not supported, defaulting to prompt');
          }
          setPermissionStatus('prompt');
          return 'prompt';
        }
      } catch (error) {
        // If permission query fails, default to prompt
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 LocationContext: Permission query failed:', error);
        }
        setPermissionStatus('prompt');
        return 'prompt';
      }
    };

    // Check permission first, then load data only if permission is granted
    const loadDataWithPermissionCheck = async () => {
      const permissionState = await checkBrowserPermission();
      
      // Only load location data if permission is granted
      if (permissionState === 'granted' && savedLocationData) {
        try {
          const data = JSON.parse(savedLocationData);
          
          // Check if the saved location is still valid (less than 1 hour old)
          if (data.userLocation && data.userLocation.timestamp) {
            const age = Date.now() - data.userLocation.timestamp;
            const maxAge = 60 * 60 * 1000; // 1 hour
            
            if (age < maxAge) {
              setUserLocation(data.userLocation);
              if (process.env.NODE_ENV === 'development') {
                console.log('📍 LocationContext: Loaded saved location data');
              }
            } else {
              // Location is too old, clear it
              localStorage.removeItem(LOCATION_STORAGE_KEY);
              if (process.env.NODE_ENV === 'development') {
                console.log(`📍 LocationContext: Cleared expired location data (age: ${Math.floor(age / (1000 * 60))} minutes)`);
              }
            }
          }
        } catch (error) {
          // Clear corrupted data
          localStorage.removeItem(LOCATION_STORAGE_KEY);
        }
      } else if (permissionState === 'denied') {
        // Clear any saved location data if permission is denied
        localStorage.removeItem(LOCATION_STORAGE_KEY);
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 LocationContext: Cleared location data due to denied permission');
        }
      }
    };

    loadDataWithPermissionCheck();
    
    // Mark as initialized to prevent premature saves
    setHasInitialized(true);
  }, []);

  // Save location data to localStorage whenever it changes (only save if we have valid data)
  useEffect(() => {
    // Don't save until component has initialized from localStorage
    if (!hasInitialized) {
      return;
    }
    
    // Don't save if permission is denied
    if (permissionStatus === 'denied') {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
      if (process.env.NODE_ENV === 'development') {
        console.log('📍 LocationContext: Removed location data due to denied permission');
      }
      return;
    }
    
    // Only save to localStorage if we have actual location data
    if (userLocation) {
      const locationData = {
        userLocation,
        permissionStatus,
        lastUpdated: new Date().toISOString(),
      };
      
      try {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 LocationContext: Saved location data to localStorage');
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ LocationContext: Failed to save location data:', error);
        }
      }
    }
  }, [hasInitialized, userLocation, permissionStatus]);

  const requestLocation = useCallback(() => {
    // console.log('📍 LocationContext: requestLocation called', {
    //   isLoading,
    //   lastRequestTime,
    //   timeSinceLastRequest: Date.now() - lastRequestTime
    // });
    
    // Prevent multiple simultaneous requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const minRequestInterval = 2000; // Allow retry after 2 seconds
    
    if (isLoading || timeSinceLastRequest < minRequestInterval) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📍 LocationContext: Skipping request - too soon or already loading');
      }
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

    // Use timeout pattern to prevent hanging
    const getPosition = () =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        // Increase timeout to 10 seconds
        const timeoutMs = 10000;
        const kill = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        
        // Try with low accuracy first for faster response
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(kill);
            resolve(pos);
          },
          (err) => {
            clearTimeout(kill);
            // If it fails with low accuracy, don't retry with high accuracy
            // as it will likely fail again and take longer
            reject(err);
          },
          { 
            enableHighAccuracy: false, // Use low accuracy for faster response
            timeout: timeoutMs - 1000, // Browser timeout slightly less than our timeout
            maximumAge: 300000 // Accept cached position up to 5 minutes old
          }
        );
      });

    (async () => {
      try {
        const position = await getPosition();
        setIsLoading(false);
        setPermissionStatus('granted');
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
        };
        if (process.env.NODE_ENV === 'development') {
          // console.log('📍 LocationContext: Location obtained successfully');
        }
        setUserLocation(location);
      } catch (error: any) {
        setIsLoading(false);
        let errorMessage = 'Unable to get your location';
        
        if (error.message === 'timeout') {
          errorMessage = 'Location request timed out. Please try again.';
          // Keep permission status as prompt so user can retry
          setPermissionStatus('prompt');
          if (process.env.NODE_ENV === 'development') {
            console.log('📍 LocationContext: Location request timed out after 10 seconds');
          }
        } else if (error.code) {
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
        }
        
        setError(errorMessage);
      }
    })();
  }, [isLoading, lastRequestTime]);

  const setLocation = useCallback((location: UserLocation) => {
    setUserLocation(location);
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setPermissionStatus('prompt');
    setError(null);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    if (process.env.NODE_ENV === 'development') {
      console.log('📍 LocationContext: Manually cleared all location data');
    }
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

  const checkPermissionStatus = useCallback(async (): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> => {
    if (!navigator.geolocation) {
      return 'unsupported';
    }

    try {
      if ('permissions' in navigator && 'query' in navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state;
      } else {
        // For older browsers, we can't check without actually requesting
        return 'prompt';
      }
    } catch (error) {
      return 'prompt';
    }
  }, []);

  const refreshPermissionStatus = useCallback(async (): Promise<void> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📍 LocationContext: Refreshing permission status...');
    }
    
    const newStatus = await checkPermissionStatus();
    setPermissionStatus(newStatus);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📍 LocationContext: Permission status refreshed to:', newStatus);
    }
    
    // If permission is denied, clear any saved location data
    if (newStatus === 'denied') {
      setUserLocation(null);
      setError('Location access was denied');
      localStorage.removeItem(LOCATION_STORAGE_KEY);
    } else if (newStatus === 'granted') {
      setError(null);
    }
  }, [checkPermissionStatus]);

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
    checkPermissionStatus,
    refreshPermissionStatus,
  };

  // IMPORTANT: always render children regardless of location status
  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
