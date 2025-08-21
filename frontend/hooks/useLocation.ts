import { useState, useEffect, useCallback } from 'react';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface UseLocationReturn {
  location: LocationCoords | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  clearLocation: () => void;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const coords = JSON.parse(savedLocation);
        setLocation(coords);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to parse saved location:', err);
        localStorage.removeItem('userLocation');
      }
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser.');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setLocation(coords);
      localStorage.setItem('userLocation', JSON.stringify(coords));
      localStorage.setItem('locationRequested', 'true');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      
      // Mark that location was requested (even if failed)
      localStorage.setItem('locationRequested', 'true');
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    localStorage.removeItem('userLocation');
    localStorage.removeItem('locationRequested');
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation,
    clearLocation
  };
}
