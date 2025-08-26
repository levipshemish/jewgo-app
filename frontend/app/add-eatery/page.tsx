'use client';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'

import { useGuestProtection } from '@/lib/utils/guest-protection';
import EnhancedAddEateryForm from '@/components/forms/EnhancedAddEateryForm';

export default function AddEateryPage() {
  const { isLoading, isGuest } = useGuestProtection('/add-eatery');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600 mb-4">Guest users must sign in to add eateries.</p>
          <p className="text-sm text-gray-500">Redirecting to sign-in...</p>
        </div>
      </div>
    );
  }
  
  return <EnhancedAddEateryForm />;
} 