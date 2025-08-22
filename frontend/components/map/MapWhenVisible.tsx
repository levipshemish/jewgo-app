'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MapWhenVisibleProps {
  children: React.ReactNode;
  rootMargin?: string;
  className?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
}

export default function MapWhenVisible({
  children, rootMargin = '200px', className = '', intrinsicWidth = 800, intrinsicHeight = 600, }: MapWhenVisibleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    let rafId: number | null = null;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        // Defer state change to next frame to avoid layout thrash
        rafId = window.requestAnimationFrame(() => {
          setIsVisible(true);
          io.disconnect();
        });
      }
    }, { rootMargin });

    io.observe(el);
    return () => {
      io.disconnect();
      if (rafId) { cancelAnimationFrame(rafId); }
    };
  }, [rootMargin]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        containIntrinsicSize: `${intrinsicWidth}px ${intrinsicHeight}px` as any,
      }}
    >
      {isVisible ? children : null}
    </div>
  );
}
