'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShulListing } from '@/lib/types/shul';
import ShulDetailsPage from '@/components/shuls/ShulDetailsPage';
import { Loader2 } from 'lucide-react';

export default function ShulPage() {
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<ShulListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shulId = params.id as string;

  useEffect(() => {
    const fetchShul = async () => {
      if (!shulId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/shuls/${shulId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        if (!data.success || !data.data) {
          throw new Error('Invalid response format');
        }

        setListing(data.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching shul:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShul();
  }, [shulId]);

  const handleBack = () => {
    router.back();
  };

  const handleLike = (isLiked: boolean) => {
    if (listing) {
      setListing({
        ...listing,
        isLiked
      });
    }
    // TODO: Implement actual favorites API call
    console.log('Like toggled:', isLiked);
  };

  const handleShare = () => {
    if (listing) {
      const url = window.location.href;
      const title = `${listing.leftText} - JewGo`;
      
      if (navigator.share) {
        navigator.share({
          title,
          text: `Check out ${listing.leftText} on JewGo`,
          url
        }).catch(() => {
          // Fallback to copying to clipboard
          navigator.clipboard.writeText(url);
        });
      } else {
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(url);
        // TODO: Show toast notification
        console.log('URL copied to clipboard');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading synagogue details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Synagogue Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No synagogue data available</p>
          <button
            onClick={handleBack}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <ShulDetailsPage
      listing={listing}
      onBack={handleBack}
      onLike={handleLike}
      onShare={handleShare}
    />
  );
}