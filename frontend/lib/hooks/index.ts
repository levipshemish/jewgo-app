export { useSearchInput } from './useSearchInput';
export { useSearchSuggestions } from './useSearchSuggestions';
export { useRecentSearches } from './useRecentSearches';
export { useIsMobile } from './useIsMobile';

export { useFeatureFlags } from './useFeatureFlags';
export { useScrollDetection } from './useScrollDetection';
export { useMobileTouch } from './useMobileTouch';
export { useTouchFeedback } from './useTouchFeedback';
export { usePrefersReducedMotion } from './usePrefersReducedMotion';

// New consolidated hooks
export { 
  useDeviceDetection,
  useIsMobile as useIsMobileNew,
  useIsTablet,
  useIsDesktop,
  useIsTouch,
  useOrientation,
  useScreenSize,
  type DeviceInfo,
  type UseDeviceDetectionOptions
} from './useDeviceDetection';

export { 
  useTheme,
  ThemeProvider,
  type Theme,
  type ThemeContextType,
  getThemeColor,
  isDarkMode
} from '../contexts/ThemeContext';

export { 
  useKeyboardNavigation,
  useTabNavigation,
  useListNavigation,
  useGridNavigation,
  type UseKeyboardNavigationOptions,
  type UseKeyboardNavigationReturn
} from './useKeyboardNavigation';

export { 
  useNavigationItems,
  createNavigationItems,
  DEFAULT_NAVIGATION_ITEMS,
  DASHBOARD_NAVIGATION_ITEMS,
  CATEGORY_NAVIGATION_ITEMS,
  type NavigationItem,
  type NavigationGroup,
  type UseNavigationItemsOptions,
  type UseNavigationItemsReturn
} from './useNavigationItems';

export { 
  useAnimationConfig,
  useFastAnimation,
  useNormalAnimation,
  useSlowAnimation,
  useSpringAnimation,
  useBounceAnimation,
  useElasticAnimation,
  createStaggeredAnimation,
  createEntranceAnimation,
  type AnimationConfig,
  type AnimationPresets,
  type UseAnimationConfigOptions,
  type UseAnimationConfigReturn
} from './useAnimationConfig';

// Phase 2 cursor pagination hooks
export {
  useCursorPagination,
  type UseCursorPaginationReturn
} from './useCursorPagination';

export {
  useUrlScrollState,
  type UseUrlScrollStateReturn
} from './useUrlScrollState';

export {
  useHybridRestaurantData,
  type UseHybridRestaurantDataReturn
} from './useHybridRestaurantData';

