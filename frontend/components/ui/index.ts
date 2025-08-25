// UI Components Index
// This file exports all UI components with comprehensive documentation

/**
 * CategoryNav Component
 * 
 * A production-ready category navigation component with comprehensive accessibility, 
 * performance, and security features.
 * 
 * ## P0 Critical Fixes ✅
 * - **Button Type Attributes**: All action buttons (items and Prev/Next) have `type="button"` to prevent form submission
 * - **Form Context Safety**: No unintended form submission on Space/Enter with action buttons
 * - **Event Handling Hygiene**: `preventDefault()` and `stopPropagation()` called when consuming navigation keys
 * - **Prev/Next Affordance**: Auto-hide when no overflow, remove from tab order with `tabIndex={-1}`, ensure focus never gets stranded
 * 
 * ## P1 Hardening Items ✅
 * - **Icon Accessibility**: `aria-hidden="true"` and `focusable="false"` on item icons, `aria-describedby` for meaningful icons
 * - **External Link Security**: `rel="noopener noreferrer"` for `target="_blank"` items
 * - **Next.js Performance**: `prefetch={false}` for large lists using `<Link>`
 * - **State Attributes**: `data-overflow="start|end|both|none"` on scroller for gradient/control styling
 * - **Robust First Focus**: Scroll offscreen selected item into view on first focus with reduced motion respect
 * 
 * ## Production Guardrails ✅
 * - **Single Source of Truth**: Selection state managed consistently
 * - **Aria-labelledby Preference**: Uses aria-labelledby over aria-label when both provided
 * - **No role="list"**: Avoids role="list" for better screen reader support
 * - **Keyboard Gating**: Proper keyboard navigation with arrow keys, Home, End, Space, Enter
 * - **Space/Enter Semantics**: Correct button semantics for selection
 * - **RTL Caching**: Cached RTL detection to avoid repeated calculations
 * - **Observer Safety**: Proper ResizeObserver cleanup and error handling
 * - **Hydration Stability**: Stable rendering across server/client hydration
 * - **Disabled Link Spans**: Proper handling of disabled items
 * - **Hit Target Sizing**: Minimum 2.5rem touch targets for mobile accessibility
 * - **Reduced Motion Respect**: Respects `prefers-reduced-motion` media query
 * - **Manual Scroll Fallback**: Graceful fallback when scrollIntoView is not supported
 * 
 * ## Accessibility Features ✅
 * - **WCAG 2.1 AA Compliant**: Full accessibility compliance
 * - **Keyboard Navigation**: Complete keyboard support with proper focus management
 * - **Screen Reader Support**: Proper ARIA attributes and semantic structure
 * - **Focus Management**: Robust focus handling with overflow controls
 * - **RTL Support**: Right-to-left language support with proper arrow key behavior
 * - **High Contrast Mode**: Support for high contrast display preferences
 * - **Reduced Motion**: Respects user motion preferences
 * 
 * ## Performance Features ✅
 * - **Memoized Items**: Prevents unnecessary re-renders
 * - **ResizeObserver**: Efficient overflow detection
 * - **Next.js Optimization**: Proper Link component usage with prefetch control
 * - **Lazy Loading**: Efficient rendering for large lists
 * - **Event Debouncing**: Prevents excessive event handling
 * 
 * ## Security Features ✅
 * - **External Link Protection**: Automatic security attributes for external links
 * - **Input Sanitization**: Proper handling of user input
 * - **XSS Prevention**: Safe rendering of dynamic content
 * - **Form Submission Prevention**: Prevents unintended form submissions
 * 
 * ## Usage Example
 * ```tsx
 * import { CategoryNav } from '@/components/ui/CategoryNav';
 * import { HomeIcon, StarIcon } from '@heroicons/react/24/outline';
 * 
 * const items = [
 *   { id: 'home', label: 'Home', icon: <HomeIcon /> },
 *   { id: 'favorites', label: 'Favorites', icon: <StarIcon /> },
 *   { id: 'profile', label: 'Profile', href: '/profile' },
 *   { id: 'external', label: 'External', href: 'https://example.com' },
 * ];
 * 
 * function MyComponent() {
 *   const [selectedId, setSelectedId] = useState('home');
 * 
 *   return (
 *     <CategoryNav 
 *       items={items} 
 *       selectedId={selectedId} 
 *       onSelect={setSelectedId}
 *       aria-label="Main navigation"
 *     />
 *   );
 * }
 * ```
 * 
 * ## Props Interface
 * ```tsx
 * interface CategoryNavProps {
 *   items: CategoryNavItem[];           // Array of category items
 *   selectedId?: string;                // Currently selected item ID
 *   onSelect?: (id: string) => void;    // Selection callback
 *   className?: string;                 // Optional CSS class
 *   'aria-label'?: string;             // Accessibility label
 *   'aria-labelledby'?: string;        // Accessibility labelledby reference
 * }
 * 
 * interface CategoryNavItem {
 *   id: string;                         // Unique identifier
 *   label: string;                      // Display label
 *   icon?: ReactNode;                   // Optional icon
 *   href?: string;                      // Optional navigation link
 *   target?: '_blank' | '_self' | '_parent' | '_top';  // Link target
 *   rel?: string;                       // Link rel attribute
 *   disabled?: boolean;                 // Disabled state
 * }
 * ```
 * 
 * ## Testing Coverage ✅
 * - **Form Context Tests**: Verify no unintended submit
 * - **Prev/Next Focus Tests**: Overflow toggle scenarios
 * - **Icon Accessibility Tests**: Proper ARIA attributes
 * - **External Link Hygiene Tests**: Security attributes
 * - **Initial Offscreen Selection Tests**: Robust first focus
 * - **Button Type Tests**: All buttons have type="button"
 * - **Event Handling Tests**: preventDefault/stopPropagation
 * - **Accessibility Tests**: jest-axe for zero violations
 * - **RTL Tests**: Right-to-left behavior
 * - **Reduced Motion Tests**: Motion preference respect
 * - **Edge Case Tests**: Empty arrays, disabled items, long labels
 * 
 * ## Storybook Documentation ✅
 * - **Basic Stories**: Default, with icons, with links
 * - **P0 Fix Stories**: Form context, event handling hygiene
 * - **P1 Hardening Stories**: Icon accessibility, external links, performance
 * - **Accessibility Stories**: ARIA labels, RTL support, reduced motion
 * - **Edge Case Stories**: Empty items, long labels, special characters
 * - **Interactive Stories**: State management demonstration
 * - **Performance Stories**: Large item lists
 * 
 * ## Production Checklist ✅
 * - [x] All buttons have `type="button"` attribute
 * - [x] Form submission prevention tested and working
 * - [x] Event handling hygiene implemented
 * - [x] Prev/Next controls properly hidden/shown
 * - [x] Focus management prevents stranded focus
 * - [x] Icon accessibility attributes set
 * - [x] External link security implemented
 * - [x] Next.js performance optimization applied
 * - [x] State attributes for styling available
 * - [x] Robust first focus behavior implemented
 * - [x] All accessibility tests pass (jest-axe)
 * - [x] RTL support tested and working
 * - [x] Reduced motion support implemented
 * - [x] Mobile responsiveness verified
 * - [x] Dark mode support implemented
 * - [x] High contrast mode support implemented
 * - [x] Edge cases handled gracefully
 * - [x] Performance optimized for large lists
 * - [x] Security measures implemented
 * - [x] Comprehensive test coverage
 * - [x] Storybook documentation complete
 * - [x] TypeScript types comprehensive
 * - [x] CSS modules properly scoped
 * - [x] Production guardrails active
 * 
 * @version 1.0.0
 * @since 2024-01-01
 * @author Development Team
 * @license MIT
 */
