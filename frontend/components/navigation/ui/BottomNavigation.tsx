'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User, MessageSquare, Bell, Search} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import { useNotifications } from '@/lib/contexts/NotificationsContext';

interface BottomNavigationProps {
  maxWidth?: string;
  size?: 'compact' | 'default' | 'roomy';
  showLabels?: 'always' | 'active-only' | 'never';
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ maxWidth: _maxWidth = 'max-w-lg', size = 'default', showLabels = 'always' }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  // Check if we're on mobile - ensure it's always detected correctly
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    setIsHydrated(true);
    // Ensure a stable portal container attached to document.body
    const id = 'bottom-nav-portal';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('id', id);
      document.body.appendChild(el);
    }
    setPortalEl(el);
    const checkMobile = () => {
      const mobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsMobileView(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);
  
  // Use motion components consistently to avoid hydration mismatch
  const ButtonContainer = motion.button;
  const DivContainer = motion.div;

  // Standard navigation items for all pages
  const navItems = [
    {
      id: 'explore',
      label: 'Explore',
      href: '/eatery',
      icon: Search
    },
    {
      id: 'favorites',
      label: 'Favorites',
      href: '/favorites',
      icon: Heart
    },
    {
      id: 'reviews',
      label: 'Reviews',
      href: '/reviews',
      icon: MessageSquare
    },
    {
      id: 'notifications',
      label: 'Notifications',
      href: '/notifications',
      icon: Bell
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: User
    }
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const navContent = (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-[var(--z-bottom-nav)] pointer-events-auto rounded-t-2xl bottom-navigation-fixed"
      style={{ 
        backgroundColor: '#ffffff', 
        opacity: 1,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 'var(--z-bottom-nav)'
      }}
    >
      <div className="w-full bg-transparent">
        <div className={`dynamic-bottom-nav flex items-center justify-around bg-transparent ${size === 'compact' ? 'px-2 py-1.5 gap-1' : size === 'roomy' ? 'px-4 py-3 gap-2' : 'px-3 py-2 gap-1'} ${isHydrated && isMobileView ? 'mobile-nav' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.id === 'explore' && pathname === '/eatery');
            const hasUnread = isHydrated && item.id === 'notifications' && unreadCount > 0;
            
            return (
              <ButtonContainer
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className={`dynamic-bottom-nav-button flex flex-col items-center ${size === 'roomy' ? 'space-y-1.5' : 'space-y-1'} flex-1 transition-all duration-200 relative rounded-xl ${size === 'compact' ? 'px-1.5 py-0.5' : size === 'roomy' ? 'px-3 py-2' : 'px-2 py-1'} ${isActive ? 'bg-gray-100' : 'bg-transparent'}`}
                {...(isHydrated && !isMobile ? {
                  whileHover: { scale: 1.05 },
                  whileTap: { scale: 0.95 }
                } : {})}
                style={{
                  minHeight: '44px',
                  minWidth: '44px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  position: 'relative',
                  zIndex: 1,
                  // Force scale for mobile
                  ...(isHydrated && isMobile && {
                    transform: 'scale(1)'
                  })
                }}
              >
                <div className="relative">
                  <Icon 
                    size={size === 'compact' ? 22 : size === 'roomy' ? 26 : 24} 
                    className={`${isActive ? 'text-black' : 'text-gray-500'} transition-colors duration-200`}
                  />
                  {/* Unread notifications indicator */}
                  {hasUnread && (
                    <DivContainer
                      {...(isHydrated && !isMobile ? {
                        initial: { scale: 0, opacity: 0 },
                        animate: { scale: 1, opacity: 1 },
                        exit: { scale: 0, opacity: 0 }
                      } : {})}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                      style={{
                        // Force scale for mobile
                        ...(isHydrated && isMobile && {
                          transform: 'scale(1)',
                          opacity: 1
                        })
                      }}
                    >
                      <span className="text-white text-xs font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </DivContainer>
                  )}
                </div>
                {showLabels !== 'never' && (showLabels === 'always' || isActive) && (
                  <span className={`${size === 'compact' ? 'text-[10px]' : size === 'roomy' ? 'text-xs' : 'text-[11px]'} leading-tight font-medium transition-colors duration-200 ${isActive ? 'text-black' : 'text-gray-500'}`}>
                    {item.label}
                  </span>
                )}
                {isHydrated && isMobile ? (
                  isActive && (<div className="w-5 h-0.5 bg-black rounded-full mt-1" />)
                ) : (
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 20, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="h-0.5 bg-black rounded-full mt-1"
                      />
                    )}
                  </AnimatePresence>
                )}
              </ButtonContainer>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Render via portal once hydrated to decouple from page layout/expanding viewport
  return isHydrated && portalEl ? ReactDOM.createPortal(navContent, portalEl) : navContent;
};

export default BottomNavigation; 
