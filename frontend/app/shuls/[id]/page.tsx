'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type RealShul } from '@/lib/types/shul';
import { ListingPage, type ListingData } from '@/components/listing-details-utility/listing-page';
import { Loader2 } from 'lucide-react';
import { useFavorites } from '@/lib/utils/favorites';
import { useLocation } from '@/lib/contexts/LocationContext';

// Transform RealShul to ListingData format (same as eatery page)
function transformShulToListingData(
  shul: RealShul,
  userLocation?: { latitude: number; longitude: number } | null
): ListingData {
  
  // Calculate distance if user location is available (same as eatery page)
  let rightAction = '';
  const hasUserLocation = !!(userLocation?.latitude && userLocation?.longitude);
  const hasShulLocation = !!(shul.latitude && shul.longitude && shul.latitude !== 0 && shul.longitude !== 0);
  
  console.log('📍 Distance Calculation Debug:', {
    hasUserLocation,
    hasShulLocation,
    userCoords: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null,
    shulCoords: { lat: shul.latitude, lng: shul.longitude },
    zipFallback: shul.zip_code,
    cityFallback: shul.city
  });
  
  if (hasUserLocation && hasShulLocation) {
    // Calculate distance using the same logic as eatery page
    const R = 3959; // Earth's radius in miles
    const dLat = (shul.latitude! - userLocation!.latitude) * Math.PI / 180;
    const dLon = (shul.longitude! - userLocation!.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation!.latitude * Math.PI / 180) * Math.cos(shul.latitude! * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Format distance (same as eatery page)
    if (distance < 0.1) {
      rightAction = `${Math.round(distance * 5280)}ft`;
    } else if (distance < 1) {
      rightAction = `${Math.round(distance * 10) / 10}mi`;
    } else if (distance < 10) {
      rightAction = `${distance.toFixed(1)}mi`;
    } else {
      rightAction = `${Math.round(distance)}mi`;
    }
    
    console.log('✅ Distance calculated:', distance, 'formatted as:', rightAction);
  } else {
    rightAction = shul.zip_code || shul.city || '';
    console.log('❌ Using fallback:', rightAction, 'because:', {
      noUserLocation: !hasUserLocation,
      noShulLocation: !hasShulLocation
    });
  }

  // Build secondary actions - always show core buttons with visual feedback for missing data
  const secondaryActions = [
    {
      label: shul.website ? "Website" : "Website (N/A)",
      onClick: () => {
        if (shul.website) {
          window.open(shul.website, '_blank');
        } else {
          // Show toast or alert that website is not available
          alert('Website not available for this synagogue');
        }
      }
    },
    {
      label: shul.phone_number ? "Call" : "Call (N/A)",
      onClick: () => {
        if (shul.phone_number) {
          window.location.href = `tel:${shul.phone_number}`;
        } else {
          alert('Phone number not available for this synagogue');
        }
      }
    },
    {
      label: shul.email ? "Email" : "Email (N/A)",
      onClick: () => {
        if (shul.email) {
          window.location.href = `mailto:${shul.email}`;
        } else {
          alert('Email not available for this synagogue');
        }
      }
    }
  ];

  // Build tags from shul features
  const tags = [];
  if (shul.shul_category) tags.push(shul.shul_category);
  if (shul.shul_type) tags.push(shul.shul_type);
  if (shul.denomination) tags.push(shul.denomination);
  if (shul.has_daily_minyan) tags.push('Daily Minyan');
  if (shul.has_parking) tags.push('Parking');
  if (shul.has_disabled_access) tags.push('Accessible');

  return {
    // Header
    header: {
      title: shul.name,
      kosherType: shul.shul_category || shul.denomination,
      kosherAgency: shul.religious_authority,
      viewCount: Math.floor(Math.random() * 500) + 50, // Mock for now
      shareCount: Math.floor(Math.random() * 50) + 5,   // Mock for now
      onBack: () => {
        if (typeof window !== 'undefined') {
          window.history.back();
        }
      },
      isFavorited: false, // Will be set by favorites hook
      onFavorite: () => {}, // Will be set by favorites hook
      onShare: () => {
        if (typeof window !== 'undefined' && navigator.share) {
          navigator.share({
            title: `${shul.name} - JewGo`,
            text: `Check out ${shul.name} on JewGo`,
            url: window.location.href
          }).catch(() => {
            navigator.clipboard.writeText(window.location.href);
          });
        }
      }
    },

    // Image
    image: {
      src: shul.image_url || shul.logo_url || "/images/default-restaurant.webp",
      alt: `${shul.name} - ${shul.shul_category || 'Synagogue'}`,
      allImages: [shul.image_url, shul.logo_url].filter(Boolean)
    },

    // Content
    content: {
      leftText: shul.name,
      rightText: shul.community_affiliation || `${shul.city}, ${shul.state}`,
      leftAction: shul.rabbi_name || undefined,
      rightAction: rightAction || undefined,
      leftBold: true,
      rightBold: false,
      onRightAction: userLocation && shul.latitude && shul.longitude ? () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${shul.latitude},${shul.longitude}`;
        window.open(url, '_blank');
      } : undefined
    },

    // Actions
    actions: {
      // Secondary Actions - Website, Call, Email (always show, grey out when disabled)
      secondaryActions: secondaryActions,
      
      // Tags (same as eatery page)
      tags: tags.length > 0 ? tags.slice(0, 3) : undefined, // Max 3 tags
      
      // Bottom Action - Hours (always show, same pattern as eatery page)
      bottomAction: {
        label: "Hours",
        onClick: () => {
          // Hours popup will be handled by the component
        },
        hoursInfo: {
          title: shul.name,
          hours: shul.business_hours && shul.business_hours.trim() ? 
            // If we have business hours, try to parse them or show generic times
            [
              { day: 'Weekdays', time: 'Shacharis: 7:00 AM, Mincha: 6:30 PM, Maariv: 8:00 PM' },
              { day: 'Shabbos', time: 'Shacharis: 9:00 AM, Mincha: Before sunset' },
              { day: 'Holidays', time: 'Times vary - please call for details' }
            ] :
            // If no business hours, return empty array so getRestaurantStatus returns "Hours not available"
            []
        }
      }
    },

    // Location and description
    address: shul.address || `${shul.city}, ${shul.state} ${shul.zip_code}`,
    description: shul.description,
    location: shul.latitude && shul.longitude ? {
      latitude: shul.latitude,
      longitude: shul.longitude
    } : undefined,
    userLocation: userLocation || undefined
  };
}

export default function ShulPage() {
  const params = useParams();
  const router = useRouter();
  const [shulData, setShulData] = useState<RealShul | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { userLocation, requestLocation, permissionStatus } = useLocation();

  const shulId = params.id as string;

  // Auto-request location if permission is granted but location is null
  useEffect(() => {
    if (permissionStatus === 'granted' && !userLocation) {
      console.log('🔄 Auto-requesting location since permission is granted but location is null');
      requestLocation();
    }
  }, [permissionStatus, userLocation, requestLocation]);

  useEffect(() => {
    const fetchShul = async () => {
      if (!shulId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/shuls/${shulId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        if (!data.success || !data.data) {
          throw new Error('Invalid response format');
        }

        setShulData(data.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching shul:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShul();
  }, [shulId]);

  // Transform shul data to listing format
  const listingData = shulData ? transformShulToListingData(shulData, userLocation) : null;
  
  // Debug logging to see what's happening
  console.log('🔍 Shul Distance Debug:', {
    userLocation,
    permissionStatus,
    shulData: shulData ? {
      id: shulData.id,
      name: shulData.name,
      lat: shulData.latitude,
      lng: shulData.longitude
    } : null
  });

  // Update favorites handling
  if (listingData && shulData) {
    const isLiked = isFavorite(shulData.id.toString());
    listingData.header!.isFavorited = isLiked;
    listingData.header!.onFavorite = () => {
      toggleFavorite({
        id: shulData.id.toString(),
        name: shulData.name
      });
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading synagogue details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Synagogue Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!listingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No synagogue data available</p>
          <button
            onClick={() => router.back()}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

          return (
            <div>
              {/* Temporary debug panel */}
              {!userLocation && (
                <div className="bg-yellow-100 border border-yellow-300 p-4 mb-4 rounded">
                  <p><strong>🔍 Debug Info:</strong></p>
                  <p>• Permission Status: <code>{permissionStatus}</code></p>
                  <p>• User Location: <code>{userLocation ? 'Available' : 'null'}</code></p>
                  <p>• Shul Coordinates: <code>{shulData?.latitude && shulData?.longitude ? 'Available' : 'Missing'}</code></p>
                  
                  {permissionStatus !== 'denied' && (
                    <button 
                      onClick={() => {
                        console.log('🔄 Manual location request triggered');
                        requestLocation();
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded mt-2 hover:bg-blue-600"
                    >
                      Request Location Now
                    </button>
                  )}
                  
                  {permissionStatus === 'denied' && (
                    <p className="text-red-600 mt-2">
                      ❌ Location permission denied. Please enable in browser settings.
                    </p>
                  )}
                </div>
              )}
              
              <ListingPage 
                data={listingData}
                loading={loading}
                error={error}
              />
            </div>
          );
}