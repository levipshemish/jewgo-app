'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { 
  Store, 
  Droplets, 
  Star, 
  Ticket,
  ShoppingBag, 
  Utensils, 
  Cake, 
  ChefHat,
  Home,
  Users,
  Calendar,
  Gift
} from 'lucide-react';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import styles from './UnifiedCategoryNav.module.css';

// Custom kitchen tools icon component
const KitchenTools: React.FC<{ size?: number; className?: string }> = ({ 
  size = 18, 
  className = '' 
}) => (
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
    aria-hidden="true"
  >
    <path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12zm0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3" />
  </svg>
);

// Custom synagogue with Star of David icon component
const Synagogue: React.FC<{ size?: number; className?: string }> = ({ 
  size = 18, 
  className = '' 
}) => (
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
    aria-hidden="true"
  >
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-8h6v8" />
    <path d="M7 7v14" />
    <path d="M17 7v14" />
    <path d="M12 3l1.5 2.5L16 6l-2.5 1.5L12 10l-1.5-2.5L8 6l2.5-1.5z" />
  </svg>
);

// Manual scroll fallback utility for older Safari
const scrollItemIntoViewX = (container: HTMLElement, item: HTMLElement) => {
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  
  if (itemRect.left < containerRect.left) {
    container.scrollLeft -= containerRect.left - itemRect.left;
  } else if (itemRect.right > containerRect.right) {
    container.scrollLeft += itemRect.right - containerRect.right;
  }
};

// Category configurations
const CATEGORY_SETS = {
  main: [
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
      desktopIcon: Ticket,
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
    },
    {
      id: 'rentals',
      label: 'Rentals',
      icon: Home,
      href: '/rentals',
    },
    {
      id: 'network',
      label: 'Network',
      icon: Users,
      href: '/network',
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
      href: '/events',
    },
    {
      id: 'specials',
      label: 'Specials',
      icon: Gift,
      href: '/specials',
    }
  ],
  marketplace: [
    {
      id: 'all',
      label: 'All',
      icon: ShoppingBag
    },
    {
      id: 'restaurant',
      label: 'Restaurants',
      icon: Utensils
    },
    {
      id: 'bakery',
      label: 'Bakeries',
      icon: Cake
    },
    {
      id: 'catering',
      label: 'Catering',
      icon: ChefHat
    }
  ]
} as const;

// Types
type CategorySet = keyof typeof CATEGORY_SETS;
type LayoutVariant = 'mobile' | 'desktop' | 'auto' | 'scrollable';
type ScrollBehavior = 'auto' | 'smooth' | 'instant';

interface CategoryItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  desktopIcon?: React.ComponentType<any>;
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
  disabled?: boolean;
}

interface UnifiedCategoryNavProps {
  // Core props
  categorySet?: CategorySet;
  customItems?: CategoryItem[];
  
  // State management (simplified)
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  
  // Layout
  variant?: LayoutVariant;
  scrollBehavior?: ScrollBehavior;
  showBorder?: boolean;
  showScrollControls?: boolean;
  
  // Styling
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  
  // Accessibility
  'aria-label'?: string;
  'aria-labelledby'?: string;
  
  // Navigation
  enableNavigation?: boolean;
}

