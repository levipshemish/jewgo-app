import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

export interface UseRovingFocusOptions {
  itemCount: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
  direction: 'ltr' | 'rtl';
  itemRefs: React.MutableRefObject<(HTMLElement | null)[]>;
}

export interface UseRovingFocusReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  handleItemFocus: (index: number) => void;
  handleItemBlur: () => void;
}

// Helper to map arrow keys to direction based on RTL
const mapArrowToDelta = (key: string, dir: 'ltr' | 'rtl') => {
  if (dir === 'rtl') {
    return key === 'ArrowLeft' ? 1 : key === 'ArrowRight' ? -1 : 0;
  }
  return key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0;
};

// Helper to find next enabled item
const findNextEnabledItem = (currentIndex: number, delta: number, itemCount: number, itemRefs: React.MutableRefObject<(HTMLElement | null)[]>) => {
  let nextIndex = currentIndex + delta;
  
  // Wrap around
  if (nextIndex < 0) nextIndex = itemCount - 1;
  if (nextIndex >= itemCount) nextIndex = 0;
  
  // Find next enabled item
  let attempts = 0;
  while (attempts < itemCount) {
    const item = itemRefs.current[nextIndex];
    if (item && !item.getAttribute('data-disabled')) {
      return nextIndex;
    }
    nextIndex += delta;
    if (nextIndex < 0) nextIndex = itemCount - 1;
    if (nextIndex >= itemCount) nextIndex = 0;
    attempts++;
  }
  
  return currentIndex; // No enabled items found
};

// Helper to find first enabled item
const findFirstEnabledItem = (itemCount: number, itemRefs: React.MutableRefObject<(HTMLElement | null)[]>) => {
  for (let i = 0; i < itemCount; i++) {
    const item = itemRefs.current[i];
    if (item && !item.getAttribute('data-disabled')) {
      return i;
    }
  }
  return -1;
};

// Helper to find last enabled item
const findLastEnabledItem = (itemCount: number, itemRefs: React.MutableRefObject<(HTMLElement | null)[]>) => {
  for (let i = itemCount - 1; i >= 0; i--) {
    const item = itemRefs.current[i];
    if (item && !item.getAttribute('data-disabled')) {
      return i;
    }
  }
  return -1;
};

// Helper to pick initial index when selectedId is absent
const pickInitialIndex = (itemRefs: React.MutableRefObject<(HTMLElement | null)[]>, itemCount: number, selectedId?: string) => {
  // If selectedId is provided, find its index
  if (selectedId) {
    for (let i = 0; i < itemRefs.current.length; i++) {
      const item = itemRefs.current[i];
      if (item) {
        const itemId = item.closest('[data-item-id]')?.getAttribute('data-item-id');
        if (itemId === selectedId && !item.getAttribute('data-disabled')) {
          return i;
        }
      }
    }
  }
  
  // Otherwise, return the first enabled item
  return findFirstEnabledItem(itemCount, itemRefs);
};

