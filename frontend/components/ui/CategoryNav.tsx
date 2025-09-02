'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { CategoryNavProps } from './CategoryNav.types';
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

// Helper to normalize icon with accessibility attributes
const normalizeIcon = (icon: React.ReactNode): React.ReactNode => {
  // Always wrap in span with aria-hidden="true" for consistent accessibility
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
  value,
  onValueChange,
  defaultValue,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: CategoryNavProps) {
  // Single source of truth: value takes precedence over selectedId
  const finalSelectedId = value ?? selectedId;
  const finalOnSelect = onValueChange ?? onSelect;
  
  // Internal state for uncontrolled component
  const [internalValue, setInternalValue] = useState(defaultValue);
  
  // Compute the actual selected ID (controlled takes precedence over internal state)
  const actualSelectedId = finalSelectedId ?? internalValue;
  
  // Handle selection changes
  const handleSelection = useCallback((id: string) => {
    if (finalOnSelect) {
      finalOnSelect(id);
    } else if (!finalSelectedId) {
      // Only update internal state if not controlled
      setInternalValue(id);
    }
  }, [finalOnSelect, finalSelectedId]);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const [overflowState, setOverflowState] = useState<'start' | 'end' | 'both' | 'none'>('none');
  const [isInitialized, setIsInitialized] = useState(false);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [showPrevControl, setShowPrevControl] = useState(false);
  const [showNextControl, setShowNextControl] = useState(false);
  const [prevShowPrevControl, setPrevShowPrevControl] = useState(false);
  const [prevShowNextControl, setPrevShowNextControl] = useState(false);
  const [focusVisibleIndex, setFocusVisibleIndex] = useState(-1);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Memoize items to prevent unnecessary re-renders
  const memoizedItems = useMemo(() => items, [items]);

  // Check if all items are disabled
  const allDisabled = useMemo(() => memoizedItems.every(item => item.disabled), [memoizedItems]);

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
    if (!scroller) {return;}

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

    const newShowPrevControl = (newState === 'start' || newState === 'both') && !allDisabled;
    const newShowNextControl = (newState === 'end' || newState === 'both') && !allDisabled;

    setOverflowState(newState);
    setShowPrevControl(newShowPrevControl);
    setShowNextControl(newShowNextControl);
  }, [allDisabled]);

  // Throttled overflow check
  const throttledCheckOverflow = useCallback(() => {
    requestAnimationFrame(checkOverflow);
  }, [checkOverflow]);

  // Initialize overflow state and direction with hydration stability
  useIsomorphicLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {return;}

    // Cache direction from computed styles
    const computedDirection = getComputedStyle(scroller).direction as 'ltr' | 'rtl';
    setDirection(computedDirection);

    // Initial overflow check
    checkOverflow();

    // Set up ResizeObserver with fallback for older browsers
    let resizeObserver: ResizeObserver | null = null;
    let resizeListener: (() => void) | null = null;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(throttledCheckOverflow);
      resizeObserver.observe(scroller);
    } else {
      // Fallback to window resize listener
      resizeListener = throttledCheckOverflow;
      window.addEventListener('resize', resizeListener);
    }

    // Set up scroll listener
    scroller.addEventListener('scroll', throttledCheckOverflow);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
      }
      scroller.removeEventListener('scroll', throttledCheckOverflow);
    };
  }, [checkOverflow, throttledCheckOverflow]);

  // Handle focus management when controls become hidden
  useEffect(() => {
    if (!showPrevControl && prevShowPrevControl) {
      // Prev control was hidden
      const activeElement = document.activeElement;
      if (activeElement === prevRef.current) {
        // Focus was on prev button, move to current roving item
        const currentRovingItem = itemRefs.current.find(ref => ref?.getAttribute('tabIndex') === '0');
        currentRovingItem?.focus();
      }
    }
    if (!showNextControl && prevShowNextControl) {
      // Next control was hidden
      const activeElement = document.activeElement;
      if (activeElement === nextRef.current) {
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
    handleItemFocus: rovingHandleItemFocus,
    handleItemBlur: rovingHandleItemBlur,
  } = useRovingFocus({
    itemCount: memoizedItems.length,
    selectedId: actualSelectedId,
    onSelect: handleSelection,
    direction,
    itemRefs,
  });

  // Custom focus handlers to track focus-visible state
  const handleItemFocus = useCallback((index: number) => {
    rovingHandleItemFocus(index);
    setFocusVisibleIndex(index);
  }, [rovingHandleItemFocus]);

  const handleItemBlur = useCallback(() => {
    rovingHandleItemBlur();
    setFocusVisibleIndex(-1);
  }, [rovingHandleItemBlur]);

  // Robust first focus - scroll selected item into view on first focus
  useEffect(() => {
    if (!isInitialized && actualSelectedId && scrollerRef.current) {
      const selectedIndex = memoizedItems.findIndex(item => item.id === actualSelectedId);
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
            } catch (err) {
              // Fallback to manual scroll
              scrollItemIntoViewX(scrollerRef.current, selectedElement);
            }
          }
        }
      }
      setIsInitialized(true);
    }
  }, [actualSelectedId, memoizedItems, isInitialized]);

  // Robust first focus - handle offscreen first-enabled item too
  useEffect(() => {
    if (!isInitialized && !actualSelectedId && focusedIndex >= 0 && scrollerRef.current) {
      const focusedElement = itemRefs.current[focusedIndex];
      if (focusedElement) {
        // Check if element is offscreen
        const rect = focusedElement.getBoundingClientRect();
        const scrollerRect = scrollerRef.current.getBoundingClientRect();
        
        if (rect.left < scrollerRect.left || rect.right > scrollerRect.right) {
          // Respect reduced motion
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          
          try {
            if (prefersReducedMotion) {
              // Use manual scroll fallback
              scrollItemIntoViewX(scrollerRef.current, focusedElement);
            } else {
              focusedElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
              });
            }
          } catch (err) {
            // Fallback to manual scroll
            scrollItemIntoViewX(scrollerRef.current, focusedElement);
          }
        }
      }
      setIsInitialized(true);
    }
  }, [actualSelectedId, focusedIndex, memoizedItems, isInitialized]);

  // Manual scroll handlers with fallback
  const scrollTo = useCallback((direction: 'left' | 'right') => {
    const scroller = scrollerRef.current;
    if (!scroller) {return;}

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
    if (ariaLabel && !ariaLabelledBy) {attrs['aria-label'] = ariaLabel;}
    if (ariaLabelledBy) {attrs['aria-labelledby'] = ariaLabelledBy;}
    return attrs;
  }, [ariaLabel, ariaLabelledBy]);

  return (
    <nav 
      className={`${styles.categoryNav} ${className || ''}`}
      {...ariaAttributes}
      {...props}
    >
      {/* Previous button */}
      <button
        {...buttonProps()}
        ref={prevRef}
        className={styles.prevButton}
        onClick={() => scrollTo('left')}
        aria-label="Scroll to previous categories"
        hidden={!showPrevControl}
        tabIndex={showPrevControl ? 0 : -1}
      >
        {normalizeIcon(<ChevronLeftIcon className={styles.icon} />)}
      </button>

      {/* Scroller container */}
      <ul
        ref={scrollerRef}
        className={styles.scroller}
        data-overflow={overflowState}
        onKeyDown={handleKeyDown}
      >
        {memoizedItems.map((item, index) => {
          const isSelected = item.id === actualSelectedId;
          const isFocused = index === focusedIndex;
          const isDisabled = item.disabled || allDisabled;
          
          // Handle external links
          const isExternal = item.href?.startsWith('http');
          const linkProps: Record<string, string> = {};

          // Honor item.target and item.rel if defined
          if (item.target) {
            linkProps.target = item.target;
            if (item.target === '_blank' && !item.rel) {
              linkProps.rel = 'noopener noreferrer';
            }
          } else if (isExternal) {
            // Default external link behavior
            linkProps.target = '_blank';
            linkProps.rel = 'noopener noreferrer';
          }
          
          if (item.rel) {
            linkProps.rel = item.rel;
          }

          return (
            <li
              key={item.id}
              className={`${styles.item} ${isSelected ? styles.selected : ''} ${isFocused ? styles.focused : ''}`}
              data-index={index}
              data-item-id={item.id}
              data-selected={isSelected}
              data-focused={isFocused}
              data-disabled={isDisabled}
              data-state={isDisabled ? 'disabled' : isSelected ? 'selected' : 'default'}
              data-focus-visible={index === focusVisibleIndex}
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
                    prefetch={false}
                    {...linkProps}
                    {...(isSelected ? { 'aria-current': 'page' } : {})}
                    onFocus={() => handleItemFocus(index)}
                    onBlur={handleItemBlur}
                    onClick={() => handleSelection(item.id)}
                    tabIndex={isFocused && !allDisabled ? 0 : -1}
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
                    onClick={() => handleSelection(item.id)}
                    aria-pressed={isSelected}
                    tabIndex={isFocused && !allDisabled ? 0 : -1}
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
      <button
        {...buttonProps()}
        ref={nextRef}
        className={styles.nextButton}
        onClick={() => scrollTo('right')}
        aria-label="Scroll to next categories"
        hidden={!showNextControl}
        tabIndex={showNextControl ? 0 : -1}
      >
        {normalizeIcon(<ChevronRightIcon className={styles.icon} />)}
      </button>
    </nav>
  );
}
