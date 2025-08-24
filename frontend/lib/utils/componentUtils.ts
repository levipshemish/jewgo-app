/**
 * Unified Component Utilities
 * ===========================
 * 
 * Centralized component utility functions to eliminate code duplication.
 * This module consolidates common component patterns that were previously duplicated.
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

import { KeyboardEvent, FormEvent, MouseEvent } from 'react';

/**
 * Handle escape key press for closing modals/dropdowns
 */
export const handleEscape = (
  event: KeyboardEvent,
  onClose: () => void,
  enabled: boolean = true
) => {
  if (!enabled) {
    return;
  }
  
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  }
};

/**
 * Handle form submission with validation
 */
export const handleSubmit = (
  event: FormEvent,
  onSubmit: (data: any) => void | Promise<void>,
  validator?: (data: any) => { isValid: boolean; errors: string[] }
) => {
  event.preventDefault();
  
  const formData = new FormData(event.target as HTMLFormElement);
  const data = Object.fromEntries(formData.entries());
  
  if (validator) {
    const validation = validator(data);
    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
      return;
    }
  }
  
  onSubmit(data);
};

/**
 * Handle map click events
 */
export const handleMapClick = (
  event: MouseEvent,
  onMapClick: (lat: number, lng: number) => void
) => {
  // Extract coordinates from map click event
  // This is a generic implementation - specific map libraries may need different handling
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  // const x = event.clientX - rect.left;
  // const y = event.clientY - rect.top;
  
  // Convert pixel coordinates to lat/lng (this would need to be implemented based on your map library)
  // For now, we'll use placeholder values
  const lat = 0; // Replace with actual conversion
  const lng = 0; // Replace with actual conversion
  
  onMapClick(lat, lng);
};

/**
 * Handle add eatery click
 */
export const handleAddEateryClick = (
  event: MouseEvent,
  onAddEatery: () => void,
  preventDefault: boolean = true
) => {
  if (preventDefault) {
    event.preventDefault();
    event.stopPropagation();
  }
  onAddEatery();
};

/**
 * Handle filters click
 */
export const handleFiltersClick = (
  event: MouseEvent,
  onFiltersClick: () => void,
  preventDefault: boolean = true
) => {
  if (preventDefault) {
    event.preventDefault();
    event.stopPropagation();
  }
  onFiltersClick();
};

/**
 * Handle tab click with active state management
 */
export const handleTabClick = (
  tabId: string,
  onTabChange: (tabId: string) => void,
  activeTab: string
) => {
  if (tabId !== activeTab) {
    onTabChange(tabId);
  }
};

/**
 * Handle search with debouncing
 */
export const handleSearch = (
  query: string,
  onSearch: (query: string) => void,
  debounceMs: number = 300
) => {
  const timeoutId = setTimeout(() => {
    onSearch(query);
  }, debounceMs);
  
  return () => clearTimeout(timeoutId);
};

/**
 * Handle show filters toggle
 */
export const handleShowFilters = (
  currentState: boolean,
  onToggle: (show: boolean) => void
) => {
  onToggle(!currentState);
};

/**
 * Handle filters change
 */
export const handleFiltersChange = (
  filters: Record<string, any>,
  onFiltersChange: (filters: Record<string, any>) => void
) => {
  onFiltersChange(filters);
};

/**
 * Handle clear filters
 */
export const handleClearFilters = (
  onClearFilters: () => void
) => {
  onClearFilters();
};

/**
 * Handle search with suggestions
 */
export const handleSearchWithSuggestions = (
  query: string,
  suggestions: string[],
  onSearch: (query: string) => void,
  onSelectSuggestion?: (suggestion: string) => void
) => {
  if (suggestions.includes(query)) {
    onSelectSuggestion?.(query);
  } else {
    onSearch(query);
  }
};

/**
 * Handle loading state management
 */
