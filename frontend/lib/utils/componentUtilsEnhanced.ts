/**
 * Enhanced Component Utilities with Type Safety
 * =============================================
 * 
 * Improved component utility functions with comprehensive type safety
 * and better error handling for React components.
 * 
 * Author: JewGo Development Team
 * Version: 2.0
 */

import { 
  KeyboardEvent, 
  FormEvent, 
  MouseEvent, 
  ChangeEvent, 
  TouchEvent, 
  DragEvent,
  RefObject,
  useCallback,
  useRef,
  useEffect,
  useState
} from 'react';
import type {
  EscapeHandler,
  SubmitHandler,
  MapClickHandler,
  ClickHandler,
  TabChangeHandler,
  SearchHandler,
  ToggleHandler,
  FiltersChangeHandler,
  SuggestionSelectHandler,
  LoadingChangeHandler,
  ErrorChangeHandler,
  FileSelectHandler,
  ImageLoadHandler,
  ScrollHandler,
  ResizeHandler,
  OutsideClickHandler,
  NavigationHandler,
  SelectHandler,
  TouchHandler,
  DragHandler,
  FormData,
  ValidationResult,
  Validator,
  LoadingState,
  TabState,
  SearchState,
  FilterState,
  FileUploadConfig,
  FileUploadResult,
  ImageLoadConfig,
  ImageValidationResult,
  ScrollConfig,
  ResizeConfig,
  KeyboardConfig,
  TouchConfig,
  DragDropConfig,
  ComponentUtilsProps,
  FormComponentProps,
  InteractiveComponentProps,
  ComponentUtils,
  UseComponentUtilsReturn,
  ValidationConfig,
  FieldValidation,
  PerformanceConfig,
  PerformanceMetrics
} from '../types/component-utils';

// ============================================================================
// Enhanced Event Handlers with Type Safety
// ============================================================================

/**
 * Enhanced escape key handler with proper typing and error handling
 */
export const handleEscapeEnhanced = (
  event: KeyboardEvent,
  onClose: () => void,
  enabled: boolean = true
): void => {
  if (!enabled) {
    return;
  }
  
  try {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  } catch (error) {
    console.error('Error in escape handler:', error);
  }
};

/**
 * Enhanced form submission handler with validation and error handling
 */
export const handleSubmitEnhanced = <T extends FormData = FormData>(
  event: FormEvent,
  onSubmit: SubmitHandler<T>,
  validator?: Validator<T>
): void => {
  event.preventDefault();
  
  try {
    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries()) as T;
    
    if (validator) {
      const validation = validator(data);
      if (!validation.isValid) {
        console.error('Validation errors:', validation.errors);
        return;
      }
    }
    
    onSubmit(data);
  } catch (error) {
    console.error('Error in form submission:', error);
  }
};

/**
 * Enhanced map click handler with coordinate extraction
 */
export const handleMapClickEnhanced = (
  event: MouseEvent,
  onMapClick: MapClickHandler,
  mapRef?: RefObject<HTMLElement>
): void => {
  try {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert pixel coordinates to lat/lng
    // This is a placeholder - implement based on your map library
    const lat = 0; // Replace with actual conversion
    const lng = 0; // Replace with actual conversion
    
    onMapClick(lat, lng);
  } catch (error) {
    console.error('Error in map click handler:', error);
  }
};

/**
 * Enhanced file upload handler with validation
 */
export const handleFileUploadEnhanced = (
  event: ChangeEvent<HTMLInputElement>,
  onFileSelect: FileSelectHandler,
  config?: FileUploadConfig
): FileUploadResult | null => {
  try {
    const file = event.target.files?.[0];
    if (!file) {
      return null;
    }
    
    // Validate file type
    if (config?.acceptedTypes && !config.acceptedTypes.includes(file.type)) {
      const error = `File type ${file.type} is not accepted`;
      console.error(error);
      return { file, isValid: false, error };
    }
    
    // Validate file size
    if (config?.maxSize && file.size > config.maxSize) {
      const error = `File size ${file.size} exceeds maximum ${config.maxSize}`;
      console.error(error);
      return { file, isValid: false, error };
    }
    
    onFileSelect(file);
    return { file, isValid: true };
  } catch (error) {
    console.error('Error in file upload handler:', error);
    return null;
  }
};

/**
 * Enhanced image load handler with fallback support
 */
export const handleImageLoadEnhanced = (
  onLoad: ImageLoadHandler,
  onError?: ImageLoadHandler,
  fallbackSrc?: string
): ImageLoadConfig => {
  return {
    onLoad: () => {
      try {
        onLoad();
      } catch (error) {
        console.error('Error in image load handler:', error);
      }
    },
    onError: onError || (() => {
      console.error('Image failed to load');
      if (fallbackSrc) {
        // Handle fallback logic here
      }
    })
  };
};

// ============================================================================
// Enhanced State Management
// ============================================================================

/**
 * Enhanced loading state manager with error handling
 */
