"use client";

import { useEffect, useRef, useState } from 'react';

// Measures approximate render→paint cost using a double-rAF technique.
// Call when a dependency changes that is expected to re-render a large list.
export function useRenderCostProbe(triggerKey: unknown): number | undefined {
  const startRef = useRef<number | null>(null);
  const [costMs, setCostMs] = useState<number | undefined>(undefined);

  // Mark start during render phase of a change
  startRef.current = typeof performance !== 'undefined' ? performance.now() : null;

  useEffect(() => {
    let mounted = true;
    const start = startRef.current ?? performance.now();
    // Double rAF: next frame, then measure on following frame to approximate paint
    const rid1 = requestAnimationFrame(() => {
      const rid2 = requestAnimationFrame(() => {
        if (!mounted) return;
        const end = performance.now();
        setCostMs(Math.max(0, end - start));
      });
      // Store second id on first for cleanup
      (window as any).__rcp_rid2 = rid2;
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(rid1);
      if ((window as any).__rcp_rid2) cancelAnimationFrame((window as any).__rcp_rid2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  return costMs;
}

