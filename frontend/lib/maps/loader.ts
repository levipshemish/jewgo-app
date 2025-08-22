'use client';

import { Loader } from '@googlemaps/js-api-loader';

let singletonLoader: Loader | null = null;

export function getMapsLoader(): Loader {
  if (!singletonLoader) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'undefined') {
      // eslint-disable-next-line no-console
      console.error('Google Maps API Key issues:', {
        exists: !!apiKey,
        value: `${apiKey?.substring(0, 10)}...`,
        length: apiKey?.length
      });
      throw new Error('Missing or invalid NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable');
    }
    singletonLoader = new Loader({
      apiKey: apiKey.trim(),
      version: 'quarterly',
      libraries: ['places', 'geometry', 'marker'],
    });
  }
  return singletonLoader;
}

export async function loadMaps(): Promise<typeof window.google> {
  try {
    const loader = getMapsLoader();
    const google = await loader.load();
    
    // Validate that Google Maps loaded properly
    if (!google || !google.maps) {
      throw new Error('Google Maps API failed to load properly');
    }
    
    // Best effort: ensure core libraries are initialized in modern API
    try {
      const importer: any = (google.maps as any);
      if (typeof importer?.importLibrary === 'function') {
        await Promise.all([
          importer.importLibrary('maps'),
          importer.importLibrary('marker'),
        ]);
      }
    } catch (importError) {
      // eslint-disable-next-line no-console
      console.warn('Failed to import modern Google Maps libraries, falling back to classic API:', importError);
      // noop – fallback to classic loader semantics
    }
    
    return google;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load Google Maps API:', error);
    throw new Error(`Google Maps loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
