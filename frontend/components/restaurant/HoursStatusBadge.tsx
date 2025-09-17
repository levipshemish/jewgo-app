'use client';

import { Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface HoursStatusBadgeProps {
  restaurantId: number;
  className?: string;
  showIcon?: boolean;
}

interface HoursStatus {
  status: 'open' | 'closed' | 'unknown' | 'error';
  message: string;
  is_open: boolean;
}

export default function HoursStatusBadge({ 
  restaurantId, className = "", showIcon = true 
}: HoursStatusBadgeProps) {
  const [hoursStatus, setHoursStatus] = useState<HoursStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHoursStatus = async () => {
      if (!restaurantId) {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/restaurants/${restaurantId}/hours`, { 
          cache: 'no-store' 
        });
        
        if (response.ok) {
          const data = await response.json();
          // If the API returns closed but no actual hours data, treat as unknown
          let status = data.status || 'unknown';
          if (status === 'closed' && (!data.message || data.message === 'Closed')) {
            // Check if this is actually "no hours available" vs "closed with hours"
            if (!data.today_hours && !data.formatted_hours && !data.next_open_time) {
              status = 'unknown';
            }
          }
          
          setHoursStatus({
            status: status,
            message: status === 'unknown' ? 'Hours not available' : (data.message || 'Hours not available'),
            is_open: data.is_open || false
          });
        } else {
          setError('Failed to load hours');
        }
      } catch (_err) {
        setError('Error loading hours');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHoursStatus();
  }, [restaurantId]);

  if (isLoading) {
    return (
      <div className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}>
        {showIcon && <Clock className="w-3 h-3" />}
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !hoursStatus) {
    return (
      <div className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}>
        {showIcon && <Clock className="w-3 h-3" />}
        <span>Hours not available</span>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (hoursStatus.status) {
      case 'open':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'closed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'unknown':
      case 'error':
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (hoursStatus.status) {
      case 'open':
        return '🟢';
      case 'closed':
        return '🔴';
      case 'unknown':
      case 'error':
      default:
        return '⏰';
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${getStatusColor()} ${className}`}>
      {showIcon && <span>{getStatusIcon()}</span>}
      <span className="font-medium">
        {hoursStatus.status === 'open' ? 'Open' : 
         hoursStatus.status === 'closed' ? 'Closed' : 
         'Hours not available'}
      </span>
    </div>
  );
}
