"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function testUpload() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Create a simple test image file (1x1 pixel PNG)
    const pngData = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xCF, 0x00,
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const testFile = new File([pngData], "test.png", { type: "image/png" });
    
    // Try to upload to avatars bucket
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(`${user.id}/test.png`, testFile, {
        upsert: true
      });

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // Try to get the public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(`${user.id}/test.png`);

    // Clean up the test file
    await supabase.storage.from("avatars").remove([`${user.id}/test.png`]);

    return { 
      success: true, 
      message: "Test upload successful",
      url: urlData.publicUrl 
    };
    
  } catch (error) {
    console.error('Test upload error:', error);
    return { success: false, error: 'Test upload failed' };
  }
}
