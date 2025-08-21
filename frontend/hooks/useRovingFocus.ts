import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseRovingFocusOptions {
  itemCount: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onOverflowToggle?: (hasOverflow: boolean) => void;
}

export interface UseRovingFocusReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  handleItemFocus: (index: number) => void;
  handleItemBlur: () => void;
}

export function useRovingFocus({
  itemCount,
  selectedId,
  onSelect,
  onOverflowToggle,
}: UseRovingFocusOptions): UseRovingFocusReturn {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const lastFocusedIndexRef = useRef(-1);
  const rtlCacheRef = useRef<boolean | null>(null);

  // Cache RTL detection to avoid repeated calculations
  const isRTL = useCallback(() => {
    if (rtlCacheRef.current === null) {
      rtlCacheRef.current = document.documentElement.dir === 'rtl';
    }
    return rtlCacheRef.current;
  }, []);

  // Event handling hygiene - prevent default and stop propagation when consuming navigation keys
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = event;
    
    // Ignore if modifier keys are pressed (except Shift for selection)
    if (ctrlKey || metaKey) return;

    let handled = false;

    switch (key) {
      case 'ArrowLeft':
        if (isRTL()) {
          // RTL: ArrowLeft moves to next item
          if (focusedIndex < itemCount - 1) {
            setFocusedIndex(focusedIndex + 1);
            handled = true;
          }
        } else {
          // LTR: ArrowLeft moves to previous item
          if (focusedIndex > 0) {
            setFocusedIndex(focusedIndex - 1);
            handled = true;
          }
        }
        break;

      case 'ArrowRight':
        if (isRTL()) {
          // RTL: ArrowRight moves to previous item
          if (focusedIndex > 0) {
            setFocusedIndex(focusedIndex - 1);
            handled = true;
          }
        } else {
          // LTR: ArrowRight moves to next item
          if (focusedIndex < itemCount - 1) {
            setFocusedIndex(focusedIndex + 1);
            handled = true;
          }
        }
        break;

      case 'Home':
        if (focusedIndex !== 0) {
          setFocusedIndex(0);
          handled = true;
        }
        break;

      case 'End':
        if (focusedIndex !== itemCount - 1) {
          setFocusedIndex(itemCount - 1);
          handled = true;
        }
        break;

      case ' ':
      case 'Enter':
        // Only handle if we have a focused item and onSelect callback
        if (focusedIndex >= 0 && onSelect) {
          // Find the item at the focused index
          const focusedItem = document.querySelector(`[data-index="${focusedIndex}"]`);
          if (focusedItem) {
            const itemId = focusedItem.getAttribute('data-item-id');
            if (itemId) {
              onSelect(itemId);
              handled = true;
            }
          }
        }
        break;

      case 'Tab':
        // Let Tab pass through for normal tab navigation
        return;
    }

    // Event handling hygiene: prevent default and stop propagation when consuming navigation keys
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      setIsKeyboardNavigating(true);
      
      // Reset keyboard navigation flag after a short delay
      setTimeout(() => setIsKeyboardNavigating(false), 100);
    }
  }, [focusedIndex, itemCount, onSelect, isRTL]);

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
      const selectedElement = document.querySelector(`[data-item-id="${selectedId}"]`);
      if (selectedElement) {
        const index = selectedElement.getAttribute('data-index');
        if (index !== null) {
          const newIndex = parseInt(index, 10);
          if (newIndex !== focusedIndex) {
            setFocusedIndex(newIndex);
            lastFocusedIndexRef.current = newIndex;
          }
        }
      }
    }
  }, [selectedId, focusedIndex]);

  // Robust first focus logic
  useEffect(() => {
    // If no item is focused but we have a selected item, focus it
    if (focusedIndex === -1 && selectedId) {
      const selectedElement = document.querySelector(`[data-item-id="${selectedId}"]`);
      if (selectedElement) {
        const index = selectedElement.getAttribute('data-index');
        if (index !== null) {
          const newIndex = parseInt(index, 10);
          setFocusedIndex(newIndex);
          lastFocusedIndexRef.current = newIndex;
        }
      }
    }
  }, [selectedId, focusedIndex]);

  // Overflow toggle handling
  useEffect(() => {
    if (onOverflowToggle) {
      const hasOverflow = itemCount > 0; // Simplified - actual overflow detection is in the component
      onOverflowToggle(hasOverflow);
    }
  }, [itemCount, onOverflowToggle]);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    handleItemFocus,
    handleItemBlur,
  };
}