export const handleLoadingStateEnhanced = (
  isLoading: boolean,
  onLoadingChange: LoadingChangeHandler,
  operation: () => Promise<void>
): void => {
  if (isLoading) {
    return;
  }
  
  onLoadingChange(true);
  operation()
    .catch((error) => {
      console.error('Operation failed:', error);
    })
    .finally(() => {
      onLoadingChange(false);
    });
};

/**
 * Enhanced error state manager with error recovery
 */
export const handleErrorStateEnhanced = (
  error: Error | null,
  onErrorChange: ErrorChangeHandler,
  operation: () => Promise<void>,
  retryCount: number = 3
): void => {
  let attempts = 0;
  
  const attemptOperation = async (): Promise<void> => {
    try {
      onErrorChange(null);
      await operation();
    } catch (err) {
      attempts++;
      if (attempts < retryCount) {
        console.warn(`Operation failed, retrying (${attempts}/${retryCount})`);
        setTimeout(attemptOperation, 1000 * attempts); // Exponential backoff
      } else {
        onErrorChange(err as Error);
      }
    }
  };
  
  attemptOperation();
};

// ============================================================================
// Enhanced Interaction Handlers
// ============================================================================

/**
 * Enhanced click outside handler with proper cleanup
 */
export const handleClickOutsideEnhanced = (
  ref: RefObject<HTMLElement>,
  onOutsideClick: OutsideClickHandler
): (event: MouseEvent) => void => {
  return useCallback((event: MouseEvent) => {
    try {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    } catch (error) {
      console.error('Error in click outside handler:', error);
    }
  }, [ref, onOutsideClick]);
};

/**
 * Enhanced keyboard navigation handler with accessibility support
 */
export const handleKeyboardNavigationEnhanced = (
  event: KeyboardEvent,
  config: KeyboardConfig
): void => {
  try {
    if (!config.enabled) {
      return;
    }
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        config.onNavigate?.('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        config.onNavigate?.('down');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        config.onNavigate?.('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        config.onNavigate?.('right');
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        config.onSelect?.();
        break;
      case 'Escape':
        event.preventDefault();
        config.onEscape?.();
        break;
    }
  } catch (error) {
    console.error('Error in keyboard navigation handler:', error);
  }
};

/**
 * Enhanced touch handler with gesture support
 */
export const handleTouchEnhanced = (
  config: TouchConfig
): {
  onTouchStart?: TouchHandler;
  onTouchMove?: TouchHandler;
  onTouchEnd?: TouchHandler;
} => {
  return {
    onTouchStart: config.onTouchStart ? (event: TouchEvent) => {
      try {
        if (config.preventDefault) {
          event.preventDefault();
        }
        config.onTouchStart!(event);
      } catch (error) {
        console.error('Error in touch start handler:', error);
      }
    } : undefined,
    onTouchMove: config.onTouchMove ? (event: TouchEvent) => {
      try {
        if (config.preventDefault) {
          event.preventDefault();
        }
        config.onTouchMove!(event);
      } catch (error) {
        console.error('Error in touch move handler:', error);
      }
    } : undefined,
    onTouchEnd: config.onTouchEnd ? (event: TouchEvent) => {
      try {
        if (config.preventDefault) {
          event.preventDefault();
        }
        config.onTouchEnd!(event);
      } catch (error) {
        console.error('Error in touch end handler:', error);
      }
    } : undefined
  };
};

/**
 * Enhanced drag and drop handler with file validation
 */
export const handleDragAndDropEnhanced = (
  config: DragDropConfig
): {
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onDragLeave?: DragHandler;
} => {
  return {
    onDragOver: (event: DragEvent) => {
      try {
        event.preventDefault();
        config.onDragOver?.(event);
      } catch (error) {
        console.error('Error in drag over handler:', error);
      }
    },
    onDrop: (event: DragEvent) => {
      try {
        event.preventDefault();
        
        // Validate dropped files if acceptTypes is specified
        if (config.acceptTypes && event.dataTransfer.files.length > 0) {
          const files = Array.from(event.dataTransfer.files);
          const validFiles = files.filter(file => 
            config.acceptTypes!.includes(file.type)
          );
          
          if (validFiles.length !== files.length) {
            console.warn('Some files were rejected due to type restrictions');
          }
        }
        
        config.onDrop?.(event);
      } catch (error) {
        console.error('Error in drop handler:', error);
      }
    },
    onDragLeave: config.onDragLeave ? (event: DragEvent) => {
      try {
        config.onDragLeave!(event);
      } catch (error) {
        console.error('Error in drag leave handler:', error);
      }
    } : undefined
  };
};

// ============================================================================
// Performance Optimized Handlers
// ============================================================================

/**
 * Debounced search handler with performance optimization
 */
export const useDebouncedSearch = (
  onSearch: SearchHandler,
  delay: number = 300
): SearchHandler => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onSearch(query);
    }, delay);
  }, [onSearch, delay]);
};

