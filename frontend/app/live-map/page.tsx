import { Suspense } from 'react';
import { LocationProvider } from '@/lib/contexts/LocationContext';
import UnifiedLiveMapClient from '@/components/map/UnifiedLiveMapClient';

export default function LiveMapPage() {
  return (
    <LocationProvider>
      <div className="h-screen bg-gray-50 page-with-bottom-nav overflow-hidden">
        <Suspense fallback={<div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading map...</div>
        </div>}>
          <UnifiedLiveMapClient />
        </Suspense>
      </div>
    </LocationProvider>
  );
}