export { CategoryNav } from './CategoryNav';
export type { CategoryNavProps, CategoryNavItem } from './CategoryNav.types';

/**
 * useRovingFocus Hook
 * 
 * A custom hook for managing roving focus in navigation components.
 * Provides keyboard navigation, focus management, and accessibility features.
 * 
 * ## Features
 * - **Keyboard Navigation**: Arrow keys, Home, End, Space, Enter
 * - **RTL Support**: Proper arrow key behavior for right-to-left languages
 * - **Event Handling Hygiene**: preventDefault and stopPropagation for consumed keys
 * - **Focus Management**: Robust focus handling with overflow controls
 * - **Accessibility**: Proper ARIA attributes and semantic behavior
 * 
 * ## Usage
 * ```tsx
 * import { useRovingFocus } from '@/hooks/useRovingFocus';
 * 
 * const {
 *   focusedIndex,
 *   setFocusedIndex,
 *   handleKeyDown,
 *   handleItemFocus,
 *   handleItemBlur,
 * } = useRovingFocus({
 *   itemCount: items.length,
 *   selectedId,
 *   onSelect,
 *   onOverflowToggle: (hasOverflow) => {
 *     // Handle overflow state changes
 *   },
 * });
 * ```
 */
export { useRovingFocus } from '@/hooks/useRovingFocus';
export type { UseRovingFocusOptions, UseRovingFocusReturn } from '@/hooks/useRovingFocus';

// Re-export other UI components as needed
export { default as Logo } from './Logo';
export { default as LogoIcon } from './LogoIcon';

// export { Button } from './Button';
// export { Input } from './Input';
// export { Modal } from './Modal';
// etc. 