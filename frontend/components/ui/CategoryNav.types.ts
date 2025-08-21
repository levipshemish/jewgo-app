import { ReactNode, HTMLAttributes } from 'react';

/**
 * Represents a single category navigation item
 */
export interface CategoryNavItem {
  /** Unique identifier for the item */
  id: string;
  /** Display label for the item */
  label: string;
  /** Optional icon to display alongside the label */
  icon?: ReactNode;
  /** Optional href for navigation (if not provided, item acts as a button) */
  href?: string;
  /** Optional target for external links */
  target?: '_blank' | '_self' | '_parent' | '_top';
  /** Optional rel attribute for external links (auto-applied for target="_blank") */
  rel?: string;
  /** Whether the item is disabled */
  disabled?: boolean;
}

/**
 * Props for the CategoryNav component
 */
export interface CategoryNavProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Array of category items to display */
  items: CategoryNavItem[];
  /** Currently selected item ID */
  selectedId?: string;
  /** Callback when an item is selected */
  onSelect?: (id: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Accessibility label for the navigation */
  'aria-label'?: string;
  /** Accessibility labelledby reference */
  'aria-labelledby'?: string;
}

/**
 * Overflow state for the navigation scroller
 */
export type OverflowState = 'start' | 'end' | 'both' | 'none';

/**
 * Direction for manual scrolling
 */
export type ScrollDirection = 'left' | 'right';

/**
 * Configuration for Next.js Link optimization
 */
export interface LinkOptimizationConfig {
  /** Whether to prefetch the link (default: false for large lists) */
  prefetch?: boolean;
  /** Whether to replace the current history entry */
  replace?: boolean;
  /** Scroll behavior for navigation */
  scroll?: boolean;
}

/**
 * External link security configuration
 */
export interface ExternalLinkConfig {
  /** Target attribute for external links */
  target: '_blank';
  /** Security attributes for external links */
  rel: 'noopener noreferrer';
}

/**
 * Icon accessibility configuration
 */
export interface IconAccessibilityConfig {
  /** Whether the icon is decorative (aria-hidden="true") */
  decorative?: boolean;
  /** Description for meaningful icons (aria-describedby) */
  description?: string;
  /** Whether the icon is focusable */
  focusable?: boolean;
}

/**
 * Button type configuration to prevent form submission
 */
export interface ButtonTypeConfig {
  /** Button type attribute (always "button" to prevent form submission) */
  type: 'button';
}

/**
 * Focus management configuration
 */
export interface FocusManagementConfig {
  /** Whether controls are visible and focusable */
  visible: boolean;
  /** Tab index for focus management */
  tabIndex: number;
  /** Whether focus should be moved when controls become hidden */
  moveFocusOnHide: boolean;
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  /** Whether to memoize items to prevent unnecessary re-renders */
  memoizeItems: boolean;
  /** Whether to use ResizeObserver for overflow detection */
  useResizeObserver: boolean;
  /** Whether to respect reduced motion preferences */
  respectReducedMotion: boolean;
}

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
  /** Whether to use aria-labelledby preference over aria-label */
  preferLabelledBy: boolean;
  /** Whether to avoid role="list" for better screen reader support */
  avoidListRole: boolean;
  /** Whether to gate keyboard navigation */
  gateKeyboardNavigation: boolean;
  /** Whether to use proper Space/Enter semantics */
  useProperSemantics: boolean;
}

/**
 * Production guardrails configuration
 */
export interface ProductionGuardrailsConfig {
  /** Whether to maintain single source of truth for selection */
  singleSourceOfTruth: boolean;
  /** Whether to cache RTL detection */
  cacheRTLDetection: boolean;
  /** Whether to ensure observer safety */
  observerSafety: boolean;
  /** Whether to ensure hydration stability */
  hydrationStability: boolean;
  /** Whether to use disabled link spans */
  disabledLinkSpans: boolean;
  /** Whether to ensure proper hit target sizing */
  hitTargetSizing: boolean;
  /** Whether to provide manual scroll fallback */
  manualScrollFallback: boolean;
}

/**
 * Complete configuration for CategoryNav component
 */
export interface CategoryNavConfig {
  /** Link optimization settings */
  linkOptimization: LinkOptimizationConfig;
  /** External link security settings */
  externalLinkSecurity: ExternalLinkConfig;
  /** Icon accessibility settings */
  iconAccessibility: IconAccessibilityConfig;
  /** Button type settings */
  buttonType: ButtonTypeConfig;
  /** Focus management settings */
  focusManagement: FocusManagementConfig;
  /** Performance optimization settings */
  performance: PerformanceConfig;
  /** Accessibility settings */
  accessibility: AccessibilityConfig;
  /** Production guardrails settings */
  guardrails: ProductionGuardrailsConfig;
}

/**
 * Default configuration for CategoryNav component
 */
export const DEFAULT_CATEGORY_NAV_CONFIG: CategoryNavConfig = {
  linkOptimization: {
    prefetch: false,
    replace: false,
    scroll: true,
  },
  externalLinkSecurity: {
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  iconAccessibility: {
    decorative: true,
    focusable: false,
  },
  buttonType: {
    type: 'button',
  },
  focusManagement: {
    visible: false,
    tabIndex: -1,
    moveFocusOnHide: true,
  },
  performance: {
    memoizeItems: true,
    useResizeObserver: true,
    respectReducedMotion: true,
  },
  accessibility: {
    preferLabelledBy: true,
    avoidListRole: true,
    gateKeyboardNavigation: true,
    useProperSemantics: true,
  },
  guardrails: {
    singleSourceOfTruth: true,
    cacheRTLDetection: true,
    observerSafety: true,
    hydrationStability: true,
    disabledLinkSpans: true,
    hitTargetSizing: true,
    manualScrollFallback: true,
  },
};
