'use client';

import { Ticket, MapPin, Clock, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Header } from '@/components/layout';
import { CategoryTabs } from '@/components/core';
import { BottomNavigation } from '@/components/core';
import { SpecialsDisplay, SpecialCard } from '@/components/specials';
import { getSpecials } from '@/lib/api/specials';
import type { Special } from '@/types/specials';

export default function SpecialsPageClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('specials');
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecials = async () => {
      try {
        setLoading(true);
        const response = await getSpecials();
        setSpecials(response.data || []);
      } catch (err) {
        console.error('Failed to fetch specials:', err);
        setError('Failed to load specials. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSpecials();
  }, []);

  const _handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Navigate to different pages based on the selected tab
    switch (tab) {
      case 'mikvah':
        router.push('/mikvah');
        break;
      case 'shuls':
        router.push('/shuls');
        break;
      case 'marketplace':
        router.push('/marketplace');
        break;
      case 'shtel':
        router.push('/shtel');
        break;
      case 'specials':
        // Already on specials page, just update the tab
        break;
      case 'eatery':
        router.push('/eatery');
        break;
      case 'stores':
        router.push('/stores');
        break;
      default:
        break;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isCurrentlyActive = (special: Special) => {
    const now = new Date();
    const validFrom = new Date(special.valid_from);
    const validUntil = new Date(special.valid_until);
    return now >= validFrom && now <= validUntil;
  };

  const isUpcoming = (special: Special) => {
    const now = new Date();
    const validFrom = new Date(special.valid_from);
    return now < validFrom;
  };

  const activeSpecials = specials.filter(isCurrentlyActive);
  const upcomingSpecials = specials.filter(isUpcoming);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header />
        
        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab={activeTab} onTabChange={_handleTabChange} />
        </div>

        {/* Loading State */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading specials...</p>
          </div>
        </div>

        <BottomNavigation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header />
        
        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab={activeTab} onTabChange={_handleTabChange} />
        </div>

        {/* Error State */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>

        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <Header />
      
      {/* Navigation Tabs */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <CategoryTabs activeTab={activeTab} onTabChange={_handleTabChange} />
      </div>

      {/* Specials Content */}
      <div className="px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Ticket className="w-6 h-6 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Kosher Specials</h1>
          </div>
          <p className="text-gray-600">
            Discover amazing deals and offers from kosher establishments in your area.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{activeSpecials.length}</div>
            <div className="text-sm text-gray-600">Active Now</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{upcomingSpecials.length}</div>
            <div className="text-sm text-gray-600">Coming Soon</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{specials.length}</div>
            <div className="text-sm text-gray-600">Total Specials</div>
          </div>
        </div>

        {/* Active Specials */}
        {activeSpecials.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-gray-900">Active Now</h2>
              <span className="text-sm text-gray-500">({activeSpecials.length})</span>
            </div>
            <div className="space-y-4">
              {activeSpecials.map((special) => (
                <SpecialCard
                  key={special.id}
                  special={special}
                  compact={false}
                  showClaimButton={true}
                  showShareButton={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Specials */}
        {upcomingSpecials.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-gray-900">Coming Soon</h2>
              <span className="text-sm text-gray-500">({upcomingSpecials.length})</span>
            </div>
            <div className="space-y-4">
              {upcomingSpecials.map((special) => (
                <SpecialCard
                  key={special.id}
                  special={special}
                  compact={false}
                  showClaimButton={false}
                  showShareButton={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Specials State */}
        {specials.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Specials Available</h2>
              <p className="text-gray-600 mb-6">
                Check back later for amazing deals and offers from kosher establishments.
              </p>
              <button
                onClick={() => router.push('/eatery')}
                className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Explore Eateries
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}