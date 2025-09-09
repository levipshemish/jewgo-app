import { Suspense } from 'react';
import MapEngine from '@/components/map/MapEngine';
import MapErrorBoundary from '@/components/map/MapErrorBoundary';

export default function LiveMapPage() {
  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <Suspense fallback={<div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>}>
        <MapErrorBoundary>
          <MapEngine />
        </MapErrorBoundary>
      </Suspense>
    </div>
  );
}
