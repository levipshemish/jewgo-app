'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { CategoryNavProps, CategoryNavItem } from './CategoryNav.types';
import styles from './CategoryNav.module.css';

// Manual scroll fallback utility for older Safari
const scrollItemIntoViewX = (container: HTMLElement, item: HTMLElement) => {
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  
  if (itemRect.left < containerRect.left) {
    // Item is offscreen to the left
    container.scrollLeft -= containerRect.left - itemRect.left;
  } else if (itemRect.right > containerRect.right) {
    // Item is offscreen to the right
    container.scrollLeft += itemRect.right - containerRect.right;
  }
};

// Helper to map arrow keys to direction based on RTL
const mapArrowToDelta = (key: string, dir: 'ltr' | 'rtl') => {
  if (dir === 'rtl') {
    return key === 'ArrowLeft' ? 1 : key === 'ArrowRight' ? -1 : 0;
  }
  return key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0;
};

// Helper to normalize icon with accessibility attributes
const normalizeIcon = (icon: React.ReactNode): React.ReactNode => {
  if (React.isValidElement(icon) && icon.type === 'svg') {
    return React.cloneElement(icon, {
      'aria-hidden': true,
      focusable: false,
    });
  }
  return (
    <span aria-hidden="true">
      {icon}
    </span>
  );
};

