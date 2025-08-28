/**
 * React Component Utility Types
 * =============================
 * 
 * Comprehensive type definitions for React component utilities
 * Provides proper typing for event handlers, form data, and component interactions
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

import { 
  KeyboardEvent, 
  FormEvent, 
  MouseEvent, 
  ChangeEvent, 
  TouchEvent, 
  DragEvent,
  RefObject,
  ReactNode
} from 'react';

// ============================================================================
// Event Handler Types
// ============================================================================

export type EscapeHandler = (event: KeyboardEvent) => void;
export type SubmitHandler<T = Record<string, any>> = (data: T) => void | Promise<void>;
export type MapClickHandler = (lat: number, lng: number) => void;
export type ClickHandler = (event: MouseEvent) => void;
export type TabChangeHandler = (tabId: string) => void;
export type SearchHandler = (query: string) => void;
export type ToggleHandler = (value: boolean) => void;
export type FiltersChangeHandler = (filters: Record<string, any>) => void;
export type SuggestionSelectHandler = (suggestion: string) => void;
export type LoadingChangeHandler = (loading: boolean) => void;
export type ErrorChangeHandler = (error: Error | null) => void;
export type FileSelectHandler = (file: File) => void;
export type ImageLoadHandler = () => void;
export type ScrollHandler = (scrollTop: number, scrollLeft: number) => void;
export type ResizeHandler = (width: number, height: number) => void;
export type OutsideClickHandler = () => void;
export type NavigationHandler = (direction: 'up' | 'down' | 'left' | 'right') => void;
export type SelectHandler = () => void;
export type TouchHandler = (event: TouchEvent) => void;
export type DragHandler = (event: DragEvent) => void;

// ============================================================================
// Form Data Types
// ============================================================================

export interface FormData {
  [key: string]: string | number | boolean | File | File[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface Validator<T = any> {
  (data: T): ValidationResult;
}

// ============================================================================
// Component State Types
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

export interface TabState {
  activeTab: string;
  tabs: string[];
}

export interface SearchState {
  query: string;
  suggestions: string[];
  results: any[];
}

export interface FilterState {
  filters: Record<string, any>;
  isVisible: boolean;
}

// ============================================================================
// File Upload Types
// ============================================================================

export interface FileUploadConfig {
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  multiple?: boolean;
}

export interface FileUploadResult {
  file: File;
  isValid: boolean;
  error?: string;
}

// ============================================================================
// Image Handling Types
// ============================================================================

export interface ImageLoadConfig {
  onLoad?: ImageLoadHandler;
  onError?: ImageLoadHandler;
  fallbackSrc?: string;
}

export interface ImageValidationResult {
  isValid: boolean;
  url: string;
  error?: string;
}

// ============================================================================
// Scroll and Resize Types
// ============================================================================

export interface ScrollConfig {
  throttleMs?: number;
  debounceMs?: number;
}

export interface ResizeConfig {
  debounceMs?: number;
  minWidth?: number;
  minHeight?: number;
}

// ============================================================================
// Keyboard Navigation Types
// ============================================================================

export interface KeyboardConfig {
  onNavigate?: NavigationHandler;
  onSelect?: SelectHandler;
  onEscape?: () => void;
  enabled?: boolean;
}

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

// ============================================================================
// Touch Event Types
// ============================================================================

export interface TouchConfig {
  onTouchStart?: TouchHandler;
  onTouchMove?: TouchHandler;
  onTouchEnd?: TouchHandler;
  preventDefault?: boolean;
}

// ============================================================================
// Drag and Drop Types
// ============================================================================

export interface DragDropConfig {
  onDragOver?: DragHandler;
  onDrop?: DragHandler;
  onDragLeave?: DragHandler;
  acceptTypes?: string[];
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface ComponentUtilsProps {
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  loading?: boolean;
  error?: Error | null;
}

export interface FormComponentProps extends ComponentUtilsProps {
  onSubmit?: SubmitHandler;
  validator?: Validator;
  initialData?: FormData;
}

export interface InteractiveComponentProps extends ComponentUtilsProps {
  onClick?: ClickHandler;
  onKeyDown?: (event: KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  tabIndex?: number;
}

// ============================================================================
// Utility Function Signatures
// ============================================================================

export interface ComponentUtils {
  // Event handlers
  handleEscape: (event: KeyboardEvent, onClose: () => void, enabled?: boolean) => void;
  handleSubmit: <T = FormData>(
    event: FormEvent, 
    onSubmit: SubmitHandler<T>, 
    validator?: Validator<T>
  ) => void;
  handleMapClick: (event: MouseEvent, onMapClick: MapClickHandler) => void;
  handleAddEateryClick: (event: MouseEvent, onAddEatery: () => void, preventDefault?: boolean) => void;
  handleFiltersClick: (event: MouseEvent, onFiltersClick: () => void, preventDefault?: boolean) => void;
  handleTabClick: (tabId: string, onTabChange: TabChangeHandler, activeTab: string) => void;
  handleSearch: (query: string, onSearch: SearchHandler, debounceMs?: number) => () => void;
  handleShowFilters: (currentState: boolean, onToggle: ToggleHandler) => void;
  handleFiltersChange: (filters: Record<string, any>, onFiltersChange: FiltersChangeHandler) => void;
  handleClearFilters: (onClearFilters: () => void) => void;
  handleSearchWithSuggestions: (
    query: string, 
    suggestions: string[], 
    onSearch: SearchHandler, 
    onSelectSuggestion?: SuggestionSelectHandler
  ) => void;
  
  // State management
  handleLoadingState: (
    isLoading: boolean, 
    onLoadingChange: LoadingChangeHandler, 
    operation: () => Promise<void>
  ) => void;
  handleErrorState: (
    error: Error | null, 
    onErrorChange: ErrorChangeHandler, 
    operation: () => Promise<void>
  ) => void;
  
  // File handling
  handleFileUpload: (
    event: ChangeEvent<HTMLInputElement>, 
    onFileSelect: FileSelectHandler, 
    acceptedTypes?: string[]
  ) => void;
  
  // Image handling
  handleImageLoad: (onLoad: ImageLoadHandler, onError?: ImageLoadHandler) => ImageLoadConfig;
  
  // Scroll and resize
  handleScroll: (event: Event, onScroll: ScrollHandler, throttleMs?: number) => () => void;
  handleResize: (onResize: ResizeHandler, debounceMs?: number) => () => void;
  
  // Interaction handlers
  handleClickOutside: (ref: RefObject<HTMLElement>, onOutsideClick: OutsideClickHandler) => (event: MouseEvent) => void;
  handleKeyboardNavigation: (event: KeyboardEvent, config: KeyboardConfig) => void;
  handleTouch: (config: TouchConfig) => {
    onTouchStart?: TouchHandler;
    onTouchMove?: TouchHandler;
    onTouchEnd?: TouchHandler;
  };
  handleDragAndDrop: (config: DragDropConfig) => {
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
    onDragLeave?: DragHandler;
  };
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseComponentUtilsReturn {
  utils: ComponentUtils;
  loadingState: LoadingState;
  tabState: TabState;
  searchState: SearchState;
  filterState: FilterState;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}

export interface FieldValidation {
  field: string;
  config: ValidationConfig;
  message?: string;
}

// ============================================================================
// Performance Types
// ============================================================================

export interface PerformanceConfig {
  throttleMs?: number;
  debounceMs?: number;
  maxCalls?: number;
  timeWindow?: number;
}

export interface PerformanceMetrics {
  calls: number;
  lastCall: number;
  averageTime: number;
}
