import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import relativeTime from 'dayjs/plugin/relativeTime';

import { HoursData } from '@/lib/types/restaurant';

dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(relativeTime);

export interface HoursStatus {
  badge: string;
  label: string;
  type: 'open' | 'opensToday' | 'opensTomorrow' | 'opensLater' | 'closed' | 'unknown';
  tooltip: string;
  icon: string;
  isOpenNow: boolean;
  isClosedForToday: boolean;
  nextOpenTime?: string;
  closingTime?: string;
  subtext?: string;
}

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
}

// Helper to convert time string to minutes
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') {return 0;}
  
  try {
    // Handle various time formats
    const patterns = [
      // Format: "11:00 AM" or "11:00AM"
      /(\d{1,2}):?(\d{2})?\s*(AM|PM)/i,
      // Format: "11am" or "11:30am"
      /(\d{1,2}):?(\d{2})?(am|pm)/i,
      // Format: "11 AM" or "11AM"
      /(\d{1,2})\s*(AM|PM)/i,
      // Format: "11am" (without colon)
      /(\d{1,2})(am|pm)/i
    ];
    
    for (const pattern of patterns) {
      const match = timeStr.trim().match(pattern);
      if (match && match[1]) {
        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const period = (match[3] ?? match[4] ?? match[2])?.toUpperCase() || 'AM';

        if (period === 'PM' && hours !== 12) {hours += 12;}
        if (period === 'AM' && hours === 12) {hours = 0;}

        return hours * 60 + minutes;
      }
    }
  } catch {
    }
  
  return 0;
};

// Helper to format time for display
const formatTimeDisplay = (timeStr: string): string => {
  if (!timeStr || typeof timeStr !== 'string') {return 'Unknown';}
  
  try {
    // Handle various time formats
    const patterns = [
      // Format: "11:00 AM" or "11:00AM"
      /(\d{1,2}):?(\d{2})?\s*(AM|PM)/i,
      // Format: "11am" or "11:30am"
      /(\d{1,2}):?(\d{2})?(am|pm)/i,
      // Format: "11 AM" or "11AM"
      /(\d{1,2})\s*(AM|PM)/i,
      // Format: "11am" (without colon)
      /(\d{1,2})(am|pm)/i
    ];
    
    for (const pattern of patterns) {
      const match = timeStr.trim().match(pattern);
      if (match && match[1]) {
        const hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const period = (match[3] ?? match[4] ?? match[2])?.toUpperCase() || 'AM';
        return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
    }
  } catch {
    }
  
  return timeStr;
};

// Parse hours from various formats
const parseHoursData = (hoursData: HoursData | string | null | undefined): OpeningHours[] | null => {
  if (!hoursData) {return null;}

  try {
    // Try to parse as JSON first
    const hours = typeof hoursData === 'string' ? JSON.parse(hoursData) : hoursData;
    
    if (typeof hours === 'object' && hours !== null) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const parsed: OpeningHours[] = [];
      
      days.forEach((day, _index) => {
        const dayHours = hours[day];
        if (dayHours?.open && dayHours.close) {
          parsed.push({
            day,
            open: dayHours.open,
            close: dayHours.close
          });
        }
      });
      
      return parsed.length > 0 ? parsed : null;
    }
  } catch {
    }
  
  return null;
};

export function getHoursStatus(hoursData: HoursData | string | null | undefined): HoursStatus {
  try {
    const now = dayjs();
    const currentTime = now.hour() * 60 + now.minute();
    const today = now.format('dddd').toLowerCase();
    const todayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(today);
    
    const parsedHours = parseHoursData(hoursData);
    
    if (!parsedHours || parsedHours.length === 0) {
      return {
        badge: 'text-gray-500',
        label: 'Hours not available',
        type: 'unknown',
        tooltip: 'Hours information not available',
        icon: '⏰',
        isOpenNow: false,
        isClosedForToday: true
      };
    }
    
    // Find today's hours
    const todayHours = parsedHours.find(h => h.day === today);
    
    if (todayHours) {
      const openMins = timeToMinutes(todayHours.open);
      const closeMins = timeToMinutes(todayHours.close);
      
      if (currentTime >= openMins && currentTime < closeMins) {
        return {
          badge: 'text-green-600',
          label: `Open now • Closes ${formatTimeDisplay(todayHours.close)}`,
          type: 'open',
          tooltip: `${todayHours.open} - ${todayHours.close}`,
          icon: '🟢',
          isOpenNow: true,
          isClosedForToday: false,
          closingTime: formatTimeDisplay(todayHours.close)
        };
      } else if (currentTime < openMins) {
        return {
          badge: 'text-red-600',
          label: `Opens ${formatTimeDisplay(todayHours.open)}`,
          type: 'opensToday',
          tooltip: `Opens ${todayHours.open}`,
          icon: '🔴',
          isOpenNow: false,
          isClosedForToday: false,
          nextOpenTime: formatTimeDisplay(todayHours.open)
        };
      }
    }
    
    // Closed for today, find next opening
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7;
      const nextDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][nextDayIndex];
      const nextDayHours = parsedHours.find(h => h.day === nextDay);
      
      if (nextDayHours) {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayName = dayNames[nextDayIndex];
        
        if (i === 1) {
          return {
            badge: 'text-red-600',
            label: `Opens ${formatTimeDisplay(nextDayHours.open)} tomorrow`,
            type: 'opensTomorrow',
            tooltip: `Opens ${nextDayHours.open} tomorrow`,
            icon: '🔴',
            isOpenNow: false,
            isClosedForToday: true,
            nextOpenTime: formatTimeDisplay(nextDayHours.open)
          };
        } else {
          return {
            badge: 'text-red-600',
            label: `Opens ${formatTimeDisplay(nextDayHours.open)} ${dayName}`,
            type: 'opensLater',
            tooltip: `Opens ${nextDayHours.open} ${dayName}`,
            icon: '🔴',
            isOpenNow: false,
            isClosedForToday: true,
            nextOpenTime: formatTimeDisplay(nextDayHours.open)
          };
        }
      }
    }
    
    // If no next opening found, show closed
    return {
      badge: 'text-red-600',
      label: 'Closed',
      type: 'closed',
      tooltip: 'Currently closed',
      icon: '🔴',
      isOpenNow: false,
      isClosedForToday: true
    };
  } catch {
    // Return a safe fallback
    return {
      badge: 'text-gray-500',
      label: 'Hours not available',
      type: 'unknown',
      tooltip: 'Hours information not available',
      icon: '⏰',
      isOpenNow: false,
      isClosedForToday: true
    };
  }
}

