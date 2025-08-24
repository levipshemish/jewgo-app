import { useState, useEffect } from 'react';

// Custom hook for mobile detection
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check on mount
    checkMobile();

    // Add event listener for resize
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Custom hook for memoizing navigation items
export const useMemoizedNavItems = <T>(items: T[], _dependencies: any[] = []) => {
  const [memoizedItems] = useState(() => items);
  return memoizedItems;
};