export function CategoryNav({
  items,
  selectedId,
  onSelect,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: CategoryNavProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [overflowState, setOverflowState] = useState<'start' | 'end' | 'both' | 'none'>('none');
  const [isInitialized, setIsInitialized] = useState(false);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [showPrevControl, setShowPrevControl] = useState(false);
  const [showNextControl, setShowNextControl] = useState(false);
  const [prevShowPrevControl, setPrevShowPrevControl] = useState(false);
  const [prevShowNextControl, setPrevShowNextControl] = useState(false);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Memoize items to prevent unnecessary re-renders
  const memoizedItems = useMemo(() => items, [items]);

  // Helper for button props to prevent form submission
  const buttonProps = useCallback(() => ({
    type: 'button' as const,
  }), []);

  // Set item ref
  const setItemRef = useCallback((index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  // Overflow detection with rAF throttle
  const checkOverflow = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    const canScrollLeft = scrollLeft > 0;
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 1;

    let newState: typeof overflowState;
    if (canScrollLeft && canScrollRight) {
      newState = 'both';
    } else if (canScrollLeft) {
      newState = 'start';
    } else if (canScrollRight) {
      newState = 'end';
    } else {
      newState = 'none';
    }

    const newShowPrevControl = newState === 'start' || newState === 'both';
    const newShowNextControl = newState === 'end' || newState === 'both';

    setOverflowState(newState);
    setShowPrevControl(newShowPrevControl);
    setShowNextControl(newShowNextControl);
  }, []);

  // Throttled overflow check
  const throttledCheckOverflow = useCallback(() => {
    requestAnimationFrame(checkOverflow);
  }, [checkOverflow]);

  // Initialize overflow state and direction with hydration stability
  useIsomorphicLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Cache direction from computed styles
    const computedDirection = getComputedStyle(scroller).direction as 'ltr' | 'rtl';
    setDirection(computedDirection);

    // Initial overflow check
    checkOverflow();

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(throttledCheckOverflow);
    resizeObserver.observe(scroller);

    // Set up scroll listener
    scroller.addEventListener('scroll', throttledCheckOverflow);

    return () => {
      resizeObserver.disconnect();
      scroller.removeEventListener('scroll', throttledCheckOverflow);
    };
  }, [checkOverflow, throttledCheckOverflow]);

  // Handle focus management when controls become hidden
  useEffect(() => {
    if (!showPrevControl && prevShowPrevControl) {
      // Prev control was hidden
      const activeElement = document.activeElement;
      if (activeElement?.getAttribute('aria-label') === 'Scroll to previous categories') {
        // Focus was on prev button, move to current roving item
        const currentRovingItem = itemRefs.current.find(ref => ref?.getAttribute('tabIndex') === '0');
        currentRovingItem?.focus();
      }
    }
    if (!showNextControl && prevShowNextControl) {
      // Next control was hidden
      const activeElement = document.activeElement;
      if (activeElement?.getAttribute('aria-label') === 'Scroll to next categories') {
        // Focus was on next button, move to current roving item
        const currentRovingItem = itemRefs.current.find(ref => ref?.getAttribute('tabIndex') === '0');
        currentRovingItem?.focus();
      }
    }
    setPrevShowPrevControl(showPrevControl);
    setPrevShowNextControl(showNextControl);
  }, [showPrevControl, showNextControl, prevShowPrevControl, prevShowNextControl]);

  // Roving focus hook with proper key handling
  const {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    handleItemFocus,
    handleItemBlur,
  } = useRovingFocus({
    itemCount: memoizedItems.length,
    selectedId,
    onSelect,
    direction,
    itemRefs,
  });

  // Robust first focus - scroll selected item into view on first focus
  useEffect(() => {
    if (!isInitialized && selectedId && scrollerRef.current) {
      const selectedIndex = memoizedItems.findIndex(item => item.id === selectedId);
      if (selectedIndex !== -1) {
        const selectedElement = itemRefs.current[selectedIndex];
        if (selectedElement) {
          // Check if element is offscreen
          const rect = selectedElement.getBoundingClientRect();
          const scrollerRect = scrollerRef.current.getBoundingClientRect();
          
          if (rect.left < scrollerRect.left || rect.right > scrollerRect.right) {
            // Respect reduced motion
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            
            try {
              if (prefersReducedMotion) {
                // Use manual scroll fallback
                scrollItemIntoViewX(scrollerRef.current, selectedElement);
              } else {
                selectedElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest',
                  inline: 'nearest',
                });
              }
            } catch (error) {
              // Fallback to manual scroll
              scrollItemIntoViewX(scrollerRef.current, selectedElement);
            }
          }
        }
      }
      setIsInitialized(true);
    }
  }, [selectedId, memoizedItems, isInitialized]);

  // Manual scroll handlers with fallback
  const scrollTo = useCallback((direction: 'left' | 'right') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const scrollAmount = scroller.clientWidth * 0.8;
    const targetScroll = direction === 'left' 
      ? Math.max(0, scroller.scrollLeft - scrollAmount)
      : Math.min(scroller.scrollWidth - scroller.clientWidth, scroller.scrollLeft + scrollAmount);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    try {
      scroller.scrollTo({
        left: targetScroll,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    } catch (error) {
      // Fallback to manual scroll
      scroller.scrollLeft = targetScroll;
    }
  }, []);

  // Accessibility attributes
  const ariaAttributes = useMemo(() => {
    const attrs: Record<string, string> = {};
    if (ariaLabel && !ariaLabelledBy) attrs['aria-label'] = ariaLabel;
    if (ariaLabelledBy) attrs['aria-labelledby'] = ariaLabelledBy;
    return attrs;
  }, [ariaLabel, ariaLabelledBy]);

  return (
    <nav 
      className={`${styles.categoryNav} ${className || ''}`}
      {...ariaAttributes}
      {...props}
    >
      {/* Previous button */}
      {showPrevControl && (
        <button
          {...buttonProps()}
          className={styles.prevButton}
          onClick={() => scrollTo('left')}
          aria-label="Scroll to previous categories"
          tabIndex={-1}
        >
          {normalizeIcon(<ChevronLeftIcon className={styles.icon} />)}
        </button>
      )}

      {/* Scroller container */}
      <ul
        ref={scrollerRef}
        className={styles.scroller}
        data-overflow={overflowState}
        onKeyDown={handleKeyDown}
      >
        {memoizedItems.map((item, index) => {
          const isSelected = item.id === selectedId;
          const isFocused = index === focusedIndex;
          const isDisabled = item.disabled;
          
          // Handle external links
          const isExternal = item.href?.startsWith('http');
          const linkProps = isExternal ? {
            target: '_blank',
            rel: 'noopener noreferrer',
          } : {};

          return (
            <li
              key={item.id}
              className={`${styles.item} ${isSelected ? styles.selected : ''} ${isFocused ? styles.focused : ''}`}
              data-index={index}
              data-item-id={item.id}
              data-selected={isSelected}
              data-focused={isFocused}
              data-disabled={isDisabled}
            >
              {item.href ? (
                isDisabled ? (
                  <span
                    className={styles.link}
                    data-disabled="true"
                  >
                    {item.icon && normalizeIcon(item.icon)}
                    <span className={styles.itemText}>{item.label}</span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={styles.link}
                    prefetch={undefined}
                    {...linkProps}
                    {...(isSelected ? { 'aria-current': 'page' } : {})}
                    onFocus={() => handleItemFocus(index)}
                    onBlur={handleItemBlur}
                    onClick={() => onSelect?.(item.id)}
                    tabIndex={isFocused ? 0 : -1}
                    ref={setItemRef(index)}
                  >
                    {item.icon && normalizeIcon(item.icon)}
                    <span className={styles.itemText}>{item.label}</span>
                  </Link>
                )
              ) : (
                isDisabled ? (
                  <button
                    disabled
                    {...buttonProps()}
                    className={styles.button}
                    data-disabled="true"
                    tabIndex={-1}
                  >
                    {item.icon && normalizeIcon(item.icon)}
                    <span className={styles.itemText}>{item.label}</span>
                  </button>
                ) : (
                  <button
                    {...buttonProps()}
                    className={styles.button}
                    onFocus={() => handleItemFocus(index)}
                    onBlur={handleItemBlur}
                    onClick={() => onSelect?.(item.id)}
                    aria-pressed={isSelected}
                    tabIndex={isFocused ? 0 : -1}
                    ref={setItemRef(index)}
                  >
                    {item.icon && normalizeIcon(item.icon)}
                    <span className={styles.itemText}>{item.label}</span>
                  </button>
                )
              )}
            </li>
          );
        })}
      </ul>

      {/* Next button */}
      {showNextControl && (
        <button
          {...buttonProps()}
          className={styles.nextButton}
          onClick={() => scrollTo('right')}
          aria-label="Scroll to next categories"
          tabIndex={-1}
        >
          {normalizeIcon(<ChevronRightIcon className={styles.icon} />)}
        </button>
      )}
    </nav>
  );
}
