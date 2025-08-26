'use client';

import { useState, useEffect } from 'react';

export default function Clock() {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Update time immediately
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString());
    };
    
    updateTime();
    
    // Update every second
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Return empty string during SSR to prevent hydration mismatch
  if (typeof window === 'undefined') {
    return <span></span>;
  }

  return <span>{currentTime}</span>;
}
