'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketplaceSellPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new add listing page
    router.push('/marketplace/add');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to create listing...</p>
      </div>
    </div>
  );
}
