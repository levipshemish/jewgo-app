'use client';

import React, { useEffect, useState } from 'react';

interface SafeLoaderProps {
  children: React.ReactNode;
  timeoutMs?: number;
  fallback?: React.ReactNode;
}

export function SafeLoader({ 
  children, 
  timeoutMs = 8000,
  fallback = <div className="p-6 text-sm text-gray-600">Still loading… try reloading or continue without location.</div>
}: SafeLoaderProps) {
  const [timedOut, setTimedOut] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);
  
  if (timedOut) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
