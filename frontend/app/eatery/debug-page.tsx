'use client';

import React, { useState, useEffect } from 'react';

export default function DebugEateryPage() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStep(1);

    // Test basic React functionality
    setTimeout(() => {
      setStep(2);
    }, 1000);

    // Test API import
    setTimeout(async () => {
      try {
        await import('@/lib/api/restaurants');
        setStep(3);
      } catch (_err) {
        // // console.error('DebugEateryPage: API import failed:', _err);
        setError(`API import failed: ${_err instanceof Error ? _err.message : 'Unknown error'}`);
      }
    }, 2000);

    // Test component imports
    setTimeout(async () => {
      try {
        await import('@/components/eatery/ui/EateryCard');
        setStep(4);
      } catch (_err) {
        // // console.error('DebugEateryPage: EateryCard import failed:', _err);
        setError(`EateryCard import failed: ${_err instanceof Error ? _err.message : 'Unknown error'}`);
      }
    }, 3000);

    // Test navigation imports
    setTimeout(async () => {
      try {
        await import('@/components/navigation/ui/CategoryTabs');
        setStep(5);
      } catch (_err) {
        // // console.error('DebugEateryPage: CategoryTabs import failed:', _err);
        setError(`CategoryTabs import failed: ${_err instanceof Error ? _err.message : 'Unknown error'}`);
      }
    }, 4000);

  }, []);

  const steps = [
    'Component mounted',
    'Basic React functionality',
    'API import test',
    'EateryCard component import',
    'CategoryTabs component import',
    'All tests complete'
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Eatery Page Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Debug Progress</h2>
          <div className="space-y-2">
            {steps.map((stepText, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < step ? 'bg-green-500 text-white' : 
                  index === step ? 'bg-blue-500 text-white animate-pulse' : 
                  'bg-gray-200 text-gray-500'
                }`}>
                  {index < step ? '✓' : index === step ? '...' : index + 1}
                </div>
                <span className={`text-sm ${
                  index < step ? 'text-green-600' : 
                  index === step ? 'text-blue-600 font-medium' : 
                  'text-gray-500'
                }`}>
                  {stepText}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Detected</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Next Steps</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Check browser console for detailed error messages</p>
            <p>• Verify all component imports are working</p>
            <p>• Test API connectivity</p>
            <p>• Check for missing dependencies</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
