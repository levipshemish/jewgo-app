import { ValidationResult } from '@/types';
import { Restaurant } from '@/lib/types/restaurant';

/**
 * Validates if a restaurant object has the required properties
 */
export function isValidRestaurant(restaurant: unknown): restaurant is Restaurant {
  if (!restaurant || typeof restaurant !== 'object') {
    return false;
  }
  
  const r = restaurant as Record<string, unknown>;
  
  return (
    typeof r['id'] === 'number' &&
    typeof r['name'] === 'string' &&
    typeof r['address'] === 'string' &&
    typeof r['city'] === 'string' &&
    typeof r['state'] === 'string' &&
    typeof r['certifying_agency'] === 'string' &&
    typeof r['kosher_category'] === 'string' &&
    typeof r['listing_type'] === 'string' &&
    // Make status optional since it's calculated dynamically
    (r['status'] === undefined || typeof r['status'] === 'string')
  );
}

/**
 * Validates and filters an array of restaurants
 */
export function validateRestaurants(restaurants: unknown[]): Restaurant[] {
  if (!Array.isArray(restaurants)) {
    return [];
  }

  const validRestaurants = restaurants.filter(isValidRestaurant);
  
  if (validRestaurants.length !== restaurants.length) {
    }

  return validRestaurants;
}

/**
 * Safely accesses nested object properties
 */
export function safeGet<T>(obj: unknown, path: string, defaultValue: T): T {
  try {
    const keys = path.split('.');
    let result: unknown = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined || typeof result !== 'object') {
        return defaultValue;
      }
      result = (result as Record<string, unknown>)[key];
    }
    
    return result !== undefined ? result as T : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely filters an array with comprehensive error handling
 * This function handles all edge cases where the input might not be an array
 */
export function safeFilter<T>(array: T[] | null | undefined | unknown, predicate: (item: T) => boolean): T[] {
  // Handle null, undefined, or non-array inputs
  if (!array || !Array.isArray(array)) {
    return [];
  }
  
  try {
    return array.filter(predicate);
  } catch {
    // // console.error('safeFilter error:', error);
    return [];
  }
}

/**
 * Safely maps an array with comprehensive error handling
 */
export function safeMap<T, U>(array: T[] | null | undefined | unknown, mapper: (item: T) => U): U[] {
  // Handle null, undefined, or non-array inputs
  if (!array || !Array.isArray(array)) {
    return [];
  }
  
  try {
    return array.map(mapper);
  } catch {
    // // console.error('safeMap error:', error);
    return [];
  }
}

/**
 * Safely reduces an array with comprehensive error handling
 */
export function safeReduce<T, U>(
  array: T[] | null | undefined | unknown, reducer: (accumulator: U, item: T, index: number) => U, 
  initialValue: U
): U {
  // Handle null, undefined, or non-array inputs
  if (!array || !Array.isArray(array)) {
    // eslint-disable-next-line no-console
    return initialValue;
  }
  
  try {
    return array.reduce(reducer, initialValue);
  } catch {
    // eslint-disable-next-line no-console
    // // console.error('safeReduce error:', error);
    return initialValue;
  }
}

/**
 * Safely gets the length of an array
 */
export function safeLength(array: unknown[] | null | undefined | unknown): number {
  if (!array || !Array.isArray(array)) {
    return 0;
  }
  return array.length;
}

/**
 * Safely checks if an array includes a value
 */
export function safeIncludes<T>(array: T[] | null | undefined | unknown, value: T): boolean {
  if (!array || !Array.isArray(array)) {
    return false;
  }
  try {
    return array.includes(value);
  } catch {
    // eslint-disable-next-line no-console
    // // console.error('safeIncludes error:', error);
    return false;
  }
}

/**
 * Safely finds an item in an array
 */
export function safeFind<T>(array: T[] | null | undefined | unknown, predicate: (item: T) => boolean): T | undefined {
  if (!array || !Array.isArray(array)) {
    return undefined;
  }
  try {
    return array.find(predicate);
  } catch {
    // eslint-disable-next-line no-console
    // // console.error('safeFind error:', error);
    return undefined;
  }
}

/**
 * Safely finds the index of an item in an array
 */
export function safeFindIndex<T>(array: T[] | null | undefined | unknown, predicate: (item: T) => boolean): number {
  if (!array || !Array.isArray(array)) {
    return -1;
  }
  try {
    return array.findIndex(predicate);
  } catch {
    // eslint-disable-next-line no-console
    // // console.error('safeFindIndex error:', error);
    return -1;
  }
}

/**
 * Validates API response structure
 */
export function validateApiResponse(response: unknown): ValidationResult<unknown> {
  if (!response) {
    return { isValid: false, error: 'Response is null or undefined' };
  }

  if (typeof response !== 'object') {
    return { isValid: false, error: 'Response is not an object' };
  }

  const r = response as Record<string, unknown>;

  // Check if response has restaurants property
  if (r['restaurants'] && !Array.isArray(r['restaurants'])) {
    return { isValid: false, error: 'Restaurants property is not an array' };
  }

  // Check if response has data property
  if (r['data'] && !Array.isArray(r['data'])) {
    return { isValid: false, error: 'Data property is not an array' };
  }

  return { isValid: true, data: response };
} 