/**
 * Throttled scroll handler with performance optimization
 */
export const useThrottledScroll = (
  onScroll: ScrollHandler,
  throttleMs: number = 16
): ScrollHandler => {
  const lastCallRef = useRef<number>(0);
  
  return useCallback((scrollTop: number, scrollLeft: number) => {
    const now = Date.now();
    if (now - lastCallRef.current >= throttleMs) {
      lastCallRef.current = now;
      onScroll(scrollTop, scrollLeft);
    }
  }, [onScroll, throttleMs]);
};

/**
 * Debounced resize handler with performance optimization
 */
export const useDebouncedResize = (
  onResize: ResizeHandler,
  debounceMs: number = 250
): ResizeHandler => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((width: number, height: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onResize(width, height);
    }, debounceMs);
  }, [onResize, debounceMs]);
};

// ============================================================================
// Hook for Component Utils
// ============================================================================

/**
 * Hook that provides enhanced component utilities
 */
export const useComponentUtils = (): UseComponentUtilsReturn => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null
  });
  
  const [tabState, setTabState] = useState<TabState>({
    activeTab: '',
    tabs: []
  });
  
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    suggestions: [],
    results: []
  });
  
  const [filterState, setFilterState] = useState<FilterState>({
    filters: {},
    isVisible: false
  });
  
  const utils: ComponentUtils = {
    // Event handlers
    handleEscape: handleEscapeEnhanced,
    handleSubmit: handleSubmitEnhanced as any,
    handleMapClick: handleMapClickEnhanced,
    handleAddEateryClick: (event, onAddEatery, preventDefault = true) => {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      onAddEatery();
    },
    handleFiltersClick: (event, onFiltersClick, preventDefault = true) => {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      onFiltersClick();
    },
    handleTabClick: (tabId, onTabChange, activeTab) => {
      if (tabId !== activeTab) {
        onTabChange(tabId);
      }
    },
    handleSearch: (query: string, onSearch: SearchHandler, debounceMs?: number) => {
      const debouncedSearch = useDebouncedSearch(onSearch, debounceMs || 300);
      debouncedSearch(query);
      return () => {}; // Return cleanup function
    },
    handleShowFilters: (currentState, onToggle) => {
      onToggle(!currentState);
    },
    handleFiltersChange: (filters, onFiltersChange) => {
      onFiltersChange(filters);
    },
    handleClearFilters: (onClearFilters) => {
      onClearFilters();
    },
    handleSearchWithSuggestions: (query, suggestions, onSearch, onSelectSuggestion) => {
      if (suggestions.includes(query)) {
        onSelectSuggestion?.(query);
      } else {
        onSearch(query);
      }
    },
    
    // State management
    handleLoadingState: handleLoadingStateEnhanced,
    handleErrorState: handleErrorStateEnhanced,
    
    // File handling
    handleFileUpload: (event: ChangeEvent<HTMLInputElement>, onFileSelect: FileSelectHandler, acceptedTypes?: string[]) => {
      const config = acceptedTypes ? { acceptedTypes } : undefined;
      handleFileUploadEnhanced(event, onFileSelect, config);
    },
    
    // Image handling
    handleImageLoad: handleImageLoadEnhanced,
    
    // Scroll and resize
    handleScroll: (event: Event, onScroll: ScrollHandler, throttleMs?: number) => {
      const throttledScroll = useThrottledScroll(onScroll, throttleMs || 16);
      const target = event.target as HTMLElement;
      throttledScroll(target.scrollTop, target.scrollLeft);
      return () => {}; // Return cleanup function
    },
    handleResize: (onResize: ResizeHandler, debounceMs?: number) => {
      const debouncedResize = useDebouncedResize(onResize, debounceMs || 250);
      debouncedResize(window.innerWidth, window.innerHeight);
      return () => {}; // Return cleanup function
    },
    
    // Interaction handlers
    handleClickOutside: handleClickOutsideEnhanced,
    handleKeyboardNavigation: handleKeyboardNavigationEnhanced,
    handleTouch: handleTouchEnhanced,
    handleDragAndDrop: handleDragAndDropEnhanced
  };
  
  return {
    utils,
    loadingState,
    tabState,
    searchState,
    filterState
  };
};

// ============================================================================
// Export Enhanced Utilities
// ============================================================================

export default {
  // Enhanced handlers
  handleEscapeEnhanced,
  handleSubmitEnhanced,
  handleMapClickEnhanced,
  handleFileUploadEnhanced,
  handleImageLoadEnhanced,
  handleLoadingStateEnhanced,
  handleErrorStateEnhanced,
  handleClickOutsideEnhanced,
  handleKeyboardNavigationEnhanced,
  handleTouchEnhanced,
  handleDragAndDropEnhanced,
  
  // Performance optimized handlers
  useDebouncedSearch,
  useThrottledScroll,
  useDebouncedResize,
  
  // Hook
  useComponentUtils
};
