'use client';

import React, { useState, useEffect } from 'react';

export default function TestRestaurantsPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTests = async () => {
      const tests: any = {};
      
      try {
        // Test 1: Basic fetch without any parameters
        const response1 = await fetch('/api/restaurants');
        const data1 = await response1.json();
        tests.test1_basic = {
          status: response1.status,
          success: data1.success,
          count: data1.data?.length || data1.restaurants?.length || 0,
          total: data1.total || data1.count || 0,
          response: data1
        };

        // Test 2: Fetch with explicit limit
        const response2 = await fetch('/api/restaurants?limit=10');
        const data2 = await response2.json();
        tests.test2_with_limit = {
          status: response2.status,
          success: data2.success,
          count: data2.data?.length || data2.restaurants?.length || 0,
          total: data2.total || data2.count || 0,
          response: data2
        };

        // Test 3: Fetch with mobile optimization
        const response3 = await fetch('/api/restaurants?mobile_optimized=true&limit=8');
        const data3 = await response3.json();
        tests.test3_mobile_optimized = {
          status: response3.status,
          success: data3.success,
          count: data3.data?.length || data3.restaurants?.length || 0,
          total: data3.total || data3.count || 0,
          response: data3
        };

        // Test 4: Direct backend call (if CORS allows)
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://jewgo.onrender.com';
          const response4 = await fetch(`${backendUrl}/api/restaurants?limit=10`);
          const data4 = await response4.json();
          tests.test4_direct_backend = {
            status: response4.status,
            data: data4,
            count: Array.isArray(data4) ? data4.length : (data4.data?.length || data4.restaurants?.length || 0)
          };
        } catch (e) {
          tests.test4_direct_backend = { error: 'CORS or connection error', details: e instanceof Error ? e.message : String(e) };
        }

      } catch (error) {
        tests.error = error instanceof Error ? error.message : String(error);
      }

      setResults(tests);
      setLoading(false);
    };

    runTests();
  }, []);

  if (loading) {
    return <div>Running restaurant API tests...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Restaurant API Test Results</h1>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
}
