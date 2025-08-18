"use client";

import { useRef, useState, useEffect} from "react";
import { loadMaps } from "../../../../lib/maps/loader";

export default function LiveMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null); // Clear any previous errors
        
        const google = await loadMaps();

        if (cancelled || !ref.current) {
          return;
        }

        // Verify Google Maps API is properly loaded
        if (!google?.maps) {
          throw new Error('Google Maps API not available');
        }

        // Extra sanity check to avoid "not a constructor" for v=weekly
        const imported = typeof (google?.maps as any)?.importLibrary === 'function'
          ? await (google.maps as any).importLibrary('maps').catch(() => null)
          : null;
        const GMap = (imported && (imported as any).Map) || (google?.maps as any)?.Map;
        if (typeof GMap !== 'function') {
          throw new Error('Google Maps JS failed to initialize core Map class');
        }

        const mapOptions: any = {
          center: { lat: 25.774, lng: -80.19 }, // Miami
          zoom: 10,
          disableDefaultUI: true,
          gestureHandling: 'greedy'
        };

        // Add mapId if available (for styled maps)
        if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID) {
          mapOptions.mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
        }

        const map = new GMap(ref.current, mapOptions);
        
        // Force a resize after first tick to avoid gray area issues
        setTimeout(() => {
          try {
            // In some bundles, maps.event may not be present in typings; call safely via any
            (google.maps as any).event?.trigger?.(map, 'resize');
          } catch (resizeError) {
            // eslint-disable-next-line no-console
            console.warn('Map resize trigger failed:', resizeError);
          }
        }, 100);

        // eslint-disable-next-line no-console
        // eslint-disable-next-line no-console
        console.log('Map initialized successfully');

      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error("Map initialization failed:", e);
        const errorMessage = e?.message ?? "Map failed to load";
        
        // Provide more helpful error messages
        if (errorMessage.includes('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')) {
          setError("Google Maps API key is missing or invalid. Please check your environment configuration.");
        } else if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
          setError("Google Maps API quota exceeded or billing issue. Please check your Google Cloud Console.");
        } else if (errorMessage.includes('referer')) {
          setError("Google Maps API key is restricted to specific domains. Please check your API key configuration.");
        } else {
          setError(`Failed to load map: ${errorMessage}`);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Always render the map container so the ref exists when the effect runs
  return (
    <div className="relative h-[60vh] w-full rounded-xl">
      <div ref={ref} className="absolute inset-0 rounded-xl" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100">
          <div className="text-gray-600 text-sm">Loading map...</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100">
          <div className="text-red-600 text-sm text-center">
            <p>Map error: {error}</p>
            <p className="text-xs mt-2">Please refresh the page to try again</p>
          </div>
        </div>
      )}
    </div>
  );
}
