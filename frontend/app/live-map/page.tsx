import { Suspense } from 'react';

import UnifiedLiveMapClient from '@/components/map/UnifiedLiveMapClient';

export default function LiveMapPage() {
  return (
    <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 z-50 bg-white p-4 rounded-lg shadow-lg text-xs">
          <h3 className="text-xs font-bold mb-2">Live Map Debug</h3>
          <p>Check browser console for detailed logs</p>
          <p>Environment: {process.env.NODE_ENV}</p>
          <p>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL || 'https://jewgo-app-oyoh.onrender.com'}</p>
        </div>
      )}
      
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>}>
        <UnifiedLiveMapClient />
      </Suspense>
    </div>
  );
}
