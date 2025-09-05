"use client";

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Header } from '@/components/layout';
import { CategoryTabs } from '@/components/core';
import { BottomNavigation } from '@/components/core';

export default function NetworkPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('network');

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
        router.push('/specials');
        break;
      case 'eatery':
        router.push('/eatery');
        break;
      case 'stores':
        router.push('/stores');
        break;
      case 'network':
        // Already on network page, just update the tab
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <Header />
      
      {/* Navigation Tabs */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <CategoryTabs activeTab={activeTab} onTabChange={_handleTabChange} />
      </div>

      {/* Coming Soon Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Network</h1>
            <p className="text-lg text-gray-600 mb-6">
              Coming Soon
            </p>
            <p className="text-gray-500 mb-8">
              We&apos;re building a community network to help you connect with other Jewish community members, 
              find local events, and build meaningful relationships. This feature will be available soon.
            </p>
            <button
              onClick={() => router.push('/shuls')}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Find Local Shuls
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation size="compact" showLabels="active-only" />
    </div>
  );
}
