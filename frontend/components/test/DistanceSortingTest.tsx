'use client';

import React, { useState, useEffect } from 'react';
import { sortRestaurantsByDistance, formatDistance } from '@/lib/utils/distance';
import { Restaurant } from '@/lib/types/restaurant';

// Mock restaurant data
const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Restaurant A',
    latitude: 25.7617,
    longitude: -80.1918,
    address: '123 Main St, Miami, FL',
    city: 'Miami',
    state: 'FL',
    zip_code: '33101',
    phone_number: '305-555-0101',
    website: 'https://restaurant-a.com',
    certifying_agency: 'OU',
    kosher_category: 'Meat',
    listing_type: 'restaurant',
    price_range: '$$',
    rating: 4.5,
    review_count: 100,
    image_url: '/images/restaurant-a.jpg',
    is_open: true,
    status: 'open',
    hours: {},
    category: { name: 'Restaurant' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Restaurant B',
    latitude: 25.7907,
    longitude: -80.1300,
    address: '456 Oak Ave, Miami Beach, FL',
    city: 'Miami Beach',
    state: 'FL',
    zip_code: '33139',
    phone_number: '305-555-0202',
    website: 'https://restaurant-b.com',
    certifying_agency: 'Star-K',
    kosher_category: 'Dairy',
    listing_type: 'restaurant',
    price_range: '$$$',
    rating: 4.2,
    review_count: 75,
    image_url: '/images/restaurant-b.jpg',
    is_open: true,
    status: 'open',
    hours: {},
    category: { name: 'Restaurant' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Restaurant C',
    latitude: 25.7617,
    longitude: -80.1918,
    address: '789 Pine St, Miami, FL',
    city: 'Miami',
    state: 'FL',
    zip_code: '33101',
    phone_number: '305-555-0303',
    website: 'https://restaurant-c.com',
    certifying_agency: 'OU',
    kosher_category: 'Pareve',
    listing_type: 'restaurant',
    price_range: '$',
    rating: 4.8,
    review_count: 150,
    image_url: '/images/restaurant-c.jpg',
    is_open: false,
    status: 'closed',
    hours: {},
    category: { name: 'Restaurant' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default function DistanceSortingTest() {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sortedRestaurants, setSortedRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });
      
      // Sort restaurants by distance
      const sorted = sortRestaurantsByDistance(mockRestaurants, { latitude, longitude });
      setSortedRestaurants(sorted);
      
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Unable to get your location. Please check your browser settings.');
    } finally {
      setLocationLoading(false);
    }
  };

  const resetLocation = () => {
    setUserLocation(null);
    setSortedRestaurants(mockRestaurants);
    setLocationError(null);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Distance Sorting Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Location Status</h3>
        {userLocation ? (
          <div>
            <p>✅ Location enabled</p>
            <p>Latitude: {userLocation.latitude}</p>
            <p>Longitude: {userLocation.longitude}</p>
            <button 
              onClick={resetLocation}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset Location
            </button>
          </div>
        ) : (
          <div>
            <p>❌ No location set</p>
            <button 
              onClick={requestLocation}
              disabled={locationLoading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: locationLoading ? 'not-allowed' : 'pointer',
                opacity: locationLoading ? 0.6 : 1
              }}
            >
              {locationLoading ? 'Getting Location...' : 'Enable Location'}
            </button>
          </div>
        )}
        
        {locationError && (
          <p style={{ color: '#dc3545' }}>Error: {locationError}</p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Restaurants {userLocation ? '(Sorted by Distance)' : '(Original Order)'}</h3>
        {sortedRestaurants.map((restaurant, index) => {
          const distance = userLocation ? 
            Math.sqrt(
              Math.pow(restaurant.latitude - userLocation.latitude, 2) + 
              Math.pow(restaurant.longitude - userLocation.longitude, 2)
            ) * 111 : null; // Rough conversion to km
          
          return (
            <div 
              key={restaurant.id} 
              style={{ 
                padding: '15px', 
                margin: '10px 0', 
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}
            >
              <h4>{index + 1}. {restaurant.name}</h4>
              <p>Address: {restaurant.address}</p>
              <p>Kosher Agency: {restaurant.certifying_agency}</p>
              <p>Rating: {restaurant.rating} ⭐ ({restaurant.review_count} reviews)</p>
              {distance !== null && (
                <p style={{ fontWeight: 'bold', color: '#007bff' }}>
                  Distance: {formatDistance(distance)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
        <h3>Test Instructions</h3>
        <ol>
          <li>Click "Enable Location" to get your current location</li>
          <li>Watch the restaurants reorder by distance from your location</li>
          <li>Click "Reset Location" to return to the original order</li>
          <li>Check the browser console for debugging information</li>
        </ol>
      </div>
    </div>
  );
}
