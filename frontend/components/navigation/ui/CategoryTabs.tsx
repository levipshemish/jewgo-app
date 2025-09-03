'use client';

import { Store, Droplets, Ticket } from 'lucide-react';
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

// Custom Shtel (Jewish community marketplace) icon component
const Shtel: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
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
    {/* Community buildings */}
    <path d="M2 20h20" />
    <path d="M4 20V10l4-3 4 3v10" />
    <path d="M14 20V8l4-3 4 3v12" />
    {/* Star of David symbol */}
    <path d="M8 4l1 1.5L10.5 6L9 7.5L8 9l-1-1.5L5.5 6L7 4.5z" />
    {/* Market stalls */}
    <path d="M6 14h4" />
    <path d="M6 16h4" />
    <path d="M16 12h4" />
    <path d="M16 14h4" />
  </svg>
);

interface CategoryTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  activeTab, onTabChange, className = ''
}) => {
  const router = useRouter();

  // Standard category navigation for all pages
  const categories = [
    {
      id: 'mikvah',
      label: 'Mikvah',
      icon: Droplets,
      href: '/mikvah'
    },
    {
      id: 'shuls',
      label: 'Shuls',
      icon: Synagogue,
      href: '/shuls'
    },
    {
      id: 'marketplace',
      label: 'Shuk',
      icon: Ticket,
      href: '/marketplace'
    },
    {
      id: 'shtel',
      label: 'Shtetl',
      icon: Shtel,
      href: '/shtel'
    },
    {
      id: 'eatery',
      label: 'Eatery',
      icon: KitchenTools,
      href: '/eatery'
    },
    {
      id: 'stores',
      label: 'Stores',
      icon: Store,
      href: '/stores'
    }
  ];

  const handleTabClick = (category: typeof categories[0]) => {
    if (onTabChange) {
      onTabChange(category.id);
    }
    router.push(category.href);
  };

  return (
    <div className={`bg-white px-3 sm:px-4 lg:px-6 py-2 lg:py-3 border-b border-gray-100 ${className}`}>
      <div className="max-w-screen-sm sm:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-2xl mx-auto">
        <div className="flex items-center space-x-1 lg:space-x-2 overflow-x-auto hide-scrollbar">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeTab === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => handleTabClick(category)}
                role="tab"
                aria-selected={isActive}
                className={`flex flex-col items-center justify-center min-w-0 flex-1 h-14 lg:h-16 rounded-xl transition-all duration-200 whitespace-nowrap category-tab-button ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                style={{
                  minHeight: '44px',
                  minWidth: '44px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  cursor: 'pointer'
                }}
              >
                <Icon 
                  size={27} 
                  className={`${isActive ? 'text-white' : 'text-gray-600'} mb-1 lg:w-5 lg:h-5`} 
                />
                <span className={`text-xs lg:text-sm font-bold truncate px-1 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs; 