// Format full weekly hours for display (string format)
export function formatWeeklyHours(hoursData: HoursData | string | null | undefined): string {
  const parsedHours = parseHoursData(hoursData);
  
  if (!parsedHours) {
    return 'Hours not available';
  }
  
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  return days.map((day, index) => {
    const dayHours = parsedHours.find(h => h.day === day);
    if (dayHours) {
      return `${dayNames[index]} ${dayHours.open}–${dayHours.close}`;
    }
    return `${dayNames[index]} Closed`;
  }).join(', ');
}

// Format weekly hours as array of objects for card display
export function formatWeeklyHoursArray(hoursData: HoursData | string | null | undefined): Array<{day: string, hours: string}> | null {
  const parsedHours = parseHoursData(hoursData);
  
  if (!parsedHours) {
    return null;
  }
  
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  return days.map((day, index) => {
    const dayHours = parsedHours.find(h => h.day === day);
    const dayName = dayNames[index];
    if (!dayName) {
      return {
        day: 'Unknown',
        hours: 'Closed'
      };
    }
    if (dayHours) {
      return {
        day: dayName,
        hours: `${dayHours.open}–${dayHours.close}`
      };
    }
    return {
      day: dayName,
      hours: 'Closed'
    };
  });
}

// Check if restaurant is open during a specific time period
export function isRestaurantOpenDuringPeriod(
  hoursData: HoursData | string | null | undefined, 
  period: 'openNow' | 'morning' | 'afternoon' | 'evening' | 'lateNight'
): boolean {
  try {
    const now = dayjs();
    const currentTime = now.hour() * 60 + now.minute();
    const today = now.format('dddd').toLowerCase();
    
    const parsedHours = parseHoursData(hoursData);
    if (!parsedHours || parsedHours.length === 0) {
      return false;
    }
    
    // Find today's hours
    const todayHours = parsedHours.find(h => h.day === today);
    if (!todayHours) {
      return false;
    }
    
    const openMins = timeToMinutes(todayHours.open);
    const closeMins = timeToMinutes(todayHours.close);
    
    // Define time periods in minutes
    const timePeriods = {
      openNow: { start: currentTime, end: currentTime + 1 }, // Check if open right now
      morning: { start: 6 * 60, end: 12 * 60 }, // 6 AM - 12 PM
      afternoon: { start: 12 * 60, end: 18 * 60 }, // 12 PM - 6 PM
      evening: { start: 18 * 60, end: 22 * 60 }, // 6 PM - 10 PM
      lateNight: { start: 22 * 60, end: 6 * 60 + 24 * 60 } // 10 PM - 6 AM (next day)
    };
    
    const periodTimes = timePeriods[period];
    
    // Handle late night period that crosses midnight
    if (period === 'lateNight') {
      // Check if restaurant is open during late night hours (10 PM - midnight)
      if (openMins <= 24 * 60 && closeMins >= 22 * 60) {
        return true;
      }
      // Check if restaurant is open during early morning hours (midnight - 6 AM)
      if (openMins <= 6 * 60 && closeMins >= 0) {
        return true;
      }
      // Check if restaurant is open 24 hours
      if (openMins === 0 && closeMins >= 24 * 60) {
        return true;
      }
      return false;
    }
    
    // For other periods, check if restaurant hours overlap with the period
    const periodStart = periodTimes.start;
    const periodEnd = periodTimes.end;
    
    // Check if restaurant is open during any part of the specified period
    return (openMins < periodEnd && closeMins > periodStart);
    
  } catch {
    return false;
  }
} 