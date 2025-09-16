"use server";

import { revalidatePath } from "next/cache";
// import { v4 as uuidv4 } from "uuid"; // TODO: Implement avatar upload functionality

// PostgreSQL auth - using backend API instead of Supabase
import { appLogger } from '@/lib/utils/logger';

/**
 * Server action to upload an avatar image to PostgreSQL storage
 * and update the user's profile with the new avatar URL.
 * 
 * @param formData - FormData containing the image file
 * @returns Promise with success status and avatar URL or error message
 */
/**
 * Server action to delete an avatar image
 * 
 * @param avatarUrl - URL of the avatar to delete
 * @returns Promise with success status
 */
export async function deleteAvatar(avatarUrl: string) {
  try {
    appLogger.info('Deleting avatar via PostgreSQL auth', { avatarUrl });
    
    // Delete avatar via backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    if (!backendUrl) {
      return { 
        success: false, 
        message: 'Backend URL not configured'
      };
    }

    const response = await fetch(`${backendUrl}/api/v5/auth/avatar/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        avatar_url: avatarUrl
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        message: errorData.error || `Delete failed with status ${response.status}`
      };
    }

    const result = await response.json();
    
    if (result.success) {
      // Revalidate the profile page
      revalidatePath('/profile');
      revalidatePath('/profile/settings');
      
      return { 
        success: true, 
        message: 'Avatar deleted successfully'
      };
    } else {
      return { 
        success: false, 
        message: result.error || 'Delete failed'
      };
    }
    
  } catch (error) {
    appLogger.error('Avatar deletion failed', { error });
    
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    
    return { success: false, message: 'An unexpected error occurred' };
  }
}

export async function uploadAvatar(formData: FormData) {
  try {
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return { success: false, message: 'No file provided' };
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, message: 'File must be an image' };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, message: 'File size must be less than 5MB' };
    }

    appLogger.info('Uploading avatar via PostgreSQL auth', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    });

    // Convert file to base64 for backend upload
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    // Upload to backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    if (!backendUrl) {
      return { 
        success: false, 
        message: 'Backend URL not configured',
        error: 'Backend URL not configured'
      };
    }

    const response = await fetch(`${backendUrl}/api/v5/auth/avatar/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        file_data: base64,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        message: errorData.error || `Upload failed with status ${response.status}`,
        error: errorData.error || 'Upload failed'
      };
    }

    const result = await response.json();
    
    if (result.success && result.data?.avatar_url) {
      // Revalidate the profile page
      revalidatePath('/profile');
      revalidatePath('/profile/settings');
      
      return { 
        success: true, 
        message: 'Avatar uploaded successfully',
        avatarUrl: result.data.avatar_url
      };
    } else {
      return { 
        success: false, 
        message: result.error || 'Upload failed',
        error: result.error || 'Upload failed'
      };
    }
    
  } catch (error) {
    appLogger.error('Avatar upload failed', { error });
    
    if (error instanceof Error) {
      return { 
        success: false, 
        message: error.message,
        avatarUrl: undefined,
        error: error.message
      };
    }
    
    return { 
      success: false, 
      message: 'An unexpected error occurred',
      avatarUrl: undefined,
      error: 'An unexpected error occurred'
    };
  }
}