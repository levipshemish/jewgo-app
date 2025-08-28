'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/layout';
import { BottomNavigation } from '@/components/navigation/ui';
import { MarketplaceListing } from '@/lib/types/marketplace';

// interface ShtełProductPageProps {
//   params: {
//     id: string;
//   };
// }

export default function ShtełProductPage() {
  const router = useRouter();
  const params = useParams();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchListing(params.id as string);
    }
  }, [params?.id]);

  const fetchListing = async (id: string) => {
    try {
      setLoading(true);
      // For now, return a sample listing
      // In production, this would call: /api/shtel-listings/${id}
      
      const sampleListing: MarketplaceListing = {
        id,
        kind: 'regular',
        txn_type: 'sale',
        title: 'Mezuzah Case - Sterling Silver',
        description: 'Beautiful handcrafted sterling silver mezuzah case. Kosher scroll included from Rabbi Goldstein. Perfect for any Jewish home.',
        price_cents: 12000,
        currency: 'USD',
        condition: 'new',
        category_id: 1,
        category_name: 'Judaica',
        city: 'Miami Beach',
        region: 'FL',
        country: 'US',
        seller_name: 'Sarah Cohen',
        endorse_up: 15,
        endorse_down: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        images: ['/images/default-restaurant.webp'],
        thumbnail: '/images/default-restaurant.webp'
      };

      setListing(sampleListing);
    } catch (err) {
      setError('Failed to load listing');
      console.error('Error fetching listing:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Listing Not Found</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            {error || 'The listing you are looking for could not be found.'}
          </p>
          <button
            onClick={() => router.push('/shtel')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Shtel
          </button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const formatPrice = (priceCents: number) => {
    if (priceCents === 0) {
      return 'Free (Gemach)';
    }
    return `$${(priceCents / 100).toFixed(2)}`;
  };

  const formatCondition = (condition: string) => {
    switch (condition) {
      case 'new': return 'New';
      case 'used_like_new': return 'Like New';
      case 'used_good': return 'Good Condition';
      case 'used_fair': return 'Fair Condition';
      default: return condition;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Navigation */}
        <button
          onClick={() => router.push('/shtel')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Shtel
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Image */}
          <div className="aspect-w-16 aspect-h-9 bg-gray-200">
            <img
              src={listing.thumbnail || listing.images?.[0] || '/images/default-restaurant.webp'}
              alt={listing.title}
              className="w-full h-64 object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {listing.category_name}
                  </span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {formatCondition(listing.condition)}
                  </span>
                  {listing.price_cents === 0 && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      🤝 Gemach
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(listing.price_cents)}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{listing.description}</p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Condition:</span>
                    <span className="text-gray-900">{formatCondition(listing.condition)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="text-gray-900">{listing.category_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="text-gray-900">{listing.city}, {listing.region}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Seller</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="text-gray-900">{listing.seller_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Since:</span>
                    <span className="text-gray-900">2023</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Community Rating:</span>
                    <div className="flex items-center">
                      <span className="text-yellow-400">★★★★★</span>
                      <span className="text-gray-600 ml-1">(4.8)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                {listing.price_cents === 0 ? 'Request Item' : 'Contact Seller'}
              </button>
              <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}