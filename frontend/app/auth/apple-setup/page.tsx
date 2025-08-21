'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AppleOAuthSetupPage() {
  const router = useRouter();

  const handleBackToSignIn = () => {
    router.push('/auth/signin');
  };

  const handleContinueWithEmail = () => {
    router.push('/auth/signin');
  };

  return (
    <div className="min-h-screen bg-neutral-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-jewgo-400 rounded-full flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Apple Sign-In Setup
          </h2>
          <p className="text-neutral-400">
            Apple OAuth is being configured for JewGo
          </p>
        </div>

        {/* Setup Status */}
        <div className="bg-neutral-700 rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-6 w-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Configuration Required
              </h3>
              <p className="text-sm text-neutral-400">
                Apple OAuth needs to be set up in Supabase Dashboard
              </p>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <div className="h-5 w-5 bg-neutral-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-neutral-300">1</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-neutral-300">
                  Configure Apple Developer Console
                </p>
                <p className="text-xs text-neutral-500">
                  Create Services ID and generate client secret
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <div className="h-5 w-5 bg-neutral-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-neutral-300">2</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-neutral-300">
                  Enable Apple provider in Supabase
                </p>
                <p className="text-xs text-neutral-500">
                  Add client ID and secret to authentication settings
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <div className="h-5 w-5 bg-neutral-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-neutral-300">3</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-neutral-300">
                  Configure redirect URLs
                </p>
                <p className="text-xs text-neutral-500">
                  Set up proper callback URLs in both Apple and Supabase
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="bg-neutral-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">
                Setup Documentation
              </h4>
              <p className="text-xs text-neutral-400">
                Complete step-by-step guide available
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Link
              href="/docs/setup/APPLE_OAUTH_SUPABASE_SETUP.md"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View Setup Guide →
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleContinueWithEmail}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-neutral-800 bg-jewgo-400 hover:bg-jewgo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jewgo-500 transition-colors"
          >
            Continue with Email Sign-In
          </button>

          <button
            onClick={handleBackToSignIn}
            className="w-full flex justify-center py-3 px-4 border border-neutral-600 rounded-md shadow-sm text-sm font-medium text-neutral-300 bg-transparent hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 transition-colors"
          >
            Back to Sign In
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-neutral-500">
            Apple Sign-In will be available once configuration is complete
          </p>
        </div>
      </div>
    </div>
  );
}
