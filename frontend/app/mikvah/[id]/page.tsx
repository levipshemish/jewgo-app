'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ListingPage } from '@/components/listing-details-utility/listing-page';
import { mapMikvahToListingData } from '@/lib/mappers/mikvahMapper';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useLocationData } from '@/hooks/useLocationData';
import LocationAwarePage from '@/components/LocationAwarePage';

interface Mikvah {
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
  mikvah_type?: string;
  mikvah_category?: string;
  business_hours?: string;
  requires_appointment?: boolean;
  appointment_phone?: string;
  appointment_website?: string;
  walk_in_available?: boolean;
  advance_booking_days?: number;
  distance?: string;
  distance_miles?: number;
  rating?: number;
  reviewcount?: number;
  star_rating?: number;
  google_rating?: number;
  image_url?: string;
  logo_url?: string;
  has_changing_rooms?: boolean;
  has_shower_facilities?: boolean;
  has_towels_provided?: boolean;
  has_soap_provided?: boolean;
  has_hair_dryers?: boolean;
  has_private_entrance?: boolean;
  has_disabled_access?: boolean;
  has_parking?: boolean;
  rabbinical_supervision?: string;
  kosher_certification?: string;
  community_affiliation?: string;
  religious_authority?: string;
  fee_amount?: number;
  fee_currency?: string;
  accepts_credit_cards?: boolean;
  accepts_cash?: boolean;
  accepts_checks?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  listing_type?: string;
  latitude?: number;
  longitude?: number;
}

function MikvahDetailContent() {
  const params = useParams();
  const router = useRouter();
  
  // Use the new location utility system
  const {
    userLocation,
    permissionStatus: _permissionStatus,
    isLoading: _locationLoading,
    error: _locationError,
    requestLocation: _requestLocation
  } = useLocationData({
    fallbackText: 'Get Location'
  })
  
  const [mikvah, setMikvah] = useState<Mikvah | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mikvahId = params?.id as string;

  useEffect(() => {
    if (!mikvahId) return;

    const fetchMikvah = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/v5/mikvahs/${mikvahId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch mikvah details');
        }

        const data = await response.json();
        setMikvah(data.data);
      } catch (err) {
        console.error('Error fetching mikvah:', err);
        setError(err instanceof Error ? err.message : 'Failed to load mikvah details');
      } finally {
        setLoading(false);
      }
    };

    fetchMikvah();
  }, [mikvahId]);

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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Mikvah</h2>
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

  if (!mikvah) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Mikvah Not Found</h2>
        <p className="text-gray-600 text-center mb-6">The mikvah facility you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/mikvah')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Browse Mikvah Facilities
        </button>
      </div>
    );
  }

  // Parse business hours if available
  let parsedHours = null;
  if (mikvah.business_hours) {
    try {
      parsedHours = JSON.parse(mikvah.business_hours);
    } catch (_e) {
      // If parsing fails, use the raw string
      parsedHours = mikvah.business_hours;
    }
  }

  // Calculate distance if user location is available
  let distance = mikvah.distance;
  if (userLocation && mikvah.latitude && mikvah.longitude) {
    // Calculate distance using Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = (mikvah.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (mikvah.longitude - userLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(mikvah.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const calculatedDistance = R * c;
    distance = `${calculatedDistance.toFixed(1)} mi`;
  }

  const listingData = mapMikvahToListingData(mikvah, parsedHours, distance);

  return (
    <ListingPage
      data={listingData}
    />
  );
}

export default function MikvahDetailPage() {
  return (
    <LocationAwarePage showLocationPrompt={true}>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        }>
          <MikvahDetailContent />
        </Suspense>
      </ErrorBoundary>
    </LocationAwarePage>
  );
}