export function UnifiedCategoryNav({
  categorySet = 'main',
  customItems,
  value,
  defaultValue,
  onValueChange,
  variant = 'auto',
  scrollBehavior = 'smooth',
  showBorder = true,
  showScrollControls = true,
  className = '',
  itemClassName = '',
  activeItemClassName = '',
  'aria-label': ariaLabel = 'Category navigation',
  'aria-labelledby': ariaLabelledBy,
  enableNavigation = true,
}: UnifiedCategoryNavProps) {
  const router = useRouter();
  
  // State management
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedId = value ?? internalValue;
  
  // Get items (memoized)
  const items = useMemo(() => 
    customItems || CATEGORY_SETS[categorySet], 
    [customItems, categorySet]
  );
  
  // Scrollable variant refs and state
  const scrollerRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Handle selection
  const handleSelection = useCallback((id: string) => {
    if (onValueChange) {
      onValueChange(id);
    } else {
      setInternalValue(id);
    }
  }, [onValueChange]);
  
  // Handle navigation
  const handleNavigation = useCallback((category: CategoryItem) => {
    handleSelection(category.id);
    
    if (enableNavigation && category.href) {
      router.push(category.href);
    }
  }, [handleSelection, enableNavigation, router]);
  
  // Set item ref helper
  const setItemRef = useCallback((index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  }, []);
  
  // Overflow detection for scrollable variant
  const checkOverflow = useCallback(() => {
    if (variant !== 'scrollable' || !scrollerRef.current) {return;}
    
    const scroller = scrollerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, [variant]);
  
  // Throttled overflow check
  const throttledCheckOverflow = useCallback(() => {
    requestAnimationFrame(checkOverflow);
  }, [checkOverflow]);
  
  // Setup overflow detection
  useIsomorphicLayoutEffect(() => {
    if (variant !== 'scrollable') {return;}
    
    const scroller = scrollerRef.current;
    if (!scroller) {return;}

    // Initial check
    checkOverflow();

    // Setup observers
    const resizeObserver = new ResizeObserver(throttledCheckOverflow);
    resizeObserver.observe(scroller);
    
    scroller.addEventListener('scroll', throttledCheckOverflow, { passive: true });

    return () => {
      resizeObserver.disconnect();
      scroller.removeEventListener('scroll', throttledCheckOverflow);
    };
  }, [variant, checkOverflow, throttledCheckOverflow]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (variant !== 'scrollable' || !selectedId || !scrollerRef.current || isInitialized) {return;}
    
    const selectedIndex = items.findIndex(item => item.id === selectedId);
    if (selectedIndex === -1) {return;}
    
    const selectedElement = itemRefs.current[selectedIndex];
    if (!selectedElement) {return;}
    
    try {
      selectedElement.scrollIntoView({
        behavior: scrollBehavior,
        block: 'nearest',
        inline: 'center',
      });
    } catch {
      scrollItemIntoViewX(scrollerRef.current, selectedElement);
    }
    
    setIsInitialized(true);
  }, [variant, selectedId, items, isInitialized, scrollBehavior]);
  
  // Manual scroll
  const scrollTo = useCallback((direction: 'left' | 'right') => {
    if (!scrollerRef.current) {return;}
    
    const scroller = scrollerRef.current;
    const scrollAmount = scroller.clientWidth * 0.8;
    const targetScroll = direction === 'left' 
      ? Math.max(0, scroller.scrollLeft - scrollAmount)
      : Math.min(scroller.scrollWidth - scroller.clientWidth, scroller.scrollLeft + scrollAmount);

    try {
      scroller.scrollTo({
        left: targetScroll,
        behavior: scrollBehavior,
      });
    } catch {
      scroller.scrollLeft = targetScroll;
    }
  }, [scrollBehavior]);
  
  // Get icon for category
  const getIcon = useCallback((category: CategoryItem, isMobile: boolean) => {
    if (category.desktopIcon && !isMobile) {
      return category.desktopIcon;
    }
    return category.icon;
  }, []);
  
  // Render item
  const renderItem = useCallback((category: CategoryItem, index: number, isMobile: boolean) => {
    const Icon = getIcon(category, isMobile);
    const isSelected = category.id === selectedId;
    const isDisabled = category.disabled;
    
    const baseClasses = `${styles.item} ${itemClassName}`;
    const selectedClasses = isSelected ? `${styles.selected} ${activeItemClassName}` : '';
    const itemClasses = `${baseClasses} ${selectedClasses}`.trim();
    
    const content = (
      <>
        <Icon 
          size={isMobile ? 20 : 18} 
          className={styles.icon}
        />
        <span className={styles.itemText}>{category.label}</span>
      </>
    );
    
    return (
      <li
        key={category.id}
        className={itemClasses}
        data-selected={isSelected}
        data-disabled={isDisabled}
      >
        {category.href && !isDisabled ? (
          <Link
            href={category.href}
            className={styles.link}
            onClick={() => handleNavigation(category)}
            aria-current={isSelected ? 'page' : undefined}
            ref={variant === 'scrollable' ? setItemRef(index) : undefined}
            target={category.target}
            rel={category.rel || (category.target === '_blank' ? 'noopener noreferrer' : undefined)}
          >
            {content}
          </Link>
        ) : (
          <button
            type="button"
            className={styles.button}
            onClick={() => handleNavigation(category)}
            disabled={isDisabled}
            aria-pressed={isSelected}
            ref={variant === 'scrollable' ? setItemRef(index) : undefined}
          >
            {content}
          </button>
        )}
      </li>
    );
  }, [selectedId, itemClassName, activeItemClassName, handleNavigation, variant, setItemRef, getIcon]);
  
  // Layout renderers
  const renderMobileLayout = () => (
    <div className={`${styles.mobileContainer} ${showBorder ? styles.withBorder : ''} ${className}`}>
      <div className={styles.mobileScroller}>
        {items.map((category, index) => renderItem(category, index, true))}
      </div>
    </div>
  );
  
  const renderDesktopLayout = () => (
    <div className={`${styles.desktopContainer} ${showBorder ? styles.withBorder : ''} ${className}`}>
      <div className={styles.desktopWrapper}>
        <div className={styles.desktopGrid}>
          {items.map((category, index) => renderItem(category, index, false))}
        </div>
      </div>
    </div>
  );
  
  const renderScrollableLayout = () => (
    <nav 
      className={`${styles.scrollableContainer} ${className}`}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      <ul
        ref={scrollerRef}
        className={styles.scroller}
        role="tablist"
      >
        {items.map((category, index) => renderItem(category, index, false))}
      </ul>
    </nav>
  );
  
  // Auto layout with responsive breakpoints
  const renderAutoLayout = () => (
    <>
      <div className="block sm:hidden">
        {renderMobileLayout()}
      </div>
      <div className="hidden sm:block">
        {renderDesktopLayout()}
      </div>
    </>
  );
  
  // Render based on variant
  switch (variant) {
    case 'mobile':
      return renderMobileLayout();
    case 'desktop':
      return renderDesktopLayout();
    case 'scrollable':
      return renderScrollableLayout();
    case 'auto':
    default:
      return renderAutoLayout();
  }
}

// Export types and constants
export { CATEGORY_SETS };
export type { CategorySet, LayoutVariant, CategoryItem, UnifiedCategoryNavProps };
