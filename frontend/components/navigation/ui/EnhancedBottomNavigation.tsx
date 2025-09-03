'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User, MessageSquare, Bell, Search } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

import { useNotifications } from '@/lib/contexts/NotificationsContext';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useDeviceDetection } from '@/lib/hooks/useDeviceDetection';
import { useNavigationItems, type NavigationItem } from '@/lib/hooks/useNavigationItems';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';
import { useAnimationConfig } from '@/lib/hooks/useAnimationConfig';
import styles from './Navigation.module.css';

interface EnhancedBottomNavigationProps {
  /**
   * Custom navigation items to override defaults
   */
  items?: NavigationItem[];
  /**
   * Whether to show labels
   */
  showLabels?: boolean;
  /**
   * Whether to enable animations
   */
  enableAnimations?: boolean;
  /**
   * Custom CSS class name
   */
  className?: string;
  /**
   * Whether to enable keyboard navigation
   */
  enableKeyboardNavigation?: boolean;
}

export const EnhancedBottomNavigation: React.FC<EnhancedBottomNavigationProps> = ({
  items: customItems,
  showLabels = true,
  enableAnimations = true,
  className = '',
  enableKeyboardNavigation = true,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { isDark: _isDark } = useTheme();
  const { isMobile, isTablet: _isTablet, isDesktop: _isDesktop } = useDeviceDetection();
  const { getConfig, shouldDisableAnimation } = useAnimationConfig({
    enabled: enableAnimations,
    respectReducedMotion: true,
  });

  // Default navigation items with icons
  const defaultItems = useMemo(() => [
    {
      id: 'explore',
      label: 'Explore',
      href: '/eatery',
      icon: Search,
    },
    {
      id: 'favorites',
      label: 'Favorites',
      href: '/favorites',
      icon: Heart,
    },
    {
      id: 'reviews',
      label: 'Reviews',
      href: '/reviews',
      icon: MessageSquare,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      badge: {
        count: unreadCount,
        variant: 'default' as const,
      },
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: User,
    },
  ], [unreadCount]);

  // Use custom items or defaults
  const navigationItems = customItems || defaultItems;

  // Create navigation items with proper typing
  const { items, getActiveItem } = useNavigationItems(navigationItems, {
    memoize: true,
    filterHidden: true,
    filterDisabled: true,
  });

  // Get active item
  const activeItem = getActiveItem(pathname);
  const activeIndex = activeItem ? items.findIndex(item => item.id === activeItem.id) : 0;

  // Keyboard navigation
  const keyboardNav = useKeyboardNavigation({
    itemCount: items.length,
    activeIndex,
    onIndexChange: (index) => {
      const item = items[index];
      if (item) {
        router.push(item.href);
      }
    },
    horizontal: true,
    vertical: false,
    wrap: true,
    enabled: enableKeyboardNavigation,
  });

  // Animation config
  const _animationConfig = getConfig('normal');
  const animationsDisabled = shouldDisableAnimation('normal');

  // Handle navigation
  const _handleNavigation = (href: string) => {
    router.push(href);
  };

  // Get badge variant styles
  const getBadgeStyles = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-red-500';
    }
  };

  // Memoized motion components
  const MotionButton = useMemo(() => motion.button, []);
  const MotionDiv = useMemo(() => motion.div, []);

  return (
    <nav
      className={`${styles.navigation} ${styles.bottomNavigation} ${className}`}
      aria-label="Bottom navigation"
      {...keyboardNav.containerProps}
    >
      <div className={styles.navigationItems}>
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.id === activeItem?.id;
          const hasBadge = item.badge && item.badge.count > 0;
          const badgeCount = item.badge?.count || 0;
          const badgeVariant = item.badge?.variant || 'default';

          // Animation props
          const motionProps = animationsDisabled ? {} : {
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.95 },
            transition: { duration: 0.2 },
          };

          return (
            <MotionButton
              key={item.id}
              className={`${styles.navigationItem} ${isActive ? styles.active : ''}`}
              disabled={item.disabled}
              {...motionProps}
              {...keyboardNav.getItemProps(index)}
            >
              <div className="relative">
                <Icon
                  size={isMobile ? 20 : 22}
                  className={`${styles.navigationIcon} ${
                    isActive ? 'text-current' : ''
                  }`}
                />
                
                {/* Badge/Notification indicator */}
                {hasBadge && (
                  <MotionDiv
                    className={`${styles.notificationBadge} ${getBadgeStyles(badgeVariant)}`}
                    initial={animationsDisabled ? undefined : { scale: 0, opacity: 0 }}
                    animate={animationsDisabled ? undefined : { scale: 1, opacity: 1 }}
                    exit={animationsDisabled ? undefined : { scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-white text-xs font-bold">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  </MotionDiv>
                )}
              </div>

              {/* Label */}
              {showLabels && (
                <span className={styles.navigationLabel}>
                  {item.label}
                </span>
              )}

              {/* Active indicator */}
              {isActive && (
                <AnimatePresence>
                  <MotionDiv
                    className="absolute bottom-1 w-1 h-1 bg-current rounded-full"
                    initial={animationsDisabled ? undefined : { scale: 0, opacity: 0 }}
                    animate={animationsDisabled ? undefined : { scale: 1, opacity: 1 }}
                    exit={animationsDisabled ? undefined : { scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </AnimatePresence>
              )}
            </MotionButton>
          );
        })}
      </div>
    </nav>
  );
};

export default EnhancedBottomNavigation;
