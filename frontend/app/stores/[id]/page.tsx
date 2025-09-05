'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ListingPage } from '@/components/listing-details-utility/listing-page';
import { mapStoreToListingData } from '@/lib/mappers/storeMapper';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useLocationData } from '@/hooks/useLocationData';
import LocationAwarePage from '@/components/LocationAwarePage';

interface Store {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone_number?: string;
  website?: string;
  email?: string;
  store_type?: string;
  store_category?: string;
  business_hours?: string;
  distance?: string;
  distance_miles?: number;
  rating?: number;
  reviewcount?: number;
  star_rating?: number;
  google_rating?: number;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  logo_url?: string;
  has_parking?: boolean;
  has_delivery?: boolean;
  has_pickup?: boolean;
  accepts_credit_cards?: boolean;
  accepts_cash?: boolean;
  kosher_certification?: string;
  kosher_category?: string;
  is_cholov_yisroel?: boolean;
  is_pas_yisroel?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  listing_type?: string;
}

function StoreDetailContent() {
  const params = useParams();
  const router = useRouter();
  
  // Use the new location utility system
  const {
    userLocation,
    permissionStatus,
    isLoading: locationLoading,
    error: locationError,
    requestLocation
  } = useLocationData({
    fallbackText: 'Get Location'
  })
  
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storeId = params?.id as string;

  useEffect(() => {
    if (!storeId) return;

    const fetchStore = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/stores/${storeId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch store details');
        }

        const data = await response.json();
        setStore(data.data);
      } catch (err) {
        console.error('Error fetching store:', err);
        setError(err instanceof Error ? err.message : 'Failed to load store details');
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [storeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Store</h2>
        <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Store Not Found</h2>
        <p className="text-gray-600 text-center mb-6">The store you're looking for doesn't exist.</p>
        <button
          onClick={() => router.push('/stores')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Browse Stores
        </button>
      </div>
    );
  }

  // Parse business hours if available
  let parsedHours = null;
  if (store.business_hours) {
    try {
      parsedHours = JSON.parse(store.business_hours);
    } catch (e) {
      // If parsing fails, use the raw string
      parsedHours = store.business_hours;
    }
  }

  // Calculate distance if user location is available
  let distance = store.distance;
  if (userLocation && store.latitude && store.longitude) {
    // Calculate distance using Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = (store.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (store.longitude - userLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(store.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const calculatedDistance = R * c;
    distance = `${calculatedDistance.toFixed(1)} mi`;
  }

  const listingData = mapStoreToListingData(store, parsedHours, distance);

  return (
    <ListingPage
      data={listingData}
    />
  );
}

export default function StoreDetailPage() {
  return (
    <LocationAwarePage showLocationPrompt={true}>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        }>
          <StoreDetailContent />
        </Suspense>
      </ErrorBoundary>
    </LocationAwarePage>
  );
}