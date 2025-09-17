"use server";

import { revalidatePath } from "next/cache";
import { appLogger } from '@/lib/utils/logger';

// PostgreSQL auth - using backend API instead of Supabase
import { ProfileSchema, UsernameSchema, type ProfileData } from "@/lib/validators/profile";
import { isPostgresAuthConfigured } from "@/lib/utils/auth-utils-client";

/**
 * Server action to update user profile
 * This function handles profile updates for PostgreSQL authentication
 */
export async function updateProfile(data: ProfileData) {
  try {
    // Check if PostgreSQL auth is configured
    if (!isPostgresAuthConfigured()) {
      appLogger.warn('PostgreSQL auth not configured, skipping profile update');
      return { success: false, message: 'Authentication not configured' };
    }

    // Validate the profile data
    const validatedData = ProfileSchema.parse(data);
    
    appLogger.info('Profile update not implemented for PostgreSQL auth', { data: validatedData });
    
    // Revalidate the profile page
    revalidatePath('/profile');
    
    return { 
      success: false, 
      message: 'Profile update not implemented for PostgreSQL auth',
      error: 'Profile update not implemented for PostgreSQL auth'
    };
    
  } catch (error) {
    appLogger.error('Profile update failed', { error });
    
    if (error instanceof Error) {
      return { 
        success: false, 
        message: error.message,
        error: error.message
      };
    }
    
    return { 
      success: false, 
      message: 'An unexpected error occurred',
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Server action to update username
 * This function handles username updates for PostgreSQL authentication
 */
/**
 * Server action to get current user profile
 * 
 * @returns Promise with current profile data
 */
export async function getCurrentProfile() {
  try {
    // Check if PostgreSQL auth is configured
    if (!isPostgresAuthConfigured()) {
      appLogger.warn('PostgreSQL auth not configured, skipping profile fetch');
      return { success: false, message: 'Authentication not configured', error: 'Authentication not configured' };
    }

    // Get profile via backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    if (!backendUrl) {
      return { 
        success: false, 
        message: 'Backend URL not configured',
        error: 'Backend URL not configured'
      };
    }

    const response = await fetch(`${backendUrl}/api/v5/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        message: errorData.error || `Profile fetch failed with status ${response.status}`,
        error: errorData.error || 'Profile fetch failed'
      };
    }

    const result = await response.json();
    
    if (result.success && result.user) {
      appLogger.info('Profile fetched successfully via PostgreSQL auth');
      
      return { 
        success: true, 
        data: result.user,
        message: 'Profile loaded successfully'
      };
    } else {
      return { 
        success: false, 
        message: result.error || 'Failed to load profile',
        error: result.error || 'Failed to load profile'
      };
    }
    
  } catch (error) {
    appLogger.error('Profile fetch failed', { error });
    
    if (error instanceof Error) {
      return { 
        success: false, 
        message: error.message,
        error: error.message
      };
    }
    
    return { 
      success: false, 
      message: 'An unexpected error occurred',
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Server action to check username availability
 * 
 * @param username - Username to check
 * @returns Promise with availability status
 */
export async function checkUsernameAvailability(username: string) {
  try {
    // Check if PostgreSQL auth is configured
    if (!isPostgresAuthConfigured()) {
      appLogger.warn('PostgreSQL auth not configured, skipping username check');
      return { success: false, message: 'Authentication not configured' };
    }

    appLogger.info('Username availability check not implemented for PostgreSQL auth', { username });
    
    return { 
      success: false, 
      message: 'Username availability check not implemented for PostgreSQL auth',
      available: false
    };
    
  } catch (error) {
    appLogger.error('Username availability check failed', { error });
    
    if (error instanceof Error) {
      return { 
        success: false, 
        message: error.message,
        error: error.message
      };
    }
    
    return { 
      success: false, 
      message: 'An unexpected error occurred',
      error: 'An unexpected error occurred'
    };
  }
}

export async function updateUsername(data: { username: string }) {
  try {
    // Check if PostgreSQL auth is configured
    if (!isPostgresAuthConfigured()) {
      appLogger.warn('PostgreSQL auth not configured, skipping username update');
      return { success: false, message: 'Authentication not configured' };
    }

    // Validate the username data
    const validatedData = UsernameSchema.parse(data);
    
    appLogger.info('Username update not implemented for PostgreSQL auth', { data: validatedData });
    
    // Revalidate the profile page
    revalidatePath('/profile');
    
    return { 
      success: false, 
      message: 'Username update not implemented for PostgreSQL auth' 
    };
    
  } catch (error) {
    appLogger.error('Username update failed', { error });
    
    if (error instanceof Error) {
      return { 
        success: false, 
        message: error.message,
        error: error.message
      };
    }
    
    return { 
      success: false, 
      message: 'An unexpected error occurred',
      error: 'An unexpected error occurred'
    };
  }
}