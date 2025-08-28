import React from 'react';
import { useRouter } from 'next/navigation';

// Shared navigation item interface
export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  onClick?: () => void;
}

// Shared button styles for consistent styling
export const sharedButtonStyles = {
  minHeight: '44px',
  minWidth: '44px',
  touchAction: 'manipulation' as const,
  WebkitTapHighlightColor: 'transparent',
  cursor: 'pointer'
};

// Shared hook for navigation handling
export const useNavigation = () => {
  const router = useRouter();
  
  const handleNavigation = (href: string) => {
    router.push(href);
  };
  
  const handleTabClick = (category: NavigationItem, onTabChange?: (tab: string) => void) => {
    if (onTabChange) {
      onTabChange(category.id);
    }
    if (category.onClick) {
      category.onClick();
    } else {
      router.push(category.href);
    }
  };
  
  return { handleNavigation, handleTabClick };
};

// Shared keyboard navigation handler
export const handleKeyNavigation = (
  e: React.KeyboardEvent, 
  action: () => void
) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
};
