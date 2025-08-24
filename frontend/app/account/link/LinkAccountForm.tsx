"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Identity {
  id: string;
  provider: string;
  identity_data?: {
    sub?: string;
    email?: string;
  };
}

interface LinkAccountFormProps {
  user: any;
  identities: Identity[];
}

export default function LinkAccountForm({ user: _user, identities }: LinkAccountFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleLinkAccounts = async () => {
    setPending(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/account/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'link',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to link accounts');
        return;
      }

      if (result.requiresReAuth) {
        // Show re-authentication options
        setSuccess('Please re-authenticate with one of your existing providers to link accounts.');
        return;
      }

      setSuccess('Accounts linked successfully!');
      
      // Redirect to account page after a short delay
      setTimeout(() => {
        router.push('/account');
      }, 2000);
      
    } catch (_err) {
      // Linking error occurred
      setError('Failed to link accounts. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const handleReAuthenticate = async (provider: string) => {
    setPending(true);
    setError(null);
    
    try {
      const response = await fetch('/api/account/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reauthenticate',
          provider,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to initiate re-authentication');
        return;
      }

      // Redirect to the re-authentication URL
      window.location.href = result.redirectUrl;
      
    } catch (_err) {
      // Re-authentication error occurred
      setError('Failed to initiate re-authentication. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const handleSkipLinking = () => {
    // Redirect to account page without linking
    router.push('/account');
  };

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'apple':
        return 'Apple';
      case 'google':
        return 'Google';
      case 'email':
        return 'Email';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          Multiple Accounts Detected
        </h3>
        <p className="text-sm text-blue-700">
          We found {identities.length} accounts associated with your email address:
        </p>
        <ul className="mt-2 space-y-1">
          {identities.map((identity) => (
            <li key={identity.id} className="text-sm text-blue-700 flex items-center">
              <span className="mr-2">•</span>
              {getProviderDisplayName(identity.provider)} account
              {identity.identity_data?.email && (
                <span className="text-blue-600 ml-1">
                  ({identity.identity_data.email})
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {success && (
        <div className="text-green-600 text-sm text-center bg-green-50 border border-green-200 rounded-md p-3">
          {success}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleLinkAccounts}
          disabled={pending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {pending ? "Checking Accounts..." : "Link Accounts"}
        </button>
        
        {success && success.includes('re-authenticate') && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 text-center">
              Choose a provider to re-authenticate with:
            </p>
            {identities.map((identity) => (
              <button
                key={identity.id}
                type="button"
                onClick={() => handleReAuthenticate(identity.provider)}
                disabled={pending}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Re-authenticate with {getProviderDisplayName(identity.provider)}
              </button>
            ))}
          </div>
        )}
        
        <button
          type="button"
          onClick={handleSkipLinking}
          disabled={pending}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Skip for Now
        </button>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Linking accounts will merge your data and allow you to sign in with any of your connected methods.
        </p>
      </div>
    </div>
  );
}
