'use client';

import { Store, Droplets, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

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
    {/* Marketplace building */}
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-8h6v8" />
    <path d="M7 7v14" />
    <path d="M17 7v14" />
    {/* Marketplace symbol */}
    <path d="M12 3l2 4h-4l2-4z" />
  </svg>
);

const ChevronLeft: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

// Types & config
export type CategoryId = 'mikvah' | 'shuls' | 'marketplace' | 'shtel' | 'eatery' | 'stores';

export interface Category {
  id: CategoryId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
}

interface CategoryTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  activeTab, onTabChange, className = ''
}) => {
  const router = useRouter();
  const [pathname, setPathname] = useState('/mikvah');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Standard category navigation for all pages
  const categories = useMemo(() => [
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
  ], []);

  // Update pathname when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setPathname(window.location.pathname);
    };
    
    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Check if we need scroll controls
  useEffect(() => {
    const checkScroll = () => {
      if (!scrollRef.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 1);
    };

    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        scrollElement.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [mounted]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = 200;
    const currentScroll = scrollRef.current.scrollLeft;
    const targetScroll = direction === 'left' 
      ? Math.max(0, currentScroll - scrollAmount)
      : currentScroll + scrollAmount;
    
    scrollRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  const handleTabClick = (category: Category) => {
    if (onTabChange) {
      onTabChange(category.id);
    }
    router.push(category.href);
  };

  const handleKeyDown = (event: React.KeyboardEvent, category: Category, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleTabClick(category);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = Math.max(0, index - 1);
        setFocusedIndex(prevIndex);
        break;
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = Math.min(categories.length - 1, index + 1);
        setFocusedIndex(nextIndex);
        break;
    }
  };

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="relative">
        {/* Left scroll button */}
        {showLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 bg-white/80 backdrop-blur-sm px-2 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {/* Right scroll button */}
        {showRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 bg-white/80 backdrop-blur-sm px-2 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {/* Category tabs */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category, index) => {
            const Icon = category.icon;
            const isActive = activeTab === category.id || pathname.startsWith(category.href);
            const isFocused = focusedIndex === index;
            
            return (
              <button
                key={category.id}
                onClick={() => handleTabClick(category)}
                onKeyDown={(e) => handleKeyDown(e, category, index)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200
                  ${isActive 
                    ? 'bg-black text-white shadow-sm' 
                    : 'bg-transparent text-gray-600 hover:bg-gray-100'
                  }
                  ${isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                `}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={isFocused ? 0 : -1}
              >
                <Icon size={isMobile ? 18 : 20} />
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;
