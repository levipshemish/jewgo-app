/**
 * Unified Date Formatting Utilities
 * =================================
 * 
 * Centralized date formatting functionality to eliminate code duplication.
 * This module consolidates all date formatting logic that was previously duplicated.
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

export interface DateFormatOptions {
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  timeZoneName?: 'long' | 'short';
}

/**
 * Unified date formatting function that handles multiple input types
 */
export const formatDate = (
  input: string | number | Date,
  options: DateFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string => {
  let date: Date;

  // Handle different input types
  if (typeof input === 'string') {
    date = new Date(input);
  } else if (typeof input === 'number') {
    // Assume timestamp in seconds if it's a reasonable Unix timestamp
    if (input < 10000000000) {
      date = new Date(input * 1000);
    } else {
      date = new Date(input);
    }
  } else {
    date = input;
  }

  // Validate date
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString('en-US', options);
};

/**
 * Format date for short display (e.g., "Jan 15, 2024")
 */
export const formatDateShort = (input: string | number | Date): string => {
  return formatDate(input, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date for long display (e.g., "January 15, 2024")
 */
export const formatDateLong = (input: string | number | Date): string => {
  return formatDate(input, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format date and time (e.g., "Jan 15, 2024 at 2:30 PM")
 */
export const formatDateTime = (input: string | number | Date): string => {
  return formatDate(input, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

/**
 * Shared helper to parse and validate date input
 */
const parseDateInput = (input: string | number | Date): Date | null => {
  const date = typeof input === 'string' ? new Date(input) : 
               typeof input === 'number' ? new Date(input < 10000000000 ? input * 1000 : input) : 
               input;

  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
};

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export const formatRelativeTime = (input: string | number | Date): string => {
  const date = parseDateInput(input);
  if (!date) return 'Invalid Date';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
};

/**
 * Format date for ISO string (e.g., "2024-01-15")
 */
export const formatDateISO = (input: string | number | Date): string => {
  const date = parseDateInput(input);
  if (!date) {
    return 'Invalid Date';
  }

  return date.toISOString().split('T')[0];
};

/**
 * Check if a date is today
 */
export const isToday = (input: string | number | Date): boolean => {
  const date = parseDateInput(input);
  if (!date) {
    return false;
  }

  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if a date is yesterday
 */
export const isYesterday = (input: string | number | Date): boolean => {
  const date = parseDateInput(input);
  if (!date) {
    return false;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

/**
 * Get the day of the week
 */
export const getDayOfWeek = (input: string | number | Date): string => {
  const date = parseDateInput(input);
  if (!date) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Get the month name
 */
export const getMonthName = (input: string | number | Date): string => {
  const date = parseDateInput(input);
  if (!date) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString('en-US', { month: 'long' });
};

const dateUtils = {
  formatDate,
  formatDateShort,
  formatDateLong,
  formatDateTime,
  formatRelativeTime,
  formatDateISO,
  isToday,
  isYesterday,
  getDayOfWeek,
  getMonthName
};

export default dateUtils;
