'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';

interface BackToTopButtonProps {
  targetRef?: React.RefObject<HTMLElement>;
  threshold?: number;
  className?: string;
  topSentinelId?: string;
}

export const BackToTopButton: React.FC<BackToTopButtonProps> = ({
  targetRef,
  threshold = 400,
  className = '',
  topSentinelId = 'top-sentinel'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Try to use IntersectionObserver with top sentinel first
    const sentinel = document.getElementById(topSentinelId);
    
    if (sentinel && window.IntersectionObserver) {
      // Use IntersectionObserver for better performance
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          // Button is visible when sentinel is NOT intersecting (user has scrolled down)
          setIsVisible(!entry.isIntersecting);
        },
        { threshold: 0 }
      );
      
      observerRef.current.observe(sentinel);
      
      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    } else {
      // Fallback to scroll listener with throttling
      let ticking = false;
      
      const handleScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setIsVisible(scrollTop > threshold);
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [threshold, topSentinelId]);

  const handleClick = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = prefersReducedMotion ? 'auto' : 'smooth';
    
    if (targetRef?.current) {
      targetRef.current.scrollTo({ top: 0, behavior });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleClick}
      className={`
        fixed z-50 bottom-5 right-5
        w-12 h-12 md:w-14 md:h-14
        bg-jewgo-500 hover:bg-jewgo-600 
        text-white rounded-full shadow-lg
        transition-all duration-200 ease-in-out 
        hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 
        focus:ring-jewgo-400 focus:ring-offset-2
        ${className}
      `}
      style={{
        marginBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp size={20} className="mx-auto" />
    </button>
  );
};
