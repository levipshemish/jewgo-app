'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DEBUG, debugLog } from '@/lib/utils/debug';

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
  hasShownPopup: boolean;
  lastPopupShownTime: number | null;
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
  refreshLocation: () => Promise<void>;
  markPopupShown: () => void;
  shouldShowPopup: (forceShow?: boolean) => boolean;
  resetPopupState: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_STORAGE_KEY = 'jewgo_location_data';
const POPUP_STORAGE_KEY = 'jewgo_location_popup_state';

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
  const [hasShownPopup, setHasShownPopup] = useState(false);
  const [lastPopupShownTime, setLastPopupShownTime] = useState<number | null>(null);

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
      if (DEBUG) { debugLog('📍 LocationContext: Skipping request - too soon or already loading'); }
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
        if (DEBUG) { /* location obtained successfully */ }
        setUserLocation(location);
      } catch (locationError: any) {
        setIsLoading(false);
        let errorMessage = 'Unable to get your location';
        
        if (locationError.message === 'timeout') {
          errorMessage = 'Location request timed out. Please try again.';
          // Keep permission status as prompt so user can retry
          setPermissionStatus('prompt');
          if (DEBUG) { debugLog('📍 LocationContext: Location request timed out after 10 seconds'); }
        } else if (locationError.code) {
          switch (locationError.code) {
            case locationError.PERMISSION_DENIED:
              setPermissionStatus('denied');
              errorMessage = 'Location access was denied. Please enable location services in your browser settings.';
              break;
            case locationError.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please try again.';
              break;
            case locationError.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
        }
        
        setError(errorMessage);
      }
    })();
  }, [isLoading, lastRequestTime]);

  // Load location data and popup state from localStorage on mount and check actual browser permissions
  useEffect(() => {
    const savedLocationData = localStorage.getItem(LOCATION_STORAGE_KEY);
    const savedPopupState = localStorage.getItem(POPUP_STORAGE_KEY);
    
    // Load popup state
    if (savedPopupState) {
      try {
        const popupData = JSON.parse(savedPopupState);
        setHasShownPopup(popupData.hasShownPopup || false);
        setLastPopupShownTime(popupData.lastPopupShownTime || null);
        if (DEBUG) { debugLog('📍 LocationContext: Loaded popup state:', popupData); }
      } catch (_error) {
        // Clear corrupted popup data
        localStorage.removeItem(POPUP_STORAGE_KEY);
        if (DEBUG) { debugLog('📍 LocationContext: Cleared corrupted popup state'); }
      }
    }
    
    // First, check the actual browser permission status
    const checkBrowserPermission = async () => {
      if (!navigator.geolocation) {
        setPermissionStatus('unsupported');
        if (DEBUG) { debugLog('📍 LocationContext: Geolocation not supported'); }
        return 'unsupported';
      }

      try {
        // Check if we can get the permission state (modern browsers)
        if ('permissions' in navigator && 'query' in navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (DEBUG) { debugLog('📍 LocationContext: Browser permission state:', permission.state); }
          setPermissionStatus(permission.state);
          
          // Create permission change handler
          const handlePermissionChange = () => {
            const newState = permission.state;
            if (DEBUG) { debugLog('📍 LocationContext: Permission state changed to:', newState); }
            setPermissionStatus(newState);
            
            if (newState === 'denied') {
              setUserLocation(null);
              setError('Location access was denied');
              // Clear localStorage when permission is denied
              localStorage.removeItem(LOCATION_STORAGE_KEY);
              if (DEBUG) { debugLog('📍 LocationContext: Permission denied, cleared location data'); }
            } else if (newState === 'granted') {
              setError(null);
              if (DEBUG) { debugLog('📍 LocationContext: Permission granted'); }
              // Don't automatically request location - wait for user gesture
            }
          };
          
          // Listen for permission changes
          permission.addEventListener('change', handlePermissionChange);
          
          // Return cleanup function
          return () => {
            permission.removeEventListener('change', handlePermissionChange);
          };
        } else {
          // Fallback for older browsers - we'll check when user actually requests location
          if (DEBUG) { debugLog('📍 LocationContext: Permissions API not supported, defaulting to prompt'); }
          setPermissionStatus('prompt');
          return 'prompt';
        }
      } catch (_error) {
        // If permission query fails, default to prompt
        if (DEBUG) { debugLog('📍 LocationContext: Permission query failed:', _error); }
        setPermissionStatus('prompt');
        return 'prompt';
      }
    };

    // Check permission first, then load data only if permission is granted
    const loadDataWithPermissionCheck = async () => {
      const cleanup = await checkBrowserPermission();
      
      // Only load location data if permission is granted
      if (permissionStatus === 'granted' && savedLocationData) {
        try {
          const data = JSON.parse(savedLocationData);
          
          // Check if the saved location is still valid (less than 1 hour old)
          if (data.userLocation && data.userLocation.timestamp) {
            const age = Date.now() - data.userLocation.timestamp;
            const maxAge = 60 * 60 * 1000; // 1 hour
            
            if (age < maxAge) {
              setUserLocation(data.userLocation);
              if (DEBUG) { debugLog('📍 LocationContext: Loaded saved location data'); }
            } else {
              // Location is too old, clear it
              localStorage.removeItem(LOCATION_STORAGE_KEY);
              if (DEBUG) { debugLog(`📍 LocationContext: Cleared expired location data (age: ${Math.floor(age / (1000 * 60))} minutes)`); }
              // Request fresh location since saved data is expired
              requestLocation();
            }
          }
        } catch (_error) {
          // Clear corrupted data
          localStorage.removeItem(LOCATION_STORAGE_KEY);
        }
      } else if (permissionStatus === 'granted' && !savedLocationData) {
        // Permission is granted but no saved data, request location
        if (DEBUG) { debugLog('📍 LocationContext: Permission granted but no saved data, requesting location'); }
        requestLocation();
      } else if (permissionStatus === 'denied') {
        // Clear any saved location data if permission is denied
        localStorage.removeItem(LOCATION_STORAGE_KEY);
        if (DEBUG) { debugLog('📍 LocationContext: Cleared location data due to denied permission'); }
      }
      
      // Return cleanup function if available
      return cleanup;
    };

    let cleanup: (() => void) | undefined;
    loadDataWithPermissionCheck().then((cleanupFn) => {
      cleanup = cleanupFn;
    });
    
    // Mark as initialized to prevent premature saves
    setHasInitialized(true);
    
    // Return cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [requestLocation]);

  // Save location data to localStorage whenever it changes (only save if we have valid data)
  useEffect(() => {
    // Don't save until component has initialized from localStorage
    if (!hasInitialized) {
      return;
    }
    
    // Don't save if permission is denied
        if (permissionStatus === 'denied') {
          localStorage.removeItem(LOCATION_STORAGE_KEY);
          // Reset popup state when location data is cleared
          setHasShownPopup(false);
          setLastPopupShownTime(null);
          if (DEBUG) { debugLog('📍 LocationContext: Removed location data due to denied permission'); }
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
        // Only save if the data actually changed to prevent unnecessary localStorage writes
        const existingData = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (existingData) {
          try {
            const parsed = JSON.parse(existingData);
            // Check if data is actually different before saving
            if (JSON.stringify(parsed) === JSON.stringify(locationData)) {
              if (DEBUG) { debugLog('📍 LocationContext: Skipping save - data unchanged'); }
              return;
            }
          } catch {
            // If parsing fails, continue with save
          }
        }
        
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
        if (DEBUG) { debugLog('📍 LocationContext: Saved location data to localStorage'); }
      } catch (_error) {
        if (DEBUG) { console.error('❌ LocationContext: Failed to save location data:', _error); }
      }
    }
  }, [hasInitialized, userLocation, permissionStatus]);

  // Save popup state to localStorage whenever it changes
  useEffect(() => {
    if (!hasInitialized) {
      return;
    }

    const popupData = {
      hasShownPopup,
      lastPopupShownTime,
      lastUpdated: new Date().toISOString(),
    };

    try {
      localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(popupData));
      if (DEBUG) { debugLog('📍 LocationContext: Saved popup state to localStorage'); }
    } catch (_error) {
      if (DEBUG) { console.error('❌ LocationContext: Failed to save popup state:', _error); }
    }
  }, [hasInitialized, hasShownPopup, lastPopupShownTime]);

  // Add visibility change listener to refresh location when user returns to app
  useEffect(() => {
    if (!hasInitialized) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && permissionStatus === 'granted') {
        // Check if location is old (more than 30 minutes)
        if (userLocation && userLocation.timestamp) {
          const age = Date.now() - userLocation.timestamp;
          const maxAge = 30 * 60 * 1000; // 30 minutes
          
          if (age > maxAge) {
            if (DEBUG) { debugLog('📍 LocationContext: Location is old, refreshing on visibility change'); }
            refreshLocation();
          }
        } else if (!userLocation) {
          // No location but permission granted, request it
          if (DEBUG) { debugLog('📍 LocationContext: No location but permission granted, requesting on visibility change'); }
          requestLocation();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasInitialized, permissionStatus, userLocation, refreshLocation, requestLocation]);

  const setLocation = useCallback((location: UserLocation) => {
    setUserLocation(location);
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setPermissionStatus('prompt');
    setError(null);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    // Reset popup state when location is manually cleared
    setHasShownPopup(false);
    setLastPopupShownTime(null);
    if (DEBUG) { debugLog('📍 LocationContext: Manually cleared all location data'); }
  }, []);

  const setPermissionStatusHandler = useCallback((status: LocationState['permissionStatus']) => {
    setPermissionStatus(status);
  }, []);

  const setErrorHandler = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
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
    } catch (_error) {
      return 'prompt';
    }
  }, []);

  const refreshPermissionStatus = useCallback(async (): Promise<void> => {
    if (DEBUG) { debugLog('📍 LocationContext: Refreshing permission status...'); }
    
    const newStatus = await checkPermissionStatus();
    setPermissionStatus(newStatus);
    
    if (DEBUG) { debugLog('📍 LocationContext: Permission status refreshed to:', newStatus); }
    
    // If permission is denied, clear any saved location data
    if (newStatus === 'denied') {
      setUserLocation(null);
      setError('Location access was denied');
      localStorage.removeItem(LOCATION_STORAGE_KEY);
      // Reset popup state when permission is denied
      setHasShownPopup(false);
      setLastPopupShownTime(null);
    } else if (newStatus === 'granted') {
      setError(null);
      // If permission was just granted and we don't have location, request it
      if (!userLocation) {
        if (DEBUG) { debugLog('📍 LocationContext: Permission granted, requesting location'); }
        requestLocation();
      }
    }
  }, [checkPermissionStatus, userLocation, requestLocation]);

  const refreshLocation = useCallback(async (): Promise<void> => {
    if (permissionStatus === 'granted') {
      if (DEBUG) { debugLog('📍 LocationContext: Refreshing location data'); }
      await requestLocation();
    } else {
      if (DEBUG) { debugLog('📍 LocationContext: Cannot refresh location - permission not granted'); }
    }
  }, [permissionStatus, requestLocation]);

  const markPopupShown = useCallback(() => {
    setHasShownPopup(true);
    setLastPopupShownTime(Date.now());
    if (DEBUG) { debugLog('📍 LocationContext: Marked popup as shown'); }
  }, []);

  const shouldShowPopup = useCallback((forceShow: boolean = false): boolean => {
    // Always show if forced (for location-required pages)
    if (forceShow) {
      return true;
    }

    // Don't show if we already have location
    if (userLocation) {
      return false;
    }

    // Don't show if currently loading
    if (isLoading) {
      return false;
    }

    // Don't show if permission is denied or unsupported
    if (permissionStatus === 'denied' || permissionStatus === 'unsupported') {
      return false;
    }

    // Check if location cache was cleared (no saved location data)
    // Only access localStorage on client side
    const savedLocationData = typeof window !== 'undefined' ? localStorage.getItem(LOCATION_STORAGE_KEY) : null;
    const cacheWasCleared = !savedLocationData;

    // Show popup if:
    // 1. Cache was cleared (no saved location data)
    // 2. Permission is prompt and we haven't shown popup yet
    // 3. Permission is prompt and we've shown popup but cache was cleared
    if (permissionStatus === 'prompt') {
      if (cacheWasCleared) {
        if (DEBUG) { debugLog('📍 LocationContext: Showing popup - cache was cleared'); }
        return true;
      }
      
      if (!hasShownPopup) {
        if (DEBUG) { debugLog('📍 LocationContext: Showing popup - first time'); }
        return true;
      }
    }

    return false;
  }, [userLocation, isLoading, permissionStatus, hasShownPopup]);

  const resetPopupState = useCallback(() => {
    setHasShownPopup(false);
    setLastPopupShownTime(null);
    localStorage.removeItem(POPUP_STORAGE_KEY);
    if (DEBUG) { debugLog('📍 LocationContext: Reset popup state'); }
  }, []);

  const value: LocationContextType = useMemo(() => ({
    userLocation,
    permissionStatus,
    isLoading,
    error,
    hasShownPopup,
    lastPopupShownTime,
    requestLocation,
    setLocation,
    clearLocation,
    setPermissionStatus: setPermissionStatusHandler,
    setError: setErrorHandler,
    setLoading: setLoadingHandler,
    checkPermissionStatus,
    refreshPermissionStatus,
    refreshLocation,
    markPopupShown,
    shouldShowPopup,
    resetPopupState,
  }), [
    userLocation,
    permissionStatus,
    isLoading,
    error,
    hasShownPopup,
    lastPopupShownTime,
    requestLocation,
    setLocation,
    clearLocation,
    setPermissionStatusHandler,
    setErrorHandler,
    setLoadingHandler,
    checkPermissionStatus,
    refreshPermissionStatus,
    refreshLocation,
    markPopupShown,
    shouldShowPopup,
    resetPopupState,
  ]);

  // IMPORTANT: always render children regardless of location status
  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
