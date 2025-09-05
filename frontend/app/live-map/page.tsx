import { Suspense } from 'react';
import LocationAwarePage from '@/components/LocationAwarePage';
import UnifiedLiveMapClient from '@/components/map/UnifiedLiveMapClient';

export default function LiveMapPage() {
  return (
    <LocationAwarePage requireLocation={true}>
      <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading map...</div>
        </div>}>
          <UnifiedLiveMapClient />
        </Suspense>
      </div>
    </LocationAwarePage>
  );
}
