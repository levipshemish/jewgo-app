'use client';

import { useEffect, useRef, useState } from 'react';
import { loadMaps } from '@/lib/maps/loader';

export default function TestMarkersPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('Loading...');
  const [markers, setMarkers] = useState<any[]>([]);

  useEffect(() => {
    const testMarkers = async () => {
      try {
        setStatus('Loading Google Maps...');
        const google = await loadMaps();
        
        if (!mapRef.current) {
          setStatus('Map container not found');
          return;
        }

        setStatus('Creating map...');
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 25.7617, lng: -80.1918 }, // Miami
          zoom: 12,
        });

        setStatus('Checking AdvancedMarkerElement availability...');
        console.log('google.maps.marker:', google.maps.marker);
        console.log('google.maps.marker?.AdvancedMarkerElement:', google.maps.marker?.AdvancedMarkerElement);

        if (google.maps.marker?.AdvancedMarkerElement) {
          setStatus('Creating AdvancedMarkerElement markers...');
          
          // Create test markers
          const testData = [
            { name: 'Test Restaurant 1', lat: 25.7617, lng: -80.1918, rating: 4.5 },
            { name: 'Test Restaurant 2', lat: 25.7717, lng: -80.1818, rating: 4.2 },
            { name: 'Test Restaurant 3', lat: 25.7517, lng: -80.2018, rating: 4.8 },
          ];

          const newMarkers = testData.map((restaurant) => {
            const position = new google.maps.LatLng(restaurant.lat, restaurant.lng);
            
            // Create marker content
            const content = document.createElement('div');
            content.className = 'marker-content';
            content.innerHTML = `
              <div class="marker-bubble">
                <div class="marker-title">${restaurant.name}</div>
                <div class="marker-rating">⭐ ${restaurant.rating}</div>
              </div>
            `;

            const marker = new google.maps.marker.AdvancedMarkerElement({
              position,
              content,
              title: restaurant.name,
              map,
            });

            // Add click listener
            marker.addListener('click', () => {
              console.log('Clicked on:', restaurant.name);
              alert(`Clicked on ${restaurant.name}`);
            });

            return marker;
          });

          setMarkers(newMarkers);
          setStatus(`Successfully created ${newMarkers.length} AdvancedMarkerElement markers`);
        } else {
          setStatus('AdvancedMarkerElement not available, creating basic markers...');
          
          // Fallback to basic markers
          const testData = [
            { name: 'Test Restaurant 1', lat: 25.7617, lng: -80.1918 },
            { name: 'Test Restaurant 2', lat: 25.7717, lng: -80.1818 },
            { name: 'Test Restaurant 3', lat: 25.7517, lng: -80.2018 },
          ];

          const newMarkers = testData.map((restaurant) => {
            const position = new google.maps.LatLng(restaurant.lat, restaurant.lng);
            
            const marker = new google.maps.Marker({
              position,
              title: restaurant.name,
              map,
            });

            marker.addListener('click', () => {
              console.log('Clicked on:', restaurant.name);
              alert(`Clicked on ${restaurant.name}`);
            });

            return marker;
          });

          setMarkers(newMarkers);
          setStatus(`Successfully created ${newMarkers.length} basic markers`);
        }
      } catch (error) {
        console.error('Error in test markers:', error);
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    testMarkers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Marker Test Page</h1>
        
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <h2 className="text-lg font-semibold mb-2">Status</h2>
          <p className="text-sm text-gray-600">{status}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <h2 className="text-lg font-semibold mb-2">Map</h2>
          <div 
            ref={mapRef} 
            className="w-full h-96 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
          <p className="text-sm text-gray-600">Markers created: {markers.length}</p>
          <p className="text-sm text-gray-600">Check browser console for detailed logs</p>
        </div>
      </div>
    </div>
  );
}
