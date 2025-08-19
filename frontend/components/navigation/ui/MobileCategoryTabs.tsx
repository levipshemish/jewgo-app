'use client';

import { Store, Droplets, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

// Custom kitchen tools icon component
const KitchenTools: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12zm0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3" />
  </svg>
);

// Custom synagogue with Star of David icon component
const Synagogue: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Synagogue building */}
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-8h6v8" />
    <path d="M7 7v14" />
    <path d="M17 7v14" />
    {/* Star of David on top */}
    <path d="M12 3l1.5 2.5L16 6l-2.5 1.5L12 10l-1.5-2.5L8 6l2.5-1.5z" />
  </svg>
);

interface MobileCategoryTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const MobileCategoryTabs: React.FC<MobileCategoryTabsProps> = ({ 
  activeTab, onTabChange, }) => {
  const router = useRouter();

  const categories = [
    {
      id: 'mikvahs',
      label: 'Mikvahs',
      icon: Droplets,
      href: '/mikvahs',
    },
    {
      id: 'shuls',
      label: 'Shuls',
      icon: Synagogue,
      href: '/shuls',
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: Star,
      href: '/marketplace',
    },
    {
      id: 'eatery',
      label: 'Eatery',
      icon: KitchenTools,
      href: '/eatery',
    },
    {
      id: 'stores',
      label: 'Stores',
      icon: Store,
      href: '/stores',
    }
  ];

  const handleTabClick = (category: typeof categories[0]) => {
    if (onTabChange) {
      onTabChange(category.id);
    }
    router.push(category.href);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-3 py-2">
      <div className="w-full">
        <div className="flex items-center space-x-1 overflow-x-auto hide-scrollbar">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeTab === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => handleTabClick(category)}
                role="tab"
                aria-selected={isActive}
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon 
                  size={20} 
                  className={`${isActive ? 'text-white' : 'text-gray-600'} mb-1`} 
                />
                <span className="text-xs font-medium truncate">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileCategoryTabs; 