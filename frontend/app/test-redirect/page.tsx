'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TestRedirectPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          console.log('Redirecting to profile settings...');
          router.push('/profile/settings');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Test Redirect Page
          </h2>
          <p className="text-gray-600 mb-4">
            This page will automatically redirect to the profile settings page in:
          </p>
          <div className="text-4xl font-bold text-blue-600 mb-4">
            {countdown}
          </div>
          <p className="text-sm text-gray-500">
            If the redirect doesn't work, there might be an issue with client-side navigation.
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => {
              console.log('Manual redirect to profile settings...');
              router.push('/profile/settings');
            }}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Manual Redirect to Profile Settings
          </button>
          
          <button
            onClick={() => {
              console.log('Manual redirect to sign-in...');
              router.push('/auth/signin');
            }}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Manual Redirect to Sign-In
          </button>
          
          <button
            onClick={() => {
              console.log('Manual redirect to home...');
              router.push('/');
            }}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Manual Redirect to Home
          </button>
        </div>
      </div>
    </div>
  );
}