export const handleLoadingState = (
  isLoading: boolean,
  onLoadingChange: (loading: boolean) => void,
  operation: () => Promise<void>
) => {
  if (isLoading) {
    return;
  }
  
  onLoadingChange(true);
  operation()
    .finally(() => {
      onLoadingChange(false);
    });
};

/**
 * Handle error state management
 */
export const handleErrorState = (
  error: Error | null,
  onErrorChange: (error: Error | null) => void,
  operation: () => Promise<void>
) => {
  onErrorChange(null);
  operation().catch((err) => {
    onErrorChange(err);
  });
};

/**
 * Handle confirmation dialog
 */
export const handleConfirmation = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  if (window.confirm(message)) {
    onConfirm();
  } else {
    onCancel?.();
  }
};

/**
 * Handle file upload
 */
export const handleFileUpload = (
  event: React.ChangeEvent<HTMLInputElement>,
  onFileSelect: (file: File) => void,
  acceptedTypes?: string[]
) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  
  if (acceptedTypes && !acceptedTypes.includes(file.type)) {
    console.error('File type not accepted:', file.type);
    return;
  }
  
  onFileSelect(file);
};

/**
 * Handle image load
 */
export const handleImageLoad = (
  onLoad: () => void,
  onError?: () => void
) => {
  return {
    onLoad,
    onError: onError || (() => console.error('Image failed to load'))
  };
};

/**
 * Handle scroll events with throttling
 */
export const handleScroll = (
  event: Event,
  onScroll: (scrollTop: number, scrollLeft: number) => void,
  throttleMs: number = 16
) => {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const target = event.target as HTMLElement;
      onScroll(target.scrollTop, target.scrollLeft);
    }, throttleMs);
  };
};

/**
 * Handle resize events with debouncing
 */
export const handleResize = (
  onResize: (width: number, height: number) => void,
  debounceMs: number = 250
) => {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      onResize(window.innerWidth, window.innerHeight);
    }, debounceMs);
  };
};

/**
 * Handle click outside element
 */
export const handleClickOutside = (
  ref: React.RefObject<HTMLElement>,
  onOutsideClick: () => void
) => {
  return (event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      onOutsideClick();
    }
  };
};

/**
 * Handle keyboard navigation
 */
export const handleKeyboardNavigation = (
  event: KeyboardEvent,
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void,
  onSelect?: () => void,
  onEscape?: () => void
) => {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      onNavigate('up');
      break;
    case 'ArrowDown':
      event.preventDefault();
      onNavigate('down');
      break;
    case 'ArrowLeft':
      event.preventDefault();
      onNavigate('left');
      break;
    case 'ArrowRight':
      event.preventDefault();
      onNavigate('right');
      break;
    case 'Enter':
      event.preventDefault();
      onSelect?.();
      break;
    case 'Escape':
      event.preventDefault();
      onEscape?.();
      break;
  }
};

/**
 * Handle touch events for mobile
 */
export const handleTouch = (
  onTouchStart?: (event: React.TouchEvent) => void,
  onTouchMove?: (event: React.TouchEvent) => void,
  onTouchEnd?: (event: React.TouchEvent) => void
) => {
  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

/**
 * Handle drag and drop
 */
export const handleDragAndDrop = (
  onDragOver: (event: React.DragEvent) => void,
  onDrop: (event: React.DragEvent) => void,
  onDragLeave?: (event: React.DragEvent) => void
) => {
  return {
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      onDragOver(event);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      onDrop(event);
    },
    onDragLeave
  };
};

export default {
  handleEscape,
  handleSubmit,
  handleMapClick,
  handleAddEateryClick,
  handleFiltersClick,
  handleTabClick,
  handleSearch,
  handleShowFilters,
  handleFiltersChange,
  handleClearFilters,
  handleSearchWithSuggestions,
  handleLoadingState,
  handleErrorState,
  handleConfirmation,
  handleFileUpload,
  handleImageLoad,
  handleScroll,
  handleResize,
  handleClickOutside,
  handleKeyboardNavigation,
  handleTouch,
  handleDragAndDrop
};
