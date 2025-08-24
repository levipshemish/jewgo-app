'use client';

import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import { useRef, useState } from 'react';

export default function TestTurnstileDebug() {
  const turnstileRef = useRef<any>(null);
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleVerify = (token: string) => {
    // console.log('Turnstile verified with token:', token);
    setToken(token);
    setError('');
  };

  const handleError = (error: string) => {
    // console.log('Turnstile error:', error);
    setError(error);
    setToken('');
  };

  const handleExpired = () => {
    // console.log('Turnstile expired');
    setToken('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-neutral-800 p-8">
      <div className="max-w-md mx-auto bg-neutral-700 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Turnstile Debug Test</h1>
        
        <div className="space-y-4">
          <div className="bg-neutral-600 p-4 rounded">
            <h2 className="text-lg font-semibold text-white mb-2">Environment Variables</h2>
            <div className="text-sm text-gray-300 space-y-1">
              <div>NODE_ENV: {process.env.NODE_ENV}</div>
              <div>NEXT_PUBLIC_TURNSTILE_SITE_KEY: {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || 'NOT_SET'}</div>
              <div>Has Site Key: {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? 'YES' : 'NO'}</div>
            </div>
          </div>

          <div className="bg-neutral-600 p-4 rounded">
            <h2 className="text-lg font-semibold text-white mb-2">Turnstile Widget</h2>
            <TurnstileWidget
              ref={turnstileRef}
              onVerify={handleVerify}
              onError={handleError}
              onExpired={handleExpired}
              theme="dark"
              size="normal"
            />
          </div>

          {token && (
            <div className="bg-green-900/20 border border-green-700 p-4 rounded">
              <h3 className="text-green-400 font-semibold mb-2">✅ Token Received</h3>
              <div className="text-sm text-green-300 break-all">{token}</div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-700 p-4 rounded">
              <h3 className="text-red-400 font-semibold mb-2">❌ Error</h3>
              <div className="text-sm text-red-300">{error}</div>
            </div>
          )}

          <div className="bg-neutral-600 p-4 rounded">
            <h2 className="text-lg font-semibold text-white mb-2">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => turnstileRef.current?.reset()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                Reset Widget
              </button>
              <button
                onClick={() => {
                  const currentToken = turnstileRef.current?.getToken();
                  // console.log('Current token from ref:', currentToken);
                  alert(`Current token: ${currentToken || 'NO_TOKEN'}`);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                Get Current Token
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
