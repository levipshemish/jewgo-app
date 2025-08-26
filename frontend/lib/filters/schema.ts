import { z } from "zod";

// Shared filter schema for frontend and backend
export const FiltersSchema = z.object({
  // Search query
  q: z.string().trim().min(1).optional(),
  
  // Kosher filters
  agency: z.string().optional(),
  dietary: z.string().optional().transform((val) => {
    // Handle multiple dietary values by taking the first one
    if (typeof val === 'string') {
      // If it's a JSON array string, parse and take the first one (check this first)
      if (val.startsWith('[') && val.endsWith(']')) {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : val;
        } catch {
          // If JSON parsing fails, try to extract the first value using regex
          const match = val.match(/"([^"]+)"/);
          return match ? match[1] : val;
        }
      }
      // If it's a comma-separated list (but not a JSON array), take the first one
      if (val.includes(',')) {
        return val.split(',')[0].trim();
      }
    }
    return val;
  }),
  category: z.string().optional(),
  
  // Location filters
  nearMe: z.coerce.boolean().optional(),
  maxDistanceMi: z.coerce.number().min(1).max(50).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  
  // Time and availability filters
  openNow: z.coerce.boolean().optional(),
  
  // Rating and price filters
  ratingMin: z.coerce.number().min(1).max(5).optional(),
  priceMin: z.coerce.number().min(1).max(4).optional(),
  priceMax: z.coerce.number().min(1).max(4).optional(),
  
  // Mikvah-specific filters
  mikvahType: z.string().optional(),
  mikvahCategory: z.string().optional(),
  requiresAppointment: z.coerce.boolean().optional(),
  walkInAvailable: z.coerce.boolean().optional(),
  hasChangingRooms: z.coerce.boolean().optional(),
  hasShowerFacilities: z.coerce.boolean().optional(),
  
  // Store-specific filters
  hasDelivery: z.coerce.boolean().optional(),
  hasPickup: z.coerce.boolean().optional(),
  
  // Shul-specific filters
  denomination: z.string().optional(),
  shulType: z.string().optional(),
  hasMikvah: z.coerce.boolean().optional(),
  hasKiddush: z.coerce.boolean().optional(),
  hasKosherFood: z.coerce.boolean().optional(),
  hasHebrewSchool: z.coerce.boolean().optional(),
  hasWheelchairAccess: z.coerce.boolean().optional(),
  hasSeparateSeating: z.coerce.boolean().optional(),
  hasDailyMincha: z.coerce.boolean().optional(),
  
  // General facility filters
  hasParking: z.coerce.boolean().optional(),
  
  // Pagination
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export type Filters = z.infer<typeof FiltersSchema>;

// Helper functions for URL serialization/deserialization
export const toSearchParams = (filters: Filters): URLSearchParams => {
  const params = new URLSearchParams();
  
  (Object.keys(filters) as (keyof Filters)[]).forEach((key) => {
    const value = filters[key];
    if (value === undefined || value === "" || value === null) {return;}
    
    // Handle boolean values as 1/0 for compactness
    if (typeof value === "boolean") {
      params.set(String(key), value ? "1" : "0");
    } else if (Array.isArray(value)) {
      // Handle arrays by adding multiple parameters (except dietary)
      if (key === 'dietary') {
        // For dietary, only use the first value
        const firstValue = value[0];
        if (firstValue !== undefined && firstValue !== null && String(firstValue).trim() !== "") {
          params.set(String(key), String(firstValue));
        }
      } else {
        value.forEach(item => {
          if (item !== undefined && item !== null && String(item).trim() !== "") {
            params.append(String(key), String(item));
          }
        });
      }
    } else {
      params.set(String(key), String(value));
    }
  });
  
  return params;
};

export const fromSearchParams = (searchParams: URLSearchParams): Filters => {
  const obj: Record<string, unknown> = {};

  // Keys that are boolean in our schema
  const booleanKeys = new Set([
    'nearMe',
    'openNow',
    'requiresAppointment',
    'walkInAvailable',
    'hasChangingRooms',
    'hasShowerFacilities',
    'hasDelivery',
    'hasPickup',
    'hasMikvah',
    'hasKiddush',
    'hasKosherFood',
    'hasHebrewSchool',
    'hasWheelchairAccess',
    'hasSeparateSeating',
    'hasDailyMincha',
  ]);

  // Convert URLSearchParams to object, with safe boolean conversion only for boolean keys
  searchParams.forEach((value, key) => {
    // For dietary parameter, only take the first value to avoid array issues
    if (key === 'dietary' && obj[key] !== undefined) {
      return; // Skip additional dietary values
    }

    // Handle multiple values for the same parameter (except dietary)
    if (obj[key] !== undefined) {
      if (Array.isArray(obj[key])) {
        (obj[key] as unknown[]).push(value);
      } else {
        obj[key] = [obj[key], value];
      }
      return;
    }

    if (booleanKeys.has(key)) {
      if (value === '1') {
        obj[key] = true;
        return;
      }
      if (value === '0') {
        obj[key] = false;
        return;
      }
      // Fall through to string to allow z.coerce.boolean to handle other truthy strings
    }
    obj[key] = value;
  });

  return FiltersSchema.parse(obj);
};

// Default filter values
export const DEFAULT_FILTERS: Filters = {
  page: 1,
  limit: 50,
  dietary: undefined,
};

// Validation helpers
export const validateFilters = (filters: unknown): Filters => {
  return FiltersSchema.parse(filters);
};

// Filter state helpers
export const hasActiveFilters = (filters: Filters): boolean => {
  return Object.entries(filters).some(([key, value]) => {
    if (key === "page" || key === "limit") {return false;} // Don't count pagination
    return value !== undefined && value !== "" && value !== null;
  });
};

export const getFilterCount = (filters: Filters): number => {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === "page" || key === "limit") {return false;}
    return value !== undefined && value !== "" && value !== null;
  }).length;
};
