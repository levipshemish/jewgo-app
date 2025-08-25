'use client';

import { Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';

export default function SpecialsPageClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('specials');

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
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-12 h-12 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Specials</h1>
            <p className="text-lg text-gray-600 mb-6">
              Coming Soon
            </p>
            <p className="text-gray-500 mb-8">
              We&apos;re working hard to bring you exclusive deals and special offers from kosher establishments. 
              This feature will be available soon with amazing discounts and promotions.
            </p>
            <button
              onClick={() => router.push('/eatery')}
              className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Explore Eateries
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
} 