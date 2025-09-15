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

// Arrow components for scroll controls
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
      id: 'eatery',
      label: 'Eatery',
      icon: KitchenTools,
      href: '/eatery'
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
      id: 'stores',
      label: 'Stores',
      icon: Store,
      href: '/stores'
    }
  ], []);

  // Active derived from URL or prop
  const activeId = useMemo<string | null>(() => {
    if (activeTab) return activeTab;
    if (!pathname) return null;
    return categories.find(c => pathname.startsWith(c.href))?.id ?? null;
  }, [activeTab, pathname, categories]);

  const needsScrolling = categories.length > 5;

  // Navigation handler
  const handleNavigation = useCallback((category: typeof categories[0]) => {
    setPathname(category.href);
    if (onTabChange) {
      onTabChange(category.id);
    }
    router.push(category.href);
  }, [onTabChange, router]);

  // Environment checks - use stricter mobile breakpoint for tab sizing
  useEffect(() => {
    if (!mounted) return;
    const update = () => setIsMobile(window.innerWidth < 640); // sm breakpoint instead of md
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [mounted]);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!mounted || !el || !isMobile || !needsScrolling) {
      setShowLeft(false); 
      setShowRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeft(scrollLeft > 5);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, [mounted, isMobile, needsScrolling]);

  // Scroll + resize observer
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !mounted) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [mounted, updateArrows]);

  // Center active
  useEffect(() => {
    if (!mounted || !isMobile || !needsScrolling || !activeId) return;
    const el = scrollRef.current; 
    if (!el) return;
    const idx = Math.max(0, categories.findIndex(c => c.id === activeId));
    const child = el.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const offset = child.offsetLeft - (el.clientWidth - child.clientWidth) / 2;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: Math.max(0, Math.min(offset, max)), behavior: 'smooth' });
  }, [activeId, mounted, isMobile, needsScrolling, categories]);

  // Arrow actions
  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' });

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) return;
    e.preventDefault();
    const currentIndex = focusedIndex >= 0 ? focusedIndex : Math.max(0, categories.findIndex(c => c.id === activeId));
    const nextIndex =
      e.key === 'ArrowLeft' ? (currentIndex > 0 ? currentIndex - 1 : categories.length - 1) :
      e.key === 'ArrowRight' ? (currentIndex < categories.length - 1 ? currentIndex + 1 : 0) :
      currentIndex;

    if (e.key === 'Enter' || e.key === ' ') {
      const category = categories[nextIndex];
      if (category) {
        handleNavigation(category);
      }
    } else {
      setFocusedIndex(nextIndex);
      const el = scrollRef.current?.children[nextIndex] as HTMLAnchorElement | undefined;
      if (el) el.focus();
    }
  };

  const containerPadding = mounted && isMobile && needsScrolling ? 'px-0' : 'px-3 sm:px-4 lg:px-6';
  const innerClasses =
    !mounted || !isMobile || !needsScrolling
      ? 'max-w-screen-2xl mx-auto flex items-center space-x-1 lg:space-x-2'
      : 'flex items-center space-x-1 overflow-x-auto scrollbar-hide px-3';

  const tabBase = 'flex flex-col items-center justify-center rounded-xl transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
  const tabSize = !mounted || !isMobile || !needsScrolling ? 'min-w-0 flex-1 h-14 lg:h-16' : 'h-12 w-20 flex-shrink-0';

  return (
    <div className={`bg-white border-b border-gray-100 py-2 lg:py-3 ${containerPadding} ${className}`}>
      <div className="relative">
        {/* Left fade & arrow */}
        {showLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
            <button
              onClick={scrollLeft}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-1.5 border border-gray-200 hover:bg-gray-50 transition-colors pointer-events-auto"
              aria-label="Scroll categories left"
              type="button"
            >
              <ChevronLeft />
            </button>
          </div>
        )}

        {/* Right fade & arrow */}
        {showRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-l from-white via-white/80 to-transparent" />
            <button
              onClick={scrollRight}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-1.5 border border-gray-200 hover:bg-gray-50 transition-colors pointer-events-auto"
              aria-label="Scroll categories right"
              type="button"
            >
              <ChevronRight />
            </button>
          </div>
        )}

        {/* Tablist */}
        <div className={`${needsScrolling && isMobile ? 'px-3' : ''}`}>
          <div
            ref={scrollRef}
            className={innerClasses}
            role="tablist"
            aria-label="Category navigation"
            aria-orientation="horizontal"
            onKeyDown={onKeyDown}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {categories.map((category, index) => {
              const Icon = category.icon;
              const isActive = category.id === activeId;
              return (
                <a
                  key={category.id}
                  href={category.href}
                  role="tab"
                  tabIndex={isActive || focusedIndex === index ? 0 : -1}
                  aria-selected={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  className={`${tabBase} ${tabSize} ${isActive ? 'bg-black text-white shadow-sm' : 'bg-transparent text-gray-600 hover:bg-gray-50'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation(category);
                  }}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(-1)}
                >
                  <Icon size={isMobile && needsScrolling ? 18 : 24} className={`${isActive ? 'text-white' : 'text-gray-600'} mb-0.5`} />
                  <span className={`${isMobile && needsScrolling ? 'text-[11px]' : 'text-xs lg:text-sm'} font-bold truncate px-0.5 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                    {category.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global scrollbar hide */}
      <style jsx global>{`
        .scrollbar-hide { 
          -ms-overflow-style: none; 
          scrollbar-width: none; 
        }
        .scrollbar-hide::-webkit-scrollbar { 
          display: none; 
        }
      `}</style>
    </div>
  );
};

export default CategoryTabs;
