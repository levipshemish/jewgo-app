'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface BackToTopButtonProps {
  className?: string;
  threshold?: number;
  smooth?: boolean;
}

export default function BackToTopButton({ 
  className = '', 
  threshold = 400, 
  smooth = true 
}: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = useCallback(() => {
    if (typeof window !== 'undefined') {
      setIsVisible(window.pageYOffset > threshold);
    }
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (smooth) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [smooth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', toggleVisibility);
      return () => window.removeEventListener('scroll', toggleVisibility);
    }
    return undefined;
  }, [toggleVisibility]);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 p-3 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${className}`}
      aria-label="Back to top"
      style={{ minHeight: '44px', minWidth: '44px' }} // Accessibility: minimum touch target
    >
      <svg 
        className="w-6 h-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 10l7-7m0 0l7 7m-7-7v18" 
        />
      </svg>
    </button>
  );
}
