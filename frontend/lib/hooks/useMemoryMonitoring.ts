'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  isHighUsage: boolean;
  isCriticalUsage: boolean;
}

interface MemoryMonitoringOptions {
  checkIntervalMs?: number;
  highUsageThreshold?: number; // Percentage (0-100)
  criticalUsageThreshold?: number; // Percentage (0-100)
  onHighUsage?: (memoryInfo: MemoryInfo) => void;
  onCriticalUsage?: (memoryInfo: MemoryInfo) => void;
  onMemoryPressure?: (memoryInfo: MemoryInfo) => void;
  enabled?: boolean;
}

interface UseMemoryMonitoringReturn {
  memoryInfo: MemoryInfo | null;
  isSupported: boolean;
  forceCleanup: () => void;
  getMemorySnapshot: () => MemoryInfo | null;
  memoryHistory: MemoryInfo[];
  averageUsage: number;
}

const DEFAULT_OPTIONS: Required<MemoryMonitoringOptions> = {
  checkIntervalMs: 30000, // 30 seconds
  highUsageThreshold: 70, // 70%
  criticalUsageThreshold: 85, // 85%
  onHighUsage: () => {},
  onCriticalUsage: () => {},
  onMemoryPressure: () => {},
  enabled: true,
};

export function useMemoryMonitoring(
  options: MemoryMonitoringOptions = {}
): UseMemoryMonitoringReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [memoryHistory, setMemoryHistory] = useState<MemoryInfo[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastHighUsageAlertRef = useRef<number>(0);
  const lastCriticalUsageAlertRef = useRef<number>(0);

  // Check if memory API is supported
  const isSupported = typeof window !== 'undefined' && 
    'performance' in window && 
    'memory' in performance;

  const getMemorySnapshot = useCallback((): MemoryInfo | null => {
    if (!isSupported) return null;

    try {
      const memory = (performance as any).memory;
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      const memorySnapshot: MemoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage,
        isHighUsage: usagePercentage >= opts.highUsageThreshold,
        isCriticalUsage: usagePercentage >= opts.criticalUsageThreshold,
      };

      return memorySnapshot;
    } catch (error) {
      console.warn('Failed to get memory snapshot:', error);
      return null;
    }
  }, [isSupported, opts.highUsageThreshold, opts.criticalUsageThreshold]);

  const checkMemoryUsage = useCallback(() => {
    const snapshot = getMemorySnapshot();
    if (!snapshot) return;

    setMemoryInfo(snapshot);
    
    // Update memory history (keep last 20 snapshots)
    setMemoryHistory(prev => {
      const updated = [...prev, snapshot].slice(-20);
      return updated;
    });

    const now = Date.now();
    const ALERT_COOLDOWN = 60000; // 1 minute cooldown between alerts

    // Trigger callbacks with cooldown to prevent spam
    if (snapshot.isCriticalUsage && now - lastCriticalUsageAlertRef.current > ALERT_COOLDOWN) {
      lastCriticalUsageAlertRef.current = now;
      opts.onCriticalUsage(snapshot);
      opts.onMemoryPressure(snapshot);
      
      console.warn('🚨 Critical memory usage detected:', {
        usagePercentage: `${snapshot.usagePercentage.toFixed(1)}%`,
        usedMB: `${(snapshot.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
        limitMB: `${(snapshot.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`,
      });
    } else if (snapshot.isHighUsage && now - lastHighUsageAlertRef.current > ALERT_COOLDOWN) {
      lastHighUsageAlertRef.current = now;
      opts.onHighUsage(snapshot);
      
      console.warn('⚠️ High memory usage detected:', {
        usagePercentage: `${snapshot.usagePercentage.toFixed(1)}%`,
        usedMB: `${(snapshot.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
        limitMB: `${(snapshot.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`,
      });
    }
  }, [getMemorySnapshot, opts]);

  const forceCleanup = useCallback(() => {
    // Trigger garbage collection if possible (only works in Chrome with --enable-precise-memory-info)
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
        console.log('🧹 Forced garbage collection');
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
    }

    // Clear memory history to free up some space
    setMemoryHistory([]);

    // Re-check memory after cleanup
    setTimeout(() => {
      checkMemoryUsage();
    }, 1000);
  }, [checkMemoryUsage]);

  // Calculate average usage from history
  const averageUsage = memoryHistory.length > 0
    ? memoryHistory.reduce((sum, info) => sum + info.usagePercentage, 0) / memoryHistory.length
    : 0;

  // Set up monitoring interval
  useEffect(() => {
    if (!isSupported || !opts.enabled) {
      return;
    }

    // Initial check
    checkMemoryUsage();

    // Set up interval
    intervalRef.current = setInterval(checkMemoryUsage, opts.checkIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSupported, opts.enabled, opts.checkIntervalMs, checkMemoryUsage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    memoryInfo,
    isSupported,
    forceCleanup,
    getMemorySnapshot,
    memoryHistory,
    averageUsage,
  };
}

// Utility function to format memory size
export function formatMemorySize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  if (mb < 1024) {
    return `${mb.toFixed(1)}MB`;
  }
  return `${(mb / 1024).toFixed(1)}GB`;
}

// Global memory monitoring for development
export function logMemoryStats(): void {
  if (typeof window === 'undefined' || !('performance' in window) || !('memory' in performance)) {
    console.log('Memory API not supported');
    return;
  }

  const memory = (performance as any).memory;
  console.group('🧠 Memory Statistics');
  console.log('Used JS Heap:', formatMemorySize(memory.usedJSHeapSize));
  console.log('Total JS Heap:', formatMemorySize(memory.totalJSHeapSize));
  console.log('JS Heap Limit:', formatMemorySize(memory.jsHeapSizeLimit));
  console.log('Usage:', `${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%`);
  console.groupEnd();
}

// Add global type for manual GC
declare global {
  interface Window {
    gc?: () => void;
  }
}