'use client';

import { useEffect, useState } from 'react';

export default function TestRestaurantsPage() {
  const [status, setStatus] = useState('Loading...');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        // Test 1: Direct backend API
        setStatus('Testing direct backend API...');
        const backendResponse = await fetch('https://api.jewgo.app/api/restaurants?limit=3');
        const backendData = await backendResponse.json();
        console.log('Backend API response:', backendData);
        
        // Test 2: Frontend API route
        setStatus('Testing frontend API route...');
        const frontendResponse = await fetch('/api/restaurants-with-images?limit=3');
        const frontendData = await frontendResponse.json();
        console.log('Frontend API response:', frontendData);
        
        setData({
          backend: {
            status: backendResponse.status,
            success: backendData.success || !!backendData.restaurants,
            count: backendData.restaurants?.length || 0,
            total: backendData.total,
            firstRestaurant: backendData.restaurants?.[0]?.name
          },
          frontend: {
            status: frontendResponse.status,
            success: frontendData.success,
            count: frontendData.data?.length || 0,
            total: frontendData.total,
            firstRestaurant: frontendData.data?.[0]?.name,
            error: frontendData.error,
            message: frontendData.message
          }
        });
        setStatus('Tests completed');
      } catch (err) {
        console.error('Test error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('Test failed');
      }
    }
    
    fetchData();
  }, []);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Restaurant API Test</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p className="font-semibold">Status: {status}</p>
        {error && <p className="text-red-600 mt-2">Error: {error}</p>}
      </div>
      
      {data && (
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h2 className="font-bold mb-2">Backend API (api.jewgo.app)</h2>
            <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
              {JSON.stringify(data.backend, null, 2)}
            </pre>
          </div>
          
          <div className="p-4 border rounded">
            <h2 className="font-bold mb-2">Frontend API Route (/api/restaurants-with-images)</h2>
            <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
              {JSON.stringify(data.frontend, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 rounded">
        <p className="text-sm">Check the browser console for detailed logs.</p>
        <p className="text-sm mt-2">
          This page tests both the backend API directly and the frontend API route.
        </p>
      </div>
    </div>
  );
}