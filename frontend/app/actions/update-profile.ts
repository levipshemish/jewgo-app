"use server";

import { revalidatePath } from "next/cache";
import { appLogger } from '@/lib/utils/logger';

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProfileSchema, UsernameSchema, type ProfileData } from "@/lib/validators/profile";
import { isSupabaseConfigured } from "@/lib/utils/auth-utils";

/**
 * Server action to update user profile
 * Includes validation, username uniqueness checks, and error handling
 * 
 * @param data - Profile data to update
 * @returns Promise<{ success: boolean; data?: ProfileData; error?: string }>
 */
export async function updateProfile(data: ProfileData) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Validate the input data
    const validationResult = ProfileSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => err.message).join(", ");
      return { success: false, error: `Validation failed: ${errors}` };
    }

    const validatedData = validationResult.data;

    // Check username uniqueness if username is being changed
    if (validatedData.username) {
      // Get current profile from database to check if username is actually changing
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const currentUsername = currentProfile?.username || user.user_metadata?.profile?.username;
      
      if (validatedData.username !== currentUsername) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', validatedData.username)
          .neq('id', user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          appLogger.error('Username check error', { error: String(checkError) });
          return { success: false, error: "Failed to check username availability" };
        }

        if (existingUser) {
          return { success: false, error: "Username is already taken" };
        }
      }
    }

    // Prepare profile data for update
    const profileData = {
      username: validatedData.username,
      display_name: validatedData.displayName,
      bio: validatedData.bio,
      location: validatedData.location,
      website: validatedData.website,
      phone: validatedData.phone,
      date_of_birth: validatedData.dateOfBirth,
      preferences: validatedData.preferences,
      updated_at: new Date().toISOString(),
    };

    // Update profile in database
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...profileData,
      })
      .select()
      .single();

    if (updateError) {
      appLogger.error('Profile update error', { error: String(updateError) });
      
      // Handle specific constraint violations
      if (updateError.code === '23505') { // Unique constraint violation
        if (updateError.message.includes('username')) {
          return { success: false, error: "Username is already taken" };
        }
        if (updateError.message.includes('email')) {
          return { success: false, error: "Email is already registered" };
        }
      }
      
      return { success: false, error: "Failed to update profile. Please try again." };
    }

    // Update user metadata with profile information
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        profile: {
          username: validatedData.username,
          display_name: validatedData.displayName,
          bio: validatedData.bio,
          location: validatedData.location,
          website: validatedData.website,
          phone: validatedData.phone,
          date_of_birth: validatedData.dateOfBirth,
          preferences: validatedData.preferences,
        }
      }
    });

    if (metadataError) {
      appLogger.error('Metadata update error', { error: String(metadataError) });
      // Don't fail the entire operation if metadata update fails
      // The profile is still updated in the database
    }

    // Revalidate relevant pages
    revalidatePath("/profile");
    revalidatePath("/profile/settings");
    revalidatePath(`/profile/${validatedData.username}`);

    return { 
      success: true, 
      data: validatedData 
    };

  } catch (error) {
    appLogger.error('Profile update error', { error: String(error) });
    return { 
      success: false, 
      error: "An unexpected error occurred. Please try again." 
    };
  }
}

/**
 * Server action to check username availability
 * Used for real-time username validation with debouncing
 * 
 * @param username - Username to check
 * @returns Promise<{ available: boolean; error?: string }>
 */
export async function checkUsernameAvailability(username: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { available: false, error: "User not authenticated" };
    }

    // Validate username format
    const validationResult = UsernameSchema.safeParse({ username });
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => err.message).join(", ");
      return { available: false, error: `Invalid username: ${errors}` };
    }

    const validatedUsername = validationResult.data.username;

    // Check if username exists (excluding current user)
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', validatedUsername)
      .neq('id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      appLogger.error('Username check error', { error: String(checkError) });
      return { available: false, error: "Failed to check username availability" };
    }

    const available = !existingUser;

    return { available };

  } catch (error) {
    appLogger.error('Username availability check error', { error: String(error) });
    return { available: false, error: "Failed to check username availability" };
  }
}

/**
 * Server action to get current user profile
 * 
 * @returns Promise<{ success: boolean; data?: ProfileData; error?: string }>
 */
export async function getCurrentProfile() {
  try {
    // Check if Supabase is configured using centralized utility
    if (!isSupabaseConfigured()) {
      // Return mock profile for development
      const mockProfile: ProfileData = {
        username: "dev-user",
        displayName: "Development User",
        bio: "This is a development profile",
        location: "Development Environment",
        website: "",
        phone: "",
        dateOfBirth: null,
        preferences: {
          emailNotifications: true,
          pushNotifications: true,
          marketingEmails: false,
          publicProfile: true,
          showLocation: false,
        },
      };
      return { success: true, data: mockProfile };
    }

    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      appLogger.error('Profile fetch error', { error: String(profileError) });
      return { success: false, error: "Failed to fetch profile" };
    }

    // Transform database data to match schema
    const profileData: ProfileData = {
      username: profile?.username || "",
      displayName: profile?.display_name || user.user_metadata?.full_name || "",
      bio: profile?.bio || "",
      location: profile?.location || "",
      website: profile?.website || "",
      phone: profile?.phone || "",
      dateOfBirth: profile?.date_of_birth || null,
      preferences: {
        emailNotifications: profile?.preferences?.emailNotifications ?? true,
        pushNotifications: profile?.preferences?.pushNotifications ?? true,
        marketingEmails: profile?.preferences?.marketingEmails ?? false,
        publicProfile: profile?.preferences?.publicProfile ?? true,
        showLocation: profile?.preferences?.showLocation ?? false,
      },
    };

    return { 
      success: true, 
      data: profileData 
    };

  } catch (error) {
    appLogger.error('Get profile error', { error: String(error) });
    return { 
      success: false, 
      error: "An unexpected error occurred. Please try again." 
    };
  }
}
