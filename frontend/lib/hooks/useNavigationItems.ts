import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  href: string;
  onClick?: () => void;
  disabled?: boolean;
  hidden?: boolean;
  badge?: {
    count: number;
    variant?: 'default' | 'success' | 'warning' | 'error';
  };
  permissions?: string[];
  featureFlag?: string;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
  collapsed?: boolean;
  collapsible?: boolean;
}

export interface UseNavigationItemsOptions {
  /**
   * Whether to enable memoization
   */
  memoize?: boolean;
  /**
   * Custom permission checker
   */
  checkPermission?: (permission: string) => boolean;
  /**
   * Custom feature flag checker
   */
  checkFeatureFlag?: (flag: string) => boolean;
  /**
   * Whether to filter hidden items
   */
  filterHidden?: boolean;
  /**
   * Whether to filter disabled items
   */
  filterDisabled?: boolean;
  /**
   * Custom filtering function
   */
  customFilter?: (item: NavigationItem) => boolean;
}

export interface UseNavigationItemsReturn {
  /**
   * All navigation items (unfiltered)
   */
  allItems: NavigationItem[];
  /**
   * Filtered navigation items
   */
  items: NavigationItem[];
  /**
   * Navigation items grouped by category
   */
  groupedItems: NavigationGroup[];
  /**
   * Get item by ID
   */
  getItem: (id: string) => NavigationItem | undefined;
  /**
   * Check if item is active
   */
  isItemActive: (item: NavigationItem, currentPath?: string) => boolean;
  /**
   * Get active item
   */
  getActiveItem: (currentPath?: string) => NavigationItem | undefined;
  /**
   * Filter items by custom criteria
   */
  filterItems: (filterFn: (item: NavigationItem) => boolean) => NavigationItem[];
  /**
   * Search items by label or ID
   */
  searchItems: (query: string) => NavigationItem[];
}

export function useNavigationItems(
  items: NavigationItem[],
  options: UseNavigationItemsOptions = {}
): UseNavigationItemsReturn {
  const _router = useRouter();
  const {
    memoize = true,
    checkPermission = () => true,
    checkFeatureFlag = () => true,
    filterHidden = true,
    filterDisabled = false,
    customFilter,
  } = options;

  // Memoized filtered items
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply custom filter first
    if (customFilter) {
      filtered = filtered.filter(customFilter);
    }

    // Filter by permissions
    filtered = filtered.filter(item => {
      if (item.permissions) {
        return item.permissions.every(permission => checkPermission(permission));
      }
      return true;
    });

    // Filter by feature flags
    filtered = filtered.filter(item => {
      if (item.featureFlag) {
        return checkFeatureFlag(item.featureFlag);
      }
      return true;
    });

    // Filter hidden items
    if (filterHidden) {
      filtered = filtered.filter(item => !item.hidden);
    }

    // Filter disabled items
    if (filterDisabled) {
      filtered = filtered.filter(item => !item.disabled);
    }

    return filtered;
  }, [
    items,
    customFilter,
    checkPermission,
    checkFeatureFlag,
    filterHidden,
    filterDisabled,
  ]);

  // Memoized grouped items
  const groupedItems = useMemo(() => {
    const groups: Record<string, NavigationGroup> = {};
    
    filteredItems.forEach(item => {
      // Extract group from ID (e.g., "main.explore" -> "main")
      const groupId = item.id.includes('.') ? item.id.split('.')[0] : 'default';
      
      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          label: groupId === 'default' ? 'Navigation' : groupId.charAt(0).toUpperCase() + groupId.slice(1),
          items: [],
          collapsible: false,
          collapsed: false,
        };
      }
      
      groups[groupId].items.push(item);
    });

    return Object.values(groups);
  }, [filteredItems]);

  // Get item by ID
  const getItem = useCallback((id: string) => {
    return items.find(item => item.id === id);
  }, [items]);

  // Check if item is active
  const isItemActive = useCallback((item: NavigationItem, currentPath?: string) => {
    if (!currentPath) return false;
    
    // Exact match
    if (item.href === currentPath) return true;
    
    // Special case for explore/eatery
    if (item.id === 'explore' && currentPath === '/eatery') return true;
    
    // Check if current path starts with item href (for nested routes)
    if (item.href !== '/' && currentPath.startsWith(item.href)) return true;
    
    return false;
  }, []);

  // Get active item
  const getActiveItem = useCallback((currentPath?: string) => {
    if (!currentPath) return undefined;
    return filteredItems.find(item => isItemActive(item, currentPath));
  }, [filteredItems, isItemActive]);

  // Filter items by custom criteria
  const filterItems = useCallback((filterFn: (item: NavigationItem) => boolean) => {
    return filteredItems.filter(filterFn);
  }, [filteredItems]);

  // Search items
  const searchItems = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return filteredItems.filter(item => 
      item.label.toLowerCase().includes(lowerQuery) ||
      item.id.toLowerCase().includes(lowerQuery)
    );
  }, [filteredItems]);

  // Always create the memoized result to avoid conditional hook calls
  const memoizedResult = useMemo(() => ({
    allItems: items,
    items: filteredItems,
    groupedItems,
    getItem,
    isItemActive,
    getActiveItem,
    filterItems,
    searchItems,
  }), [
    items,
    filteredItems,
    groupedItems,
    getItem,
    isItemActive,
    getActiveItem,
    filterItems,
    searchItems,
  ]);

  // Return memoized or non-memoized result
  if (memoize) {
    return memoizedResult;
  }

  return {
    allItems: items,
    items: filteredItems,
    groupedItems,
    getItem,
    isItemActive,
    getActiveItem,
    filterItems,
    searchItems,
  };
}

// Predefined navigation item configurations
export const DEFAULT_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'explore',
    label: 'Explore',
    href: '/eatery',
    icon: () => null, // Will be replaced with actual icon component
  },
  {
    id: 'favorites',
    label: 'Favorites',
    href: '/favorites',
    icon: () => null,
  },
  {
    id: 'reviews',
    label: 'Reviews',
    href: '/reviews',
    icon: () => null,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    icon: () => null,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: () => null,
  },
];

export const DASHBOARD_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    href: '/shtel/dashboard',
    icon: () => null,
  },
  {
    id: 'products',
    label: 'Products',
    href: '/shtel/dashboard?tab=products',
    icon: () => null,
  },
  {
    id: 'orders',
    label: 'Orders',
    href: '/shtel/dashboard?tab=orders',
    icon: () => null,
  },
  {
    id: 'messages',
    label: 'Messages',
    href: '/shtel/dashboard?tab=messages',
    icon: () => null,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/shtel/dashboard?tab=settings',
    icon: () => null,
  },
];

export const CATEGORY_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'mikvah',
    label: 'Mikvah',
    href: '/mikvah',
    icon: () => null,
  },
  {
    id: 'shuls',
    label: 'Shuls',
    href: '/shuls',
    icon: () => null,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    href: '/marketplace',
    icon: () => null,
  },
  {
    id: 'shtel',
    label: 'Shtel',
    href: '/shtel',
    icon: () => null,
  },
  {
    id: 'eatery',
    label: 'Eatery',
    href: '/eatery',
    icon: () => null,
  },
  {
    id: 'stores',
    label: 'Stores',
    href: '/stores',
    icon: () => null,
  },
];

// Utility function to create navigation items with icons
export function createNavigationItems<T extends Record<string, React.ComponentType<any>>>(
  items: Omit<NavigationItem, 'icon'>[],
  icons: T
): NavigationItem[] {
  return items.map(item => ({
    ...item,
    icon: icons[item.id] || (() => null),
  }));
}
