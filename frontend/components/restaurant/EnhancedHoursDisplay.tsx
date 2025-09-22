'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getHoursStatus, formatWeeklyHoursArray, HoursStatus as CoreHoursStatus } from '@/lib/utils/hours';
import type { HoursData as HoursDataType } from '@/lib/types/restaurant';

interface EnhancedHoursDisplayProps {
  hoursData?: HoursDataType | string | null;
  timezone?: string;
  hoursLastUpdated?: string;
  className?: string;
  showTimezone?: boolean;
  showLastUpdated?: boolean;
}

export default function EnhancedHoursDisplay({
  hoursData, timezone, hoursLastUpdated, className = "", showTimezone = true, showLastUpdated = true
}: EnhancedHoursDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const computed = useMemo(() => {
    const status: CoreHoursStatus = getHoursStatus(hoursData as any);
    const weekly = formatWeeklyHoursArray(hoursData as any) || [];
    const noStructured = weekly.length === 0 && !status.nextOpenTime && !status.closingTime;
    const mapped = status.type === 'open'
      ? 'open'
      : status.type === 'closed'
        ? (noStructured ? 'unknown' : 'closed')
        : (status.type === 'opensToday' || status.type === 'opensTomorrow' || status.type === 'opensLater')
          ? 'closed_today'
          : 'unknown';
    return {
      status: mapped,
      message: noStructured ? 'Hours not available' : status.label,
      is_open: status.isOpenNow,
      formatted_hours: weekly.map(d => ({ day: d.day, hours: d.hours, is_open: status.isOpenNow })),
      timezone: timezone || 'America/New_York',
      last_updated: hoursLastUpdated || new Date().toISOString(),
      today_open: status.nextOpenTime || undefined,
      today_close: status.closingTime || undefined,
    } as const;
  }, [hoursData, timezone, hoursLastUpdated]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="w-3 h-3 sm:w-5 sm:h-5 text-green-500" />;
      case 'closed':
      case 'closed_today':
        return <XCircle className="w-3 h-3 sm:w-5 sm:h-5 text-red-500" />;
      case 'unknown':
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
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimezone = (tz: string) => {
    if (!tz) {return '';}
    
    // Extract timezone abbreviation
    const match = tz.match(/\/\w+\/(\w+)$/);
    if (match) {
      return match[1];
    }
    
    return tz.split('/').pop() || tz;
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
    const open = computed.today_open;
    const close = computed.today_close;
    switch (computed.status) {
      case 'open':
        return close ? `Open now - closes ${close}` : 'Open now';
      case 'closed':
      case 'closed_today':
        // Only show "Closed" if we have actual hours data, otherwise show "Hours not available"
        if (open || computed.formatted_hours?.length > 0) {
          return open ? `Closed - opens ${open}` : 'Closed';
        } else {
          return 'Hours not available';
        }
      case 'unknown':
      default:
        return (computed.message?.trim() || 'Hours not available');
    }
  })();

  return (
    <div className={`${className}`}>
      {/* Main Hours Status */}
      <div className={`relative flex items-center justify-center text-center h-6 sm:h-auto px-1 pr-6 sm:pr-10 py-0 sm:px-3 sm:py-1 md:px-4 md:py-1.5 rounded-full border-0 sm:border flex-nowrap whitespace-nowrap overflow-hidden ${getStatusColor(computed.status)}`}>
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <span className="hidden sm:inline-flex">{getStatusIcon(computed.status)}</span>
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
                {(computed.formatted_hours || []).map((dayHours) => (
                  <div
                    key={`day-${dayHours.day}`}
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
                    {showTimezone && computed.timezone && (
                      <span>Timezone: {formatTimezone(computed.timezone)}</span>
                    )}
                    {computed.is_open && (
                      <span className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Currently open</span>
                      </span>
                    )}
                  </div>
                  
                  {showLastUpdated && computed.last_updated && (
                    <span>{formatLastUpdated(computed.last_updated)}</span>
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
