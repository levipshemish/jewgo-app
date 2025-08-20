"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DebugRoutingPage() {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [redirectTest, setRedirectTest] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const testRedirect = (path: string) => {
    setRedirectTest(`Testing redirect to: ${path}`);
    console.log(`Debug: Testing redirect to ${path}`);
    
    setTimeout(() => {
      router.push(path);
    }, 500);
  };

  const testReplace = (path: string) => {
    setRedirectTest(`Testing replace to: ${path}`);
    console.log(`Debug: Testing replace to ${path}`);
    
    setTimeout(() => {
      router.replace(path);
    }, 500);
  };

  const testWindowLocation = (path: string) => {
    setRedirectTest(`Testing window.location to: ${path}`);
    console.log(`Debug: Testing window.location to ${path}`);
    
    setTimeout(() => {
      window.location.href = path;
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Routing Debug Page</h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Current State</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <p className="text-gray-800"><strong>Current URL:</strong> {currentUrl}</p>
              <p className="text-gray-800"><strong>Pathname:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'Loading...'}</p>
              <p className="text-gray-800"><strong>Search:</strong> {typeof window !== 'undefined' ? window.location.search : 'Loading...'}</p>
              <p className="text-gray-800"><strong>Hash:</strong> {typeof window !== 'undefined' ? window.location.hash : 'Loading...'}</p>
            </div>
          </div>

          {redirectTest && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirect Test</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-blue-800">{redirectTest}</p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Router Tests</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => testRedirect('/')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                router.push('/')
              </button>
              <button
                onClick={() => testRedirect('/profile')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                router.push('/profile')
              </button>
              <button
                onClick={() => testRedirect('/profile/settings')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                router.push('/profile/settings')
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Replace Tests</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => testReplace('/')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                router.replace('/')
              </button>
              <button
                onClick={() => testReplace('/profile')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                router.replace('/profile')
              </button>
              <button
                onClick={() => testReplace('/profile/settings')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                router.replace('/profile/settings')
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Window Location Tests</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => testWindowLocation('/')}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                window.location.href = '/'
              </button>
              <button
                onClick={() => testWindowLocation('/profile')}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                window.location.href = '/profile'
              </button>
              <button
                onClick={() => testWindowLocation('/profile/settings')}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                window.location.href = '/profile/settings'
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Navigation Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-center"
              >
                Link to Home
              </Link>
              <Link
                href="/profile"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-center"
              >
                Link to Profile
              </Link>
              <Link
                href="/profile/settings"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-center"
              >
                Link to Profile Settings
              </Link>
            </div>
          </div>

          <div className="flex space-x-4">
            <Link
              href="/test-auth"
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              Test Auth Page
            </Link>
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
