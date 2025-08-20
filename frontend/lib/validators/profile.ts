import { z } from "zod";

/**
 * Profile validation schema using Zod
 * Includes username uniqueness validation and comprehensive field validation
 */
export const ProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .transform(val => val.toLowerCase().trim()),
  
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be less than 50 characters")
    .transform(val => val.trim()),
  
  bio: z
    .string()
    .max(500, "Bio must be less than 500 characters")
    .optional()
    .transform(val => val?.trim() || ""),
  
  location: z
    .string()
    .max(100, "Location must be less than 100 characters")
    .optional()
    .transform(val => val?.trim() || ""),
  
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal(""))
    .transform(val => val || ""),
  
  phone: z
    .string()
    .regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal(""))
    .transform(val => val?.replace(/[\s\-\(\)]/g, '') || ""),
  
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date (YYYY-MM-DD)")
    .optional()
    .or(z.literal(""))
    .transform(val => val || null),
  
  preferences: z.object({
    emailNotifications: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    marketingEmails: z.boolean().default(false),
    publicProfile: z.boolean().default(true),
    showLocation: z.boolean().default(false),
  }).optional().default({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    publicProfile: true,
    showLocation: false,
  }),
});

export type ProfileData = z.infer<typeof ProfileSchema>;

/**
 * Username validation schema for uniqueness checks
 */
export const UsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .transform(val => val.toLowerCase().trim()),
});

export type UsernameData = z.infer<typeof UsernameSchema>;

/**
 * Partial profile schema for updates
 */
export const PartialProfileSchema = ProfileSchema.partial();

export type PartialProfileData = z.infer<typeof PartialProfileSchema>;

/**
 * Profile form validation schema (client-side)
 */
export const ProfileFormSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be less than 50 characters"),
  
  bio: z
    .string()
    .max(500, "Bio must be less than 500 characters")
    .optional(),
  
  location: z
    .string()
    .max(100, "Location must be less than 100 characters")
    .optional(),
  
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  
  phone: z
    .string()
    .regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date (YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
  
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  publicProfile: z.boolean(),
  showLocation: z.boolean(),
});

export type ProfileFormData = z.infer<typeof ProfileFormSchema>;
