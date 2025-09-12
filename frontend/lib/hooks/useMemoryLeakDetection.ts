'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface MemoryLeakInfo {
  isLeaking: boolean;
  leakSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  memoryTrend: 'stable' | 'increasing' | 'decreasing';
  growthRate: number; // MB per minute
  peakMemory: number;
  currentMemory: number;
  recommendations: string[];
  timestamp: number;
}

interface MemoryLeakDetectionOptions {
  checkIntervalMs?: number;
  trendWindowMs?: number;
  growthThresholdMB?: number;
  criticalThresholdMB?: number;
  onLeakDetected?: (info: MemoryLeakInfo) => void;
  onCriticalLeak?: (info: MemoryLeakInfo) => void;
  enabled?: boolean;
}

interface UseMemoryLeakDetectionReturn {
  leakInfo: MemoryLeakInfo | null;
  isSupported: boolean;
  forceCleanup: () => void;
  getLeakReport: () => MemoryLeakInfo | null;
  clearHistory: () => void;
}

const DEFAULT_OPTIONS: Required<MemoryLeakDetectionOptions> = {
  checkIntervalMs: 10000, // 10 seconds
  trendWindowMs: 300000, // 5 minutes
  growthThresholdMB: 5, // 5MB growth per minute
  criticalThresholdMB: 50, // 50MB growth per minute
  onLeakDetected: () => {},
  onCriticalLeak: () => {},
  enabled: true,
};

