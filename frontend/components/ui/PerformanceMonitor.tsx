import React, { useState, useCallback } from 'react';

import { usePerformanceOptimization } from '@/lib/hooks/usePerformanceOptimization';

interface PerformanceMonitorProps {
  filterPerformance?: {
    lastFilterTime: number;
    averageFilterTime: number;
    filterCount: number;
  };
  isFiltering?: boolean;
  totalItems?: number;
  filteredItems?: number;
  className?: string;
  showDetails?: boolean;
}

export function PerformanceMonitor({
  filterPerformance, isFiltering = false, totalItems = 0, filteredItems = 0, className = '', showDetails = false
}: PerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { performanceMetrics } = usePerformanceOptimization({
    enablePerformanceMonitoring: true
  });

  const formatTime = useCallback((time: number) => {
    if (time < 1) {
      return `${(time * 1000).toFixed(0)}ms`;
    }
    return `${time.toFixed(2)}s`;
  }, []);

  const getPerformanceColor = useCallback((time: number) => {
    if (time < 0.1) {
      return 'text-green-600';
    }
    if (time < 0.5) {
      return 'text-yellow-600';
    }
    return 'text-red-600';
  }, []);

  const getPerformanceStatus = useCallback((time: number) => {
    if (time < 0.1) {
      return 'Excellent';
    }
    if (time < 0.5) {
      return 'Good';
    }
    if (time < 1) {
      return 'Fair';
    }
    return 'Poor';
  }, []);

  if (!showDetails && !isFiltering && (!filterPerformance || filterPerformance.filterCount === 0)) {
    return null;
  }

  return (
    <div className={`performance-monitor bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Performance Monitor
        </h3>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-jewgo-primary hover:text-jewgo-primary-dark transition-colors"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Filter Performance */}
      {filterPerformance && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Filter Performance:</span>
            {isFiltering && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-jewgo-primary mr-2"></div>
                <span className="text-xs text-gray-500">Filtering...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Last Filter Time</div>
              <div className={`text-lg font-semibold ${getPerformanceColor(filterPerformance.lastFilterTime)}`}>
                {formatTime(filterPerformance.lastFilterTime)}
              </div>
              <div className="text-xs text-gray-400">
                {getPerformanceStatus(filterPerformance.lastFilterTime)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Average Time</div>
              <div className={`text-lg font-semibold ${getPerformanceColor(filterPerformance.averageFilterTime)}`}>
                {formatTime(filterPerformance.averageFilterTime)}
              </div>
              <div className="text-xs text-gray-400">
                {filterPerformance.filterCount} filters
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 mb-1">Results</div>
            <div className="text-sm font-medium text-blue-900">
              {filteredItems} of {totalItems} restaurants
            </div>
            <div className="text-xs text-blue-600">
              {totalItems > 0 ? `${((filteredItems / totalItems) * 100).toFixed(1)}% match` : 'No results'}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Core Web Vitals</h4>
          
          <div className="grid grid-cols-2 gap-4">
            {performanceMetrics.fcp !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">First Contentful Paint</div>
                <div className={`text-lg font-semibold ${getPerformanceColor(performanceMetrics.fcp / 1000)}`}>
                  {formatTime(performanceMetrics.fcp / 1000)}
                </div>
              </div>
            )}

            {performanceMetrics.lcp !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Largest Contentful Paint</div>
                <div className={`text-lg font-semibold ${getPerformanceColor(performanceMetrics.lcp / 1000)}`}>
                  {formatTime(performanceMetrics.lcp / 1000)}
                </div>
              </div>
            )}

            {performanceMetrics.cls !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Cumulative Layout Shift</div>
                <div className={`text-lg font-semibold ${performanceMetrics.cls < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                  {performanceMetrics.cls.toFixed(3)}
                </div>
              </div>
            )}

            {performanceMetrics.ttfb !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Time to First Byte</div>
                <div className={`text-lg font-semibold ${getPerformanceColor(performanceMetrics.ttfb / 1000)}`}>
                  {formatTime(performanceMetrics.ttfb / 1000)}
                </div>
              </div>
            )}
          </div>

          {/* Performance Tips */}
          <div className="mt-4 bg-yellow-50 rounded-lg p-3">
            <h5 className="text-sm font-medium text-yellow-800 mb-2">Performance Tips</h5>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Use server-side filtering for large datasets</li>
              <li>• Enable virtual scrolling for long lists</li>
              <li>• Optimize images with WebP format</li>
              <li>• Use debounced search to reduce API calls</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for tracking filter performance
export function useFilterPerformance() {
  const [performanceData, setPerformanceData] = useState({
    lastFilterTime: 0,
    averageFilterTime: 0,
    filterCount: 0,
    totalItems: 0,
    filteredItems: 0
  });

  const trackFilterPerformance = useCallback((filterTime: number, totalItems: number, filteredItems: number) => {
    setPerformanceData(prev => {
      const newFilterCount = prev.filterCount + 1;
      const newAverageTime = (prev.averageFilterTime * prev.filterCount + filterTime) / newFilterCount;
      
      return {
        lastFilterTime: filterTime,
        averageFilterTime: newAverageTime,
        filterCount: newFilterCount,
        totalItems,
        filteredItems
      };
    });
  }, []);

  const resetPerformance = useCallback(() => {
    setPerformanceData({
      lastFilterTime: 0,
      averageFilterTime: 0,
      filterCount: 0,
      totalItems: 0,
      filteredItems: 0
    });
  }, []);

  return {
    performanceData,
    trackFilterPerformance,
    resetPerformance
  };
}
