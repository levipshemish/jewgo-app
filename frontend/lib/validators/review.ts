import { z } from 'zod';

export const ReviewSchema = z.object({
  id: z.string(),
  restaurant_id: z.number(),
  restaurant_name: z.string().optional(),
  user_id: z.string(),
  user_name: z.string(),
  user_email: z.string().email().optional(),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(1),
  comment: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  status: z.enum(['pending', 'approved', 'rejected']),
  verified_purchase: z.boolean().optional(),
  helpful_count: z.number().min(0).optional(),
  report_count: z.number().min(0).optional(),
  moderator_notes: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

export const ReviewsResponseSchema = z.object({
  reviews: z.array(ReviewSchema),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    pages: z.number().min(0),
  }),
  stats: z.object({
    total: z.number().min(0),
    pending: z.number().min(0),
    approved: z.number().min(0),
    rejected: z.number().min(0),
  }),
});

export const ReviewFiltersSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  restaurant_id: z.number().positive().optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const ReviewUpdateRequestSchema = z.object({
  reviewId: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  moderator_notes: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
});

export const ReviewCreateRequestSchema = z.object({
  restaurant_id: z.number().positive(),
  user_name: z.string().min(1),
  user_email: z.string().email().optional(),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(1),
  images: z.array(z.string().url()).optional(),
});

export type Review = z.infer<typeof ReviewSchema>;
export type ReviewsResponse = z.infer<typeof ReviewsResponseSchema>;
export type ReviewFilters = z.infer<typeof ReviewFiltersSchema>;
export type ReviewUpdateRequest = z.infer<typeof ReviewUpdateRequestSchema>;
export type ReviewCreateRequest = z.infer<typeof ReviewCreateRequestSchema>;
