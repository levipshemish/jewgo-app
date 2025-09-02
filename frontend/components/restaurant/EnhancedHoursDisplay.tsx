'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

interface HoursData {
  hours: {
    [key: string]: {
      open: string;
      close: string;
      is_open: boolean;
    };
  };
  open_now: boolean;
  timezone: string;
  last_updated: string;
}

interface HoursStatus {
  status: 'open' | 'closed' | 'closed_today' | 'unknown' | 'error';
  message: string;
  is_open: boolean;
  today_hours: {
    open?: string;
    close?: string;
    is_open?: boolean;
  };
  formatted_hours: Array<{
    day: string;
    hours: string;
    is_open: boolean;
  }>;
  timezone: string;
  last_updated: string;
}

interface EnhancedHoursDisplayProps {
  restaurantId: number;
  initialHoursData?: HoursData;
  className?: string;
  showTimezone?: boolean;
  showLastUpdated?: boolean;
}

export default function EnhancedHoursDisplay({
  restaurantId, initialHoursData: _initialHoursData, className = "", showTimezone = true, showLastUpdated = true
}: EnhancedHoursDisplayProps) {
  const [hoursStatus, setHoursStatus] = useState<HoursStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHoursStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use Next.js API proxy to avoid CORS and control caching
      const response = await fetch(`/api/restaurants/${restaurantId}/hours`, { 
        cache: 'no-store',
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        const normalized = {
          ...data,
          formatted_hours: Array.isArray(data?.formatted_hours) ? data.formatted_hours : [],
        } as HoursStatus;
        setHoursStatus(normalized);
      } else {
        // Set a fallback status instead of error for better UX
        setHoursStatus({
          status: 'unknown',
          message: 'Hours information unavailable',
          is_open: false,
          today_hours: {},
          formatted_hours: [],
          timezone: 'America/New_York',
          last_updated: new Date().toISOString()
        });
      }
    } catch (_err) {
      // Set a fallback status instead of error for better UX
      setHoursStatus({
        status: 'unknown',
        message: 'Hours information unavailable',
        is_open: false,
        today_hours: {},
        formatted_hours: [],
        timezone: 'America/New_York',
        last_updated: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, setHoursStatus, setIsLoading, setError]);

  useEffect(() => {
    if (restaurantId) {
      fetchHoursStatus();
    }
  }, [restaurantId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="w-3 h-3 sm:w-5 sm:h-5 text-green-500" />;
      case 'closed':
      case 'closed_today':
        return <XCircle className="w-3 h-3 sm:w-5 sm:h-5 text-red-500" />;
      case 'unknown':
      case 'error':
        return <AlertCircle className="w-3 h-3 sm:w-5 sm:h-5 text-gray-500" />;
      default:
        return <Clock className="w-3 h-3 sm:w-5 sm:h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'closed':
      case 'closed_today':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'unknown':
      case 'error':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimezone = (timezone: string) => {
    if (!timezone) {return '';}
    
    // Extract timezone abbreviation
    const match = timezone.match(/\/\w+\/(\w+)$/);
    if (match) {
      return match[1];
    }
    
    return timezone.split('/').pop() || timezone;
  };

  const formatLastUpdated = (lastUpdated: string) => {
    if (!lastUpdated) {return '';}
    
    try {
      const date = new Date(lastUpdated);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return 'Updated just now';
      } else if (diffInHours < 24) {
        return `Updated ${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `Updated ${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      }
    } catch {
      return 'Updated recently';
    }
  };

  // Build centered summary line text per spec
  const summaryText = (() => {
    const open = hoursStatus?.today_hours?.open;
    const close = hoursStatus?.today_hours?.close;
    switch (hoursStatus?.status) {
      case 'open':
        return close ? `Open now - closes ${close}` : 'Open now';
      case 'closed':
      case 'closed_today':
        return open ? `Closed - opens ${open}` : 'Closed';
      case 'unknown':
      case 'error':
      default:
        return (hoursStatus?.message?.trim() || 'Hours unavailable');
    }
  })();

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error || !hoursStatus) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error || 'Hours not available'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Main Hours Status */}
      <div className={`relative flex items-center justify-center text-center h-6 sm:h-auto px-1 pr-6 sm:pr-10 py-0 sm:px-3 sm:py-1 md:px-4 md:py-1.5 rounded-full border-0 sm:border flex-nowrap whitespace-nowrap overflow-hidden ${getStatusColor(hoursStatus.status)}`}>
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <span className="hidden sm:inline-flex">{getStatusIcon(hoursStatus.status)}</span>
          <p className="text-[11px] sm:text-xs md:text-sm font-medium leading-none truncate tracking-tight max-w-[75vw] sm:max-w-none">{summaryText}</p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Hide hours' : 'View hours'}
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-xs sm:text-sm leading-none hover:opacity-75 transition-opacity shrink-0 whitespace-nowrap"
        >
          <span className="hidden sm:inline text-xs">{isExpanded ? 'Hide' : 'View'} hours</span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          ) : (
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          )}
        </button>
      </div>

      {/* Expanded Hours Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 sm:mt-3"
          >
            <div className="bg-white border border-gray-200 rounded-2xl p-2.5 sm:p-4">
              <h4 className="hidden sm:block text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">Weekly Hours</h4>
              
              <div className="space-y-0.5 sm:space-y-1.5">
                {(hoursStatus.formatted_hours || []).map((dayHours, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center py-0 px-1.5 sm:py-1 sm:px-3 rounded-full whitespace-nowrap text-[10px] sm:text-sm ${
                      dayHours.is_open ? 'bg-green-50' : 'bg-gray-50'
                    }`}
                  >
                    <span className="font-medium text-gray-700 pr-3">
                      {dayHours.day}
                    </span>
                    <span className={`${
                      dayHours.is_open ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {dayHours.hours}
                    </span>
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div className="mt-1 pt-1 sm:mt-4 sm:pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-[11px] sm:text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    {showTimezone && hoursStatus.timezone && (
                      <span>Timezone: {formatTimezone(hoursStatus.timezone)}</span>
                    )}
                    {hoursStatus.is_open && (
                      <span className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Currently open</span>
                      </span>
                    )}
                  </div>
                  
                  {showLastUpdated && hoursStatus.last_updated && (
                    <span>{formatLastUpdated(hoursStatus.last_updated)}</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 