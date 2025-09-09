'use client';

import React, { useState, useEffect } from 'react';
import { useMemoryLeakDetection, formatMemorySize } from '@/lib/hooks/useMemoryLeakDetection';

interface MemoryLeakDashboardProps {
  className?: string;
}

export default function MemoryLeakDashboard({ className = '' }: MemoryLeakDashboardProps) {
  const [connectionPoolMetrics, setConnectionPoolMetrics] = useState<any>(null);
  const [connectionPoolAlerts, setConnectionPoolAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    leakInfo,
    isSupported,
    forceCleanup,
    getLeakReport,
    clearHistory,
  } = useMemoryLeakDetection({
    checkIntervalMs: 10000, // Check every 10 seconds
    growthThresholdMB: 3, // Alert if growing by 3MB per minute
    criticalThresholdMB: 15, // Critical if growing by 15MB per minute
    onLeakDetected: (info) => {
      console.warn('Memory leak detected:', info);
    },
    onCriticalLeak: (info) => {
      console.error('Critical memory leak detected:', info);
    },
  });

  const fetchConnectionPoolMetrics = async () => {
    try {
      const response = await fetch('/api/admin/connection-pool/metrics?hours=1');
      if (response.ok) {
        const data = await response.json();
        setConnectionPoolMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch connection pool metrics:', err);
    }
  };

  const fetchConnectionPoolAlerts = async () => {
    try {
      const response = await fetch('/api/admin/connection-pool/alerts');
      if (response.ok) {
        const data = await response.json();
        setConnectionPoolAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to fetch connection pool alerts:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchConnectionPoolMetrics(),
          fetchConnectionPoolAlerts(),
        ]);
      } catch (err) {
        setError('Failed to load memory leak data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 text-xl mr-2">⚠️</div>
            <div className="text-red-800">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Memory Leak Detection</h2>
        <p className="text-gray-600">Monitor memory usage and connection pools for potential leaks</p>
      </div>

      {/* Frontend Memory Monitoring */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Frontend Memory Status</h3>
        
        {!isSupported ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-yellow-600 text-xl mr-2">⚠️</div>
              <div className="text-yellow-800">
                Memory monitoring not supported in this browser
              </div>
            </div>
          </div>
        ) : leakInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Current Memory</div>
              <div className="text-2xl font-bold text-gray-900">
                {leakInfo.currentMemory.toFixed(1)} MB
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Peak Memory</div>
              <div className="text-2xl font-bold text-gray-900">
                {leakInfo.peakMemory.toFixed(1)} MB
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Growth Rate</div>
              <div className="text-2xl font-bold text-gray-900">
                {getTrendIcon(leakInfo.memoryTrend)} {leakInfo.growthRate.toFixed(2)} MB/min
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Leak Status</div>
              <div className={`text-2xl font-bold ${
                leakInfo.isLeaking ? 'text-red-600' : 'text-green-600'
              }`}>
                {leakInfo.isLeaking ? '🚨 LEAK' : '✅ OK'}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-gray-600">Collecting memory data...</div>
          </div>
        )}

        {leakInfo && leakInfo.isLeaking && (
          <div className={`border rounded-lg p-4 mb-4 ${getSeverityColor(leakInfo.leakSeverity)}`}>
            <div className="flex items-start">
              <div className="text-xl mr-3">
                {leakInfo.leakSeverity === 'critical' ? '🚨' : '⚠️'}
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-2">
                  Memory Leak Detected ({leakInfo.leakSeverity.toUpperCase()})
                </div>
                <div className="text-sm mb-3">
                  Growth rate: {leakInfo.growthRate.toFixed(2)} MB/min
                </div>
                <div className="text-sm">
                  <div className="font-medium mb-1">Recommendations:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {leakInfo.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={forceCleanup}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🧹 Force Cleanup
          </button>
          <button
            onClick={clearHistory}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            📊 Clear History
          </button>
        </div>
      </div>

      {/* Connection Pool Monitoring */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Pool Status</h3>
        
        {connectionPoolMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(connectionPoolMetrics.pools || {}).map(([poolName, poolData]: [string, any]) => (
              <div key={poolName} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 capitalize">{poolName} Pool</h4>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    poolData.usage_percentage > 80 ? 'bg-red-100 text-red-800' :
                    poolData.usage_percentage > 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {poolData.usage_percentage.toFixed(1)}% used
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active:</span>
                    <span className="font-medium">{poolData.current_active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pool Size:</span>
                    <span className="font-medium">{poolData.pool_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Active:</span>
                    <span className="font-medium">{poolData.max_active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Memory:</span>
                    <span className="font-medium">{poolData.avg_memory_mb.toFixed(1)} MB</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-gray-600">No connection pool data available</div>
          </div>
        )}
      </div>

      {/* Connection Pool Alerts */}
      {connectionPoolAlerts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Pool Alerts</h3>
          <div className="space-y-3">
            {connectionPoolAlerts.map((alert, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start">
                  <div className="text-xl mr-3">
                    {alert.severity === 'critical' ? '🚨' : '⚠️'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{alert.message}</div>
                    <div className="text-sm mb-2">
                      {alert.pool_name} • {new Date(alert.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium mb-1">Recommendations:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {alert.recommendations.map((rec: string, recIndex: number) => (
                          <li key={recIndex}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Memory API Support:</div>
            <div className="font-medium">{isSupported ? '✅ Supported' : '❌ Not Supported'}</div>
          </div>
          <div>
            <div className="text-gray-600">Last Updated:</div>
            <div className="font-medium">{new Date().toLocaleString()}</div>
          </div>
          {connectionPoolMetrics && (
            <>
              <div>
                <div className="text-gray-600">Total Alerts:</div>
                <div className="font-medium">{connectionPoolMetrics.alerts || 0}</div>
              </div>
              <div>
                <div className="text-gray-600">Monitoring Period:</div>
                <div className="font-medium">{connectionPoolMetrics.period_hours}h</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}