'use client';

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  markerCreationTime: number;
  renderFrequency: number;
  memoryUsage: number;
  infoWindowLoadTime: number;
  lastUpdate: number;
}

export function MapPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    markerCreationTime: 0,
    renderFrequency: 0,
    memoryUsage: 0,
    infoWindowLoadTime: 0,
    lastUpdate: Date.now()
  });
  
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Calculate render frequency
      const now = performance.now();
      const timeDiff = now - lastRenderTime.current;
      const frequency = renderCount.current / (timeDiff / 1000);
      
      // Get memory usage (if available)
      const memory = (performance as any).memory?.usedJSHeapSize || 0;
      
      setMetrics(prev => ({
        ...prev,
        renderFrequency: frequency,
        memoryUsage: memory,
        lastUpdate: Date.now()
      }));
      
      renderCount.current = 0;
      lastRenderTime.current = now;
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded z-50">
      <h4 className="font-bold mb-2">Map Performance</h4>
      <div className="space-y-1">
        <div>Render Freq: {metrics.renderFrequency.toFixed(1)}/s</div>
        <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
        <div>Marker Time: {metrics.markerCreationTime.toFixed(0)}ms</div>
        <div>Info Window: {metrics.infoWindowLoadTime.toFixed(0)}ms</div>
      </div>
    </div>
  );
}
