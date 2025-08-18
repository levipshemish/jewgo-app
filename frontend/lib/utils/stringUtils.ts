/**
 * Unified String Formatting Utilities
 * ===================================
 * 
 * Centralized string formatting functionality to eliminate code duplication.
 * This module consolidates all string formatting logic that was previously duplicated.
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

/**
 * Convert string to title case (e.g., "hello world" -> "Hello World")
 */
export const titleCase = (str: string): string => {
  if (!str) {
    return '';
  }
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Convert string to sentence case (e.g., "HELLO WORLD" -> "Hello world")
 */
export const sentenceCase = (str: string): string => {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert string to camel case (e.g., "hello world" -> "helloWorld")
 */
export const camelCase = (str: string): string => {
  if (!str) {
    return '';
  }
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '');
};

/**
 * Convert string to kebab case (e.g., "Hello World" -> "hello-world")
 */
export const kebabCase = (str: string): string => {
  if (!str) {
    return '';
  }
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

/**
 * Convert string to snake case (e.g., "Hello World" -> "hello_world")
 */
export const snakeCase = (str: string): string => {
  if (!str) {
    return '';
  }
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
};

/**
 * Convert string to pascal case (e.g., "hello world" -> "HelloWorld")
 */
export const pascalCase = (str: string): string => {
  if (!str) {
    return '';
  }
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, '');
};

/**
 * Truncate string to specified length with ellipsis
 */
export const truncate = (str: string, length: number, suffix: string = '...'): string => {
  if (!str) {
    return '';
  }
  if (str.length <= length) {
    return str;
  }
  return str.substring(0, length - suffix.length) + suffix;
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str: string): string => {
  if (!str) {
    return '';
  }
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

/**
 * Remove extra whitespace and normalize spaces
 */
export const normalizeWhitespace = (str: string): string => {
  if (!str) {
    return '';
  }
  return str.replace(/\s+/g, ' ').trim();
};

/**
 * Convert string to slug (URL-friendly)
 */
export const toSlug = (str: string): string => {
  if (!str) {
    return '';
  }
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Escape HTML special characters
 */
export const escapeHtml = (str: string): string => {
  if (!str) {
    return '';
  }
  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};

/**
 * Unescape HTML special characters
 */
export const unescapeHtml = (str: string): string => {
  if (!str) {
    return '';
  }
  const htmlUnescapes: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/'
  };
  return str.replace(/&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;/g, (match) => htmlUnescapes[match]);
};

/**
 * Generate initials from name
 */
export const getInitials = (name: string, maxLength: number = 2): string => {
  if (!name) {
    return '';
  }
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, maxLength);
};

/**
 * Check if string is empty or only whitespace
 */
export const isEmpty = (str: string): boolean => {
  return !str || str.trim().length === 0;
};

/**
 * Check if string contains only letters and spaces
 */
export const isAlphaSpace = (str: string): boolean => {
  if (!str) {
    return false;
  }
  return /^[a-zA-Z\s]+$/.test(str);
};

/**
 * Check if string contains only letters, numbers, and spaces
 */
export const isAlphanumericSpace = (str: string): boolean => {
  if (!str) {
    return false;
  }
  return /^[a-zA-Z0-9\s]+$/.test(str);
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) {
    return '';
  }
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone; // Return original if can't format
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Generate a random string
 */
export const randomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const stringUtils = {
  titleCase,
  sentenceCase,
  camelCase,
  kebabCase,
  snakeCase,
  pascalCase,
  truncate,
  capitalizeWords,
  normalizeWhitespace,
  toSlug,
  escapeHtml,
  unescapeHtml,
  getInitials,
  isEmpty,
  isAlphaSpace,
  isAlphanumericSpace,
  formatPhoneNumber,
  formatCurrency,
  formatNumber,
  randomString
};

export default stringUtils;
