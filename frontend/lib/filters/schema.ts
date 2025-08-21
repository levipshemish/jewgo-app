import { z } from "zod";

// Shared filter schema for frontend and backend
export const FiltersSchema = z.object({
  // Search query
  q: z.string().trim().min(1).optional(),
  
  // Kosher filters
  agency: z.string().optional(),
  dietary: z.enum(["meat", "dairy", "pareve"]).optional(),
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
    } else {
      params.set(String(key), String(value));
    }
  });
  
  return params;
};

export const fromSearchParams = (searchParams: URLSearchParams): Filters => {
  const obj: Record<string, unknown> = {};
  
  // Convert URLSearchParams to object, handling boolean conversion
  searchParams.forEach((value, key) => {
    if (value === "1") {
      obj[key] = true;
    } else if (value === "0") {
      obj[key] = false;
    } else {
      obj[key] = value;
    }
  });
  
  return FiltersSchema.parse(obj);
};

// Default filter values
export const DEFAULT_FILTERS: Filters = {
  page: 1,
  limit: 50,
  maxDistanceMi: 25,
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