export function useMemoryLeakDetection(
  options: MemoryLeakDetectionOptions = {}
): UseMemoryLeakDetectionReturn {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  
  const [leakInfo, setLeakInfo] = useState<MemoryLeakInfo | null>(null);
  const memoryHistoryRef = useRef<Array<{ timestamp: number; memory: number }>>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLeakAlertRef = useRef<number>(0);

  // Check if memory API is supported
  const isSupported = typeof window !== 'undefined' && 
    'performance' in window && 
    'memory' in performance;

  const getMemorySnapshot = useCallback((): number | null => {
    if (!isSupported) return null;

    try {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    } catch (error) {
      console.warn('Failed to get memory snapshot:', error);
      return null;
    }
  }, [isSupported]);

  const calculateMemoryTrend = useCallback((): {
    trend: 'stable' | 'increasing' | 'decreasing';
    growthRate: number;
  } => {
    const history = memoryHistoryRef.current;
    if (history.length < 2) {
      return { trend: 'stable', growthRate: 0 };
    }

    const now = Date.now();
    const windowStart = now - opts.trendWindowMs;
    
    // Filter to trend window
    const windowHistory = history.filter(entry => entry.timestamp >= windowStart);
    
    if (windowHistory.length < 2) {
      return { trend: 'stable', growthRate: 0 };
    }

    // Calculate growth rate (MB per minute)
    const first = windowHistory[0];
    const last = windowHistory[windowHistory.length - 1];
    const timeDiffMinutes = (last.timestamp - first.timestamp) / (1000 * 60);
    const memoryDiffMB = (last.memory - first.memory) / (1024 * 1024);
    const growthRate = timeDiffMinutes > 0 ? memoryDiffMB / timeDiffMinutes : 0;

    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (growthRate > 0.5) {
      trend = 'increasing';
    } else if (growthRate < -0.5) {
      trend = 'decreasing';
    }

    return { trend, growthRate };
  }, [opts.trendWindowMs]);

  const detectMemoryLeak = useCallback((): MemoryLeakInfo | null => {
    const currentMemory = getMemorySnapshot();
    if (currentMemory === null) return null;

    const now = Date.now();
    
    // Add to history
    memoryHistoryRef.current.push({ timestamp: now, memory: currentMemory });
    
    // Keep only recent history
    const cutoff = now - opts.trendWindowMs;
    memoryHistoryRef.current = memoryHistoryRef.current.filter(entry => entry.timestamp >= cutoff);

    const { trend, growthRate } = calculateMemoryTrend();
    const peakMemory = Math.max(...memoryHistoryRef.current.map(entry => entry.memory));
    const currentMemoryMB = currentMemory / (1024 * 1024);
    const peakMemoryMB = peakMemory / (1024 * 1024);

    // Determine leak severity
    let leakSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    let isLeaking = false;
    let recommendations: string[] = [];

    if (trend === 'increasing' && growthRate > 0) {
      isLeaking = true;
      
      if (growthRate >= opts.criticalThresholdMB) {
        leakSeverity = 'critical';
        recommendations = [
          'Critical memory leak detected!',
          'Force garbage collection if available',
          'Check for unclosed event listeners',
          'Review component cleanup in useEffect',
          'Consider reducing data retention',
          'Restart the application if necessary'
        ];
      } else if (growthRate >= opts.growthThresholdMB * 2) {
        leakSeverity = 'high';
        recommendations = [
          'High memory growth detected',
          'Check for memory leaks in components',
          'Review timer and interval cleanup',
          'Check for unclosed WebSocket connections',
          'Monitor large data structures'
        ];
      } else if (growthRate >= opts.growthThresholdMB) {
        leakSeverity = 'medium';
        recommendations = [
          'Moderate memory growth detected',
          'Check for proper cleanup in useEffect',
          'Review event listener management',
          'Monitor component unmounting'
        ];
      } else {
        leakSeverity = 'low';
        recommendations = [
          'Slight memory growth detected',
          'Monitor for potential leaks',
          'Check component lifecycle'
        ];
      }
    }

    const leakInfoData: MemoryLeakInfo = {
      isLeaking,
      leakSeverity,
      memoryTrend: trend,
      growthRate,
      peakMemory: peakMemoryMB,
      currentMemory: currentMemoryMB,
      recommendations,
      timestamp: now,
    };

    return leakInfoData;
  }, [getMemorySnapshot, calculateMemoryTrend, opts.trendWindowMs, opts.growthThresholdMB, opts.criticalThresholdMB]);

  const checkForMemoryLeaks = useCallback(() => {
    const info = detectMemoryLeak();
    if (!info) return;

    setLeakInfo(info);

    const now = Date.now();
    const ALERT_COOLDOWN = 30000; // 30 seconds between alerts

    // Trigger callbacks with cooldown
    if (info.isLeaking && now - lastLeakAlertRef.current > ALERT_COOLDOWN) {
      lastLeakAlertRef.current = now;
      
      if (info.leakSeverity === 'critical') {
        opts.onCriticalLeak(info);
        console.error('🚨 CRITICAL MEMORY LEAK DETECTED:', {
          growthRate: `${info.growthRate.toFixed(2)}MB/min`,
          currentMemory: `${info.currentMemory.toFixed(1)}MB`,
          peakMemory: `${info.peakMemory.toFixed(1)}MB`,
          recommendations: info.recommendations
        });
      } else {
        opts.onLeakDetected(info);
        console.warn('⚠️ Memory leak detected:', {
          severity: info.leakSeverity,
          growthRate: `${info.growthRate.toFixed(2)}MB/min`,
          currentMemory: `${info.currentMemory.toFixed(1)}MB`,
          recommendations: info.recommendations
        });
      }
    }
  }, [detectMemoryLeak, opts]);

  const forceCleanup = useCallback(() => {
    // Force garbage collection if available
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
        console.log('🧹 Forced garbage collection');
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
    }

    // Clear memory history
    memoryHistoryRef.current = [];
    
    // Re-check memory after cleanup
    setTimeout(() => {
      checkForMemoryLeaks();
    }, 1000);
  }, [checkForMemoryLeaks]);

  const getLeakReport = useCallback((): MemoryLeakInfo | null => {
    return leakInfo;
  }, [leakInfo]);

  const clearHistory = useCallback(() => {
    memoryHistoryRef.current = [];
    setLeakInfo(null);
  }, []);

  // Set up monitoring interval
  useEffect(() => {
    if (!isSupported || !opts.enabled) {
      return;
    }

    // Initial check
    checkForMemoryLeaks();

    // Set up interval
    intervalRef.current = setInterval(checkForMemoryLeaks, opts.checkIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSupported, opts.enabled, opts.checkIntervalMs, checkForMemoryLeaks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    leakInfo,
    isSupported,
    forceCleanup,
    getLeakReport,
    clearHistory,
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

// Global memory leak detection for development
export function enableGlobalMemoryLeakDetection(options: MemoryLeakDetectionOptions = {}) {
  if (typeof window === 'undefined') return;

  const defaultOptions: MemoryLeakDetectionOptions = {
    checkIntervalMs: 15000, // 15 seconds
    growthThresholdMB: 3, // 3MB growth per minute
    criticalThresholdMB: 20, // 20MB growth per minute
    onLeakDetected: (info) => {
      console.warn('🔍 Global Memory Leak Detection:', info);
    },
    onCriticalLeak: (info) => {
      console.error('🚨 CRITICAL Global Memory Leak:', info);
      // Could send to monitoring service here
    },
    ...options,
  };

  // This would be used in a global context
  return defaultOptions;
}

// Add global type for manual GC
declare global {
  interface Window {
    gc?: () => void;
  }
}