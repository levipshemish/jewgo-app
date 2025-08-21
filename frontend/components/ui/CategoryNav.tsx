'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { CategoryNavProps, CategoryNavItem } from './CategoryNav.types';
import styles from './CategoryNav.module.css';

export function CategoryNav({
  items,
  selectedId,
  onSelect,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: CategoryNavProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflowState, setOverflowState] = useState<'start' | 'end' | 'both' | 'none'>('none');
  const [isInitialized, setIsInitialized] = useState(false);

  // Memoize items to prevent unnecessary re-renders
  const memoizedItems = useMemo(() => items, [items]);

  // Helper for button props to prevent form submission
  const buttonProps = useCallback(() => ({
    type: 'button' as const,
  }), []);

  // Overflow detection
  useEffect(() => {
    const checkOverflow = () => {
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

      setOverflowState(newState);
    };

    checkOverflow();
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (scrollerRef.current) {
      resizeObserver.observe(scrollerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Roving focus hook with event handling hygiene
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
    onOverflowToggle: (hasOverflow) => {
      // Move focus back to list when controls become hidden
      if (!hasOverflow && focusedIndex !== -1) {
        const listItem = scrollerRef.current?.querySelector(`[data-index="${focusedIndex}"]`) as HTMLElement;
        listItem?.focus();
      }
    },
  });

  // Robust first focus - scroll selected item into view on first focus
  useEffect(() => {
    if (!isInitialized && selectedId && scrollerRef.current) {
      const selectedIndex = memoizedItems.findIndex(item => item.id === selectedId);
      if (selectedIndex !== -1) {
        const selectedElement = scrollerRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
        if (selectedElement) {
          // Check if element is offscreen
          const rect = selectedElement.getBoundingClientRect();
          const scrollerRect = scrollerRef.current.getBoundingClientRect();
          
          if (rect.left < scrollerRect.left || rect.right > scrollerRect.right) {
            // Respect reduced motion
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            selectedElement.scrollIntoView({
              behavior: prefersReducedMotion ? 'auto' : 'smooth',
              block: 'nearest',
              inline: 'nearest',
            });
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
    scroller.scrollTo({
      left: targetScroll,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, []);

  // Accessibility attributes
  const ariaAttributes = useMemo(() => {
    const attrs: Record<string, string> = {};
    if (ariaLabel) attrs['aria-label'] = ariaLabel;
    if (ariaLabelledBy) attrs['aria-labelledby'] = ariaLabelledBy;
    return attrs;
  }, [ariaLabel, ariaLabelledBy]);

  // Determine if Prev/Next controls should be visible and focusable
  const showPrevControl = overflowState === 'start' || overflowState === 'both';
  const showNextControl = overflowState === 'end' || overflowState === 'both';

  return (
    <div 
      className={`${styles.categoryNav} ${className || ''}`}
      {...props}
    >
      {/* Previous button */}
      {showPrevControl && (
        <button
          {...buttonProps()}
          className={styles.prevButton}
          onClick={() => scrollTo('left')}
          aria-label="Scroll to previous categories"
          tabIndex={showPrevControl ? 0 : -1}
        >
          <ChevronLeftIcon 
            className={styles.icon} 
            aria-hidden="true" 
            focusable="false" 
          />
        </button>
      )}

      {/* Scroller container */}
      <div
        ref={scrollerRef}
        className={styles.scroller}
        data-overflow={overflowState}
        role="region"
        aria-label="Category navigation"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.itemList}>
          {memoizedItems.map((item, index) => {
            const isSelected = item.id === selectedId;
            const isFocused = index === focusedIndex;
            
            // Handle external links
            const isExternal = item.href?.startsWith('http');
            const linkProps = isExternal ? {
              target: '_blank',
              rel: 'noopener noreferrer',
            } : {};

            return (
              <div
                key={item.id}
                className={`${styles.item} ${isSelected ? styles.selected : ''} ${isFocused ? styles.focused : ''}`}
                data-index={index}
                data-selected={isSelected}
                data-focused={isFocused}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className={styles.link}
                    prefetch={false} // Performance optimization for large lists
                    {...linkProps}
                    onFocus={() => handleItemFocus(index)}
                    onBlur={handleItemBlur}
                    onClick={() => onSelect?.(item.id)}
                  >
                    {item.icon && (
                      <span 
                        className={styles.itemIcon}
                        aria-hidden="true"
                        focusable="false"
                      >
                        {item.icon}
                      </span>
                    )}
                    <span className={styles.itemText}>{item.label}</span>
                  </Link>
                ) : (
                  <button
                    {...buttonProps()}
                    className={styles.button}
                    onFocus={() => handleItemFocus(index)}
                    onBlur={handleItemBlur}
                    onClick={() => onSelect?.(item.id)}
                    aria-pressed={isSelected}
                  >
                    {item.icon && (
                      <span 
                        className={styles.itemIcon}
                        aria-hidden="true"
                        focusable="false"
                      >
                        {item.icon}
                      </span>
                    )}
                    <span className={styles.itemText}>{item.label}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Next button */}
      {showNextControl && (
        <button
          {...buttonProps()}
          className={styles.nextButton}
          onClick={() => scrollTo('right')}
          aria-label="Scroll to next categories"
          tabIndex={showNextControl ? 0 : -1}
        >
          <ChevronRightIcon 
            className={styles.icon} 
            aria-hidden="true" 
            focusable="false" 
          />
        </button>
      )}
    </div>
  );
}
