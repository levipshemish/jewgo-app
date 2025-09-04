"use client";

import React, { useEffect, useRef, useState } from 'react';
import { IS_VIRTUAL_OVERSCAN } from '@/lib/config/infiniteScroll.constants';

type Key = string | number;

export type VirtualizedRestaurantListProps<T> = {
  items: T[];
  itemKey: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
  onMetrics?: (m: { type: 'init' | 'measure'; estimate: number; overscan: number; measureErrorPx?: number }) => void;
};

// Simple LRU cache for item heights
class HeightLRU {
  private cap: number;
  private map: Map<string, { h: number; t: number }>;
  constructor(cap = 300) {
    this.cap = cap;
    this.map = new Map();
  }
  get(key: string) {
    const v = this.map.get(key);
    if (!v) return undefined;
    v.t = performance.now();
    this.map.set(key, v);
    return v.h;
  }
  set(key: string, h: number) {
    const now = performance.now();
    this.map.set(key, { h, t: now });
    if (this.map.size > this.cap) {
      // evict oldest
      let oldestKey: string | null = null;
      let oldestT = Infinity;
      this.map.forEach((v, k) => {
        if (v.t < oldestT) {
          oldestT = v.t;
          oldestKey = k;
        }
      });
      if (oldestKey) this.map.delete(oldestKey);
    }
  }
  medianOf(n = 20) {
    const arr = Array.from(this.map.values())
      .sort((a, b) => b.t - a.t)
      .slice(0, n)
      .map(v => v.h)
      .sort((a, b) => a - b);
    if (arr.length === 0) return 280; // reasonable card estimate
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }
}

export default function VirtualizedRestaurantList<T>(props: VirtualizedRestaurantListProps<T>) {
  const { items, itemKey, renderItem, className, role = 'grid', ariaLabel = 'Restaurant listings', onMetrics } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [virtualizerFactory, setVirtualizerFactory] = useState<any | null>(null);
  const heightCacheRef = useRef(new HeightLRU(300));
  const [bp, setBp] = useState<'sm' | 'md' | 'lg'>(() => (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'sm' : typeof window !== 'undefined' && window.innerWidth <= 1024 ? 'md' : 'lg'));

  useEffect(() => {
    let mounted = true;
    const onResize = () => {
      const w = window.innerWidth;
      const next: 'sm' | 'md' | 'lg' = w <= 768 ? 'sm' : w <= 1024 ? 'md' : 'lg';
      setBp(next);
    };
    window.addEventListener('resize', onResize);
    (async () => {
      try {
        // Dynamic import so runtime works even if package is missing; fallback below
        const mod: any = await import('@tanstack/react-virtual');
        if (mounted) setVirtualizerFactory(() => mod.useVirtualizer);
      } catch {
        // keep fallback
      }
    })();
    return () => {
      mounted = false;
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const hasVirtual = !!virtualizerFactory;
  const estimate = heightCacheRef.current.medianOf();
  useEffect(() => {
    onMetrics?.({ type: 'init', estimate, overscan: IS_VIRTUAL_OVERSCAN });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate]);

  let virtualizer: any = null;
  let virtualItems: any[] = [];
  let totalSize = 0;
  if (hasVirtual) {
    virtualizer = virtualizerFactory({
      count: items.length,
      getScrollElement: () => containerRef.current,
      estimateSize: () => estimate,
      overscan: IS_VIRTUAL_OVERSCAN,
      // Breakpoint key to invalidate internal measurements on layout change
      measureElement: (el: Element) => (el as HTMLElement).offsetHeight,
    });
    virtualItems = virtualizer.getVirtualItems();
    totalSize = virtualizer.getTotalSize();
  }

  // Observe row resize to feed cache and remeasure
  const setRowRef = (key: string) => (el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = Math.ceil(entry.contentRect.height);
        if (h > 0) heightCacheRef.current.set(key, h);
        const err = Math.abs(h - estimate);
        onMetrics?.({ type: 'measure', estimate, overscan: IS_VIRTUAL_OVERSCAN, measureErrorPx: err });
      }
      virtualizer.measureElement?.(el);
    });
    ro.observe(el);
  };

  return (
    hasVirtual ? (
      <div ref={containerRef} className={className} role={role} aria-label={ariaLabel} style={{ overflowY: 'auto' }}>
        <div ref={innerRef} style={{ height: totalSize, position: 'relative' }}>
          {virtualItems.map((vi: any) => {
            const item = items[vi.index];
            const keyStr = String(itemKey(item, vi.index));
            return (
              <div
                key={keyStr}
                ref={setRowRef(`${bp}:${keyStr}`)}
                role="gridcell"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vi.start}px)`,
                  contain: 'layout style paint',
                  willChange: 'transform',
                }}
              >
                {renderItem(item, vi.index)}
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      <div
        ref={containerRef}
        className={className}
        role={role}
        aria-label={ariaLabel}
        style={{ contain: 'layout style paint', willChange: 'auto', transform: 'translateZ(0)', backfaceVisibility: 'hidden', perspective: '1000px' }}
      >
        {items.map((item, index) => (
          <div
            key={itemKey(item, index)}
            className="w-full"
            role="gridcell"
            style={{ contain: 'layout style paint', willChange: 'auto', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    )
  );
}
