'use client';

import { useState, useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { extractIsAnonymous } from '@/lib/utils/auth-utils';

declare global {
  interface Window {
    turnstile: {
      ready: (callback: () => void) => void;
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
    };
    handleTurnstileCallback: (token: string) => void;
  }
}

export default function TestTurnstilePage() {
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Load Turnstile script manually to avoid async/defer issues
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.turnstile && !scriptRef.current) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.onload = () => {
        console.log('Turnstile script loaded');
      };
      script.onerror = () => {
        console.error('Failed to load Turnstile script');
      };
      document.head.appendChild(script);
      scriptRef.current = script;
    }
  }, []);

  // Make callback available globally
  if (typeof window !== 'undefined') {
    window.handleTurnstileCallback = (token: string) => {
      console.log('Turnstile token received:', token);
      setToken(token);
    };
  }

  const testAnonymousAuth = async () => {
    if (!token) {
      alert('Please complete the Turnstile challenge first');
      return;
    }

    setIsLoading(true);
    try {
      // Check for existing anonymous session first
      const { data: { user }, error: getUserError } = await supabaseBrowser.auth.getUser();
      
      if (!getUserError && user && extractIsAnonymous(user)) {
        setResult({ 
          status: 200, 
          data: { 
            ok: true, 
            user_id: user.id,
            message: 'Anonymous session already exists' 
          } 
        });
        return;
      }

      // Call secure server endpoint enforcing Turnstile
      const response = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ turnstileToken: token })
      });

      const result = await response.json();

      if (!response.ok) {
        setResult({ status: response.status, data: result });
        return;
      }

      setResult({ status: 200, data: result });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
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
                data-appearance="interaction-only"
                data-execution="execute"
                data-refresh-expired="auto"
                data-response-field-name="cf-turnstile-response"
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


    </div>
  );
}
