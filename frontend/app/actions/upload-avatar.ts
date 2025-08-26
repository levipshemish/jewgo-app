"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Server action to upload an avatar image to Supabase Storage
 * and update the user's profile with the new avatar URL.
 * 
 * @param formData - FormData containing the file to upload
 * @returns Promise<{ success: boolean; avatarUrl?: string; error?: string }>
 */
export async function uploadAvatar(formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get the file from form data
    const file = formData.get("avatar") as File;
    
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return { 
        success: false, 
        error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." 
      };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { 
        success: false, 
        error: "File too large. Please upload an image smaller than 5MB." 
      };
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${user.id}/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true // Allow overwriting existing files
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { 
        success: false, 
        error: "Failed to upload image. Please try again." 
      };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl }
    });

    if (updateError) {
      console.error("Profile update error:", updateError);
      // If profile update fails, try to delete the uploaded file
      await supabase.storage.from("avatars").remove([filePath]);
      return { 
        success: false, 
        error: "Failed to update profile. Please try again." 
      };
    }

    // Revalidate the profile page to show the new avatar
    revalidatePath("/profile");
    revalidatePath("/profile/settings");

    return { 
      success: true, 
      avatarUrl 
    };

  } catch (error) {
    console.error("Avatar upload error:", error);
    return { 
      success: false, 
      error: "An unexpected error occurred. Please try again." 
    };
  }
}

/**
 * Server action to delete the current avatar
 * 
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function deleteAvatar() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get current avatar URL from user metadata
    const currentAvatarUrl = user.user_metadata?.avatar_url;
    if (!currentAvatarUrl) {
      return { success: false, error: "No avatar to delete" };
    }

    // Extract file path from URL
    const urlParts = currentAvatarUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `${user.id}/${fileName}`;

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from("avatars")
      .remove([filePath]);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      // Continue even if file deletion fails (file might not exist)
    }

    // Update user profile to remove avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: null }
    });

    if (updateError) {
      console.error("Profile update error:", updateError);
      return { 
        success: false, 
        error: "Failed to update profile. Please try again." 
      };
    }

    // Revalidate the profile page
    revalidatePath("/profile");
    revalidatePath("/profile/settings");

    return { success: true };

  } catch (error) {
    console.error("Avatar delete error:", error);
    return { 
      success: false, 
      error: "An unexpected error occurred. Please try again." 
    };
  }
}
