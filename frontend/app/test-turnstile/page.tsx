'use client';

import { useState } from 'react';
import Script from 'next/script';

export default function TestTurnstilePage() {
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Global function for Turnstile callback
  if (typeof window !== 'undefined') {
    (window as any).handleTurnstileCallback = (token: string) => {
      console.log('Turnstile token received:', token);
      setToken(token);
    };
  }

  const handleTurnstileCallback = (token: string) => {
    console.log('Turnstile token received:', token);
    setToken(token);
  };

  const testAnonymousAuth = async () => {
    if (!token) {
      alert('Please complete the Turnstile challenge first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turnstileToken: token
        })
      });

      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Turnstile Test Page
            </h1>
            <p className="text-gray-600">
              Complete the Turnstile challenge and test anonymous authentication
            </p>
          </div>

          <div className="space-y-6">
            {/* Turnstile Widget */}
            <div className="flex justify-center">
              <div
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || 'your_site_key_here'}
                data-callback="handleTurnstileCallback"
              />
            </div>

            {/* Token Display */}
            {token && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">
                  ✅ Turnstile Token Received
                </h3>
                <p className="text-xs text-green-700 break-all">
                  {token}
                </p>
              </div>
            )}

            {/* Test Button */}
            <button
              onClick={testAnonymousAuth}
              disabled={!token || isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Testing...' : 'Test Anonymous Auth'}
            </button>

            {/* Results */}
            {result && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-800 mb-2">
                  Test Results
                </h3>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Turnstile Script */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
    </div>
  );
}
