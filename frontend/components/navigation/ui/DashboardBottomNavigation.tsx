'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User, MessageSquare, Bell, Search, Store, Settings } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { useNotifications } from '@/lib/contexts/NotificationsContext';

interface DashboardBottomNavigationProps {
  activeTab?: string;
  maxWidth?: string;
}

const DashboardBottomNavigation: React.FC<DashboardBottomNavigationProps> = ({ 
  activeTab = 'overview',
  maxWidth: _maxWidth = 'max-w-lg' 
}) => {
  const router = useRouter();
  const _pathname = usePathname();
  const { unreadCount } = useNotifications();

  // Check if we're on mobile - ensure it's always detected correctly
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
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
  const _DivContainer = motion.div;

  // Dashboard navigation items
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      href: '/shtel/dashboard',
      icon: Store
    },
    {
      id: 'products',
      label: 'Products',
      href: '/shtel/dashboard?tab=products',
      icon: Search
    },
    {
      id: 'orders',
      label: 'Orders',
      href: '/shtel/dashboard?tab=orders',
      icon: MessageSquare
    },
    {
      id: 'messages',
      label: 'Messages',
      href: '/shtel/dashboard?tab=messages',
      icon: Bell
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/shtel/dashboard?tab=settings',
      icon: Settings
    }
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 9999 }}>
      <div className="w-full bg-white" style={{ backgroundColor: '#ffffff' }}>
        <div className={`dynamic-bottom-nav flex items-center justify-around bg-white ${isMobileView ? 'mobile-nav' : ''}`} style={{ backgroundColor: '#ffffff' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasUnread = isClient && item.id === 'messages' && unreadCount > 0;
            
            return (
              <ButtonContainer
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className="dynamic-bottom-nav-button flex flex-col items-center space-y-1 flex-1 transition-all duration-200 relative"
                {...(isClient && !isMobile ? {
                  whileHover: { scale: 1.05 },
                  whileTap: { scale: 0.95 }
                } : {})}
                style={{
                  minHeight: '44px',
                  minWidth: '44px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <div className="relative">
                  <Icon 
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-200 ${
                      isActive 
                        ? 'text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  />
                  {hasUnread && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span className={`text-xs sm:text-sm font-medium transition-colors duration-200 ${
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                  {item.label}
                </span>
              </ButtonContainer>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardBottomNavigation;
