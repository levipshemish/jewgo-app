import { useCallback, useRef, useEffect } from 'react';

export interface UseKeyboardNavigationOptions {
  /**
   * Number of items to navigate through
   */
  itemCount: number;
  /**
   * Currently focused/active item index
   */
  activeIndex: number;
  /**
   * Callback when active index changes
   */
  onIndexChange: (index: number) => void;
  /**
   * Whether navigation should wrap around
   */
  wrap?: boolean;
  /**
   * Whether to enable horizontal navigation (left/right arrows)
   */
  horizontal?: boolean;
  /**
   * Whether to enable vertical navigation (up/down arrows)
   */
  vertical?: boolean;
  /**
   * Custom key handlers
   */
  customKeys?: Record<string, () => void>;
  /**
   * Whether to prevent default behavior for navigation keys
   */
  preventDefault?: boolean;
  /**
   * Whether navigation is enabled
   */
  enabled?: boolean;
}

export interface UseKeyboardNavigationReturn {
  /**
   * Props to spread on the container element
   */
  containerProps: {
    role: string;
    'aria-label'?: string;
    tabIndex: number;
    onKeyDown: (event: React.KeyboardEvent) => void;
  };
  /**
   * Props to spread on individual items
   */
  getItemProps: (index: number) => {
    role: string;
    tabIndex: number;
    'aria-selected': boolean;
    'aria-label'?: string;
    onClick: () => void;
    onFocus: () => void;
  };
  /**
   * Focus a specific item
   */
  focusItem: (index: number) => void;
  /**
   * Focus the first item
   */
  focusFirst: () => void;
  /**
   * Focus the last item
   */
  focusLast: () => void;
  /**
   * Focus the next item
   */
  focusNext: () => void;
  /**
   * Focus the previous item
   */
  focusPrevious: () => void;
}

export function useKeyboardNavigation({
  itemCount,
  activeIndex,
  onIndexChange,
  wrap = true,
  horizontal = true,
  vertical = true,
  customKeys = {},
  preventDefault = true,
  enabled = true,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const containerRef = useRef<HTMLElement>(null);

  // Validate inputs
  if (itemCount <= 0) {
    throw new Error('itemCount must be greater than 0');
  }
  if (activeIndex < 0 || activeIndex >= itemCount) {
    throw new Error('activeIndex must be between 0 and itemCount - 1');
  }

  // Navigation functions
  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      onIndexChange(index);
    }
  }, [itemCount, onIndexChange]);

  const focusFirst = useCallback(() => {
    focusItem(0);
  }, [focusItem]);

  const focusLast = useCallback(() => {
    focusItem(itemCount - 1);
  }, [focusItem, itemCount]);

  const focusNext = useCallback(() => {
    const nextIndex = activeIndex + 1;
    if (nextIndex >= itemCount) {
      if (wrap) {
        focusItem(0);
      }
    } else {
      focusItem(nextIndex);
    }
  }, [activeIndex, itemCount, wrap, focusItem]);

  const focusPrevious = useCallback(() => {
    const prevIndex = activeIndex - 1;
    if (prevIndex < 0) {
      if (wrap) {
        focusItem(itemCount - 1);
      }
    } else {
      focusItem(prevIndex);
    }
  }, [activeIndex, itemCount, wrap, focusItem]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enabled) return;

    const key = event.key;
    let handled = false;

    // Check custom keys first
    if (customKeys[key]) {
      customKeys[key]();
      handled = true;
    }

    // Handle navigation keys
    if (!handled) {
      switch (key) {
        case 'ArrowRight':
        case 'ArrowDown':
          if (horizontal || vertical) {
            focusNext();
            handled = true;
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          if (horizontal || vertical) {
            focusPrevious();
            handled = true;
          }
          break;
        case 'Home':
          focusFirst();
          handled = true;
          break;
        case 'End':
          focusLast();
          handled = true;
          break;
        case 'Enter':
        case ' ':
          // These are handled by onClick, just prevent default
          handled = true;
          break;
      }
    }

    // Prevent default behavior for handled keys
    if (handled && preventDefault) {
      event.preventDefault();
    }
  }, [
    enabled,
    customKeys,
    horizontal,
    vertical,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    preventDefault,
  ]);

  // Auto-focus active item when it changes
  useEffect(() => {
    if (enabled && containerRef.current) {
      const activeElement = containerRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement;
      if (activeElement && document.activeElement !== activeElement) {
        activeElement.focus();
      }
    }
  }, [activeIndex, enabled]);

  // Container props
  const containerProps = {
    role: 'tablist',
    'aria-label': 'Navigation tabs',
    tabIndex: -1,
    onKeyDown: handleKeyDown,
    ref: containerRef,
  };

  // Item props generator
  const getItemProps = useCallback((index: number) => ({
    role: 'tab',
    tabIndex: index === activeIndex ? 0 : -1,
    'aria-selected': index === activeIndex,
    'aria-label': `Tab ${index + 1}`,
    'data-index': index,
    onClick: () => focusItem(index),
    onFocus: () => focusItem(index),
  }), [activeIndex, focusItem]);

  return {
    containerProps,
    getItemProps,
    focusItem,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
  };
}

// Specialized hooks for common use cases
export function useTabNavigation(
  itemCount: number,
  activeIndex: number,
  onIndexChange: (index: number) => void,
  options: Partial<UseKeyboardNavigationOptions> = {}
) {
  return useKeyboardNavigation({
    itemCount,
    activeIndex,
    onIndexChange,
    horizontal: true,
    vertical: false,
    wrap: true,
    ...options,
  });
}

export function useListNavigation(
  itemCount: number,
  activeIndex: number,
  onIndexChange: (index: number) => void,
  options: Partial<UseKeyboardNavigationOptions> = {}
) {
  return useKeyboardNavigation({
    itemCount,
    activeIndex,
    onIndexChange,
    horizontal: false,
    vertical: true,
    wrap: false,
    ...options,
  });
}

export function useGridNavigation(
  itemCount: number,
  activeIndex: number,
  onIndexChange: (index: number) => void,
  columns: number,
  options: Partial<UseKeyboardNavigationOptions> = {}
) {
  const customKeys = {
    ...options.customKeys,
    ArrowRight: () => {
      const nextIndex = activeIndex + 1;
      if (nextIndex < itemCount && nextIndex % columns !== 0) {
        onIndexChange(nextIndex);
      }
    },
    ArrowLeft: () => {
      const prevIndex = activeIndex - 1;
      if (prevIndex >= 0 && activeIndex % columns !== 0) {
        onIndexChange(prevIndex);
      }
    },
    ArrowDown: () => {
      const nextIndex = activeIndex + columns;
      if (nextIndex < itemCount) {
        onIndexChange(nextIndex);
      }
    },
    ArrowUp: () => {
      const prevIndex = activeIndex - columns;
      if (prevIndex >= 0) {
        onIndexChange(prevIndex);
      }
    },
  };

  return useKeyboardNavigation({
    itemCount,
    activeIndex,
    onIndexChange,
    horizontal: true,
    vertical: true,
    wrap: false,
    customKeys,
    ...options,
  });
}
