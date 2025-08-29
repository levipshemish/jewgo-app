'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User, MessageSquare, Bell, Search} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { useNotifications } from '@/lib/contexts/NotificationsContext';

interface BottomNavigationProps {
  maxWidth?: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ maxWidth: _maxWidth = 'max-w-lg' }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  // Check if we're on mobile - ensure it's always detected correctly
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    setIsHydrated(true);
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 9999 }}>
      <div className="w-full bg-white" style={{ backgroundColor: '#ffffff' }}>
        <div className={`dynamic-bottom-nav flex items-center justify-around bg-white ${isHydrated && isMobileView ? 'mobile-nav' : ''}`} style={{ backgroundColor: '#ffffff' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.id === 'explore' && pathname === '/eatery');
            const hasUnread = isHydrated && item.id === 'notifications' && unreadCount > 0;
            
            return (
              <ButtonContainer
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className="dynamic-bottom-nav-button flex flex-col items-center space-y-1 flex-1 transition-all duration-200 relative"
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
                    size={22} 
                    className={`${isActive ? 'text-black' : 'text-gray-400'} transition-colors duration-200`}
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
                <span className={`dynamic-text-xs font-medium transition-colors duration-200 ${isActive ? 'text-black' : 'text-gray-400'}`}>
                  {item.label}
                </span>
                {isHydrated && isMobile ? (
                  isActive && (
                    <div
                      className="w-1 h-1 bg-black rounded-full mt-1"
                      style={{
                        transform: 'scale(1)',
                        opacity: 1
                      }}
                    />
                  )
                ) : (
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-1 h-1 bg-black rounded-full mt-1"
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
};

export default BottomNavigation; 