export function useRovingFocus({
  itemCount,
  selectedId,
  onSelect,
  direction,
  itemRefs,
}: UseRovingFocusOptions): UseRovingFocusReturn {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const lastFocusedIndexRef = useRef(-1);

  // Event handling with proper gating and containment
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
    
    // Gate handling: check containment and modifiers
    if (!event.currentTarget.contains(document.activeElement)) return;
    if (altKey || ctrlKey || metaKey || shiftKey) return;

    let handled = false;
    let nextIndex = focusedIndex;

    switch (key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        // If no item is focused, focus the first enabled item
        if (focusedIndex === -1) {
          const firstEnabledIndex = findFirstEnabledItem(itemCount, itemRefs);
          if (firstEnabledIndex !== -1) {
            setFocusedIndex(firstEnabledIndex);
            nextIndex = firstEnabledIndex;
            handled = true;
          }
        } else {
          const delta = mapArrowToDelta(key, direction);
          nextIndex = findNextEnabledItem(focusedIndex, delta, itemCount, itemRefs);
          if (nextIndex !== focusedIndex) {
            setFocusedIndex(nextIndex);
            handled = true;
          }
        }
        break;

      case 'Home':
        // If no item is focused, focus the first enabled item
        if (focusedIndex === -1) {
          const firstEnabledIndex = findFirstEnabledItem(itemCount, itemRefs);
          if (firstEnabledIndex !== -1) {
            setFocusedIndex(firstEnabledIndex);
            nextIndex = firstEnabledIndex;
            handled = true;
          }
        } else {
          const firstIndex = findFirstEnabledItem(itemCount, itemRefs);
          if (firstIndex !== -1 && firstIndex !== focusedIndex) {
            setFocusedIndex(firstIndex);
            nextIndex = firstIndex;
            handled = true;
          }
        }
        break;

      case 'End':
        // If no item is focused, focus the first enabled item
        if (focusedIndex === -1) {
          const firstEnabledIndex = findFirstEnabledItem(itemCount, itemRefs);
          if (firstEnabledIndex !== -1) {
            setFocusedIndex(firstEnabledIndex);
            nextIndex = firstEnabledIndex;
            handled = true;
          }
        } else {
          const lastIndex = findLastEnabledItem(itemCount, itemRefs);
          if (lastIndex !== -1 && lastIndex !== focusedIndex) {
            setFocusedIndex(lastIndex);
            nextIndex = lastIndex;
            handled = true;
          }
        }
        break;

      case ' ':
        // Space only for buttons, not links
        if (focusedIndex >= 0) {
          const focusedItem = itemRefs.current[focusedIndex];
          if (focusedItem && focusedItem.tagName === 'BUTTON' && !focusedItem.getAttribute('data-disabled')) {
            if (onSelect) {
              const itemId = focusedItem.closest('[data-item-id]')?.getAttribute('data-item-id');
              if (itemId) {
                onSelect(itemId);
                handled = true;
              }
            }
          }
        }
        break;

      case 'Enter':
        // Enter for both buttons and links - only handle if already focused
        if (focusedIndex >= 0) {
          const focusedItem = itemRefs.current[focusedIndex];
          if (focusedItem && !focusedItem.getAttribute('data-disabled')) {
            if (onSelect) {
              const itemId = focusedItem.closest('[data-item-id]')?.getAttribute('data-item-id');
              if (itemId) {
                onSelect(itemId);
                // Only prevent default for buttons, let links handle their own navigation
                if (focusedItem.tagName === 'BUTTON') {
                  handled = true;
                }
              }
            }
          }
        }
        break;

      case 'Tab':
        // Let Tab pass through for normal tab navigation
        return;
    }

    // Event handling hygiene: prevent default and stop propagation only when consuming navigation
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      setIsKeyboardNavigating(true);
      
      // Move focus to the new item
      const nextItem = itemRefs.current[nextIndex];
      if (nextItem) {
        nextItem.focus();
      }
      
      // Reset keyboard navigation flag after a short delay
      setTimeout(() => setIsKeyboardNavigating(false), 100);
    }
  }, [focusedIndex, itemCount, onSelect, direction, itemRefs]);

  // Handle item focus
  const handleItemFocus = useCallback((index: number) => {
    if (!isKeyboardNavigating) {
      setFocusedIndex(index);
      lastFocusedIndexRef.current = index;
    }
  }, [isKeyboardNavigating]);

  // Handle item blur
  const handleItemBlur = useCallback(() => {
    // Only clear focus if we're not in the middle of keyboard navigation
    if (!isKeyboardNavigating) {
      setFocusedIndex(-1);
    }
  }, [isKeyboardNavigating]);

  // Update focused index when selectedId changes
  useEffect(() => {
    if (selectedId) {
      // Find the index of the selected item
      for (let i = 0; i < itemRefs.current.length; i++) {
        const item = itemRefs.current[i];
        if (item) {
          const itemId = item.closest('[data-item-id]')?.getAttribute('data-item-id');
          if (itemId === selectedId) {
            if (i !== focusedIndex) {
              setFocusedIndex(i);
              lastFocusedIndexRef.current = i;
            }
            break;
          }
        }
      }
    }
  }, [selectedId, focusedIndex, itemRefs]);

  // Programmatic focus restore when focused item becomes disabled
  useEffect(() => {
    if (focusedIndex >= 0) {
      const focusedItem = itemRefs.current[focusedIndex];
      if (focusedItem && focusedItem.getAttribute('data-disabled')) {
        // Current focused item is disabled, find next enabled item
        const nextEnabledIndex = findNextEnabledItem(focusedIndex, 1, itemCount, itemRefs);
        if (nextEnabledIndex !== focusedIndex) {
          setFocusedIndex(nextEnabledIndex);
          lastFocusedIndexRef.current = nextEnabledIndex;
          
          // Move focus to the new item
          const nextItem = itemRefs.current[nextEnabledIndex];
          if (nextItem) {
            nextItem.focus();
          }
        }
      }
    }
  }, [focusedIndex, itemCount, itemRefs]);

  // Pick initial index when no focused item and itemRefs or selectedId changes
  useIsomorphicLayoutEffect(() => {
    if (focusedIndex === -1 && itemRefs.current.length > 0) {
      const initialIndex = pickInitialIndex(itemRefs, itemCount, selectedId);
      if (initialIndex !== -1) {
        setFocusedIndex(initialIndex);
        lastFocusedIndexRef.current = initialIndex;
      }
    }
  }, [itemRefs.current.length, selectedId, focusedIndex, itemCount]);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    handleItemFocus,
    handleItemBlur,
  };
}
