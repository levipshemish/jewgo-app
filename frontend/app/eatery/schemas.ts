import { z } from 'zod';

// helper to safely coerce numeric strings to numbers; empty/invalid become undefined
const optionalNumberFromString = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'string') {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }
  return val;
}, z.number().finite()).optional();

export const lightRestaurantSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  address: z.string(),
  image_url: z.string().optional(),
  price_range: z.string().optional(),
  google_rating: z.union([z.number(), z.string()]).optional(),
  kosher_category: z.string().optional(),
  cuisine: z.string().optional(),
  is_open: z.boolean().optional(),
  latitude: optionalNumberFromString,
  longitude: optionalNumberFromString,
  distance: z.number().optional(),
});

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    restaurants: z.array(lightRestaurantSchema),
    total: z.number(),
    filterOptions: z.object({
      agencies: z.array(z.string()),
      kosherCategories: z.array(z.string()),
      listingTypes: z.array(z.string()),
      priceRanges: z.array(z.string()),
      cities: z.array(z.string()),
      states: z.array(z.string()),
    }),
  }),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    page: z.number(),
    totalPages: z.number(),
  }),
});

export type ApiResponseZ = z.infer<typeof apiResponseSchema>;
export type LightRestaurantZ = z.infer<typeof lightRestaurantSchema>;
