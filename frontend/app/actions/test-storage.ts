"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function testStorage() {
  try {
    const supabase = createAdminSupabaseClient();
    
    // Test if we can list buckets with admin permissions
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return { success: false, error: listError.message };
    }
    
    console.log('Available buckets:', buckets);
    
    // Check if avatars bucket exists
    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (!avatarsBucket) {
      return { success: false, error: 'Avatars bucket not found' };
    }
    
    return { 
      success: true, 
      buckets: buckets.map(b => b.name),
      avatarsBucket: {
        name: avatarsBucket.name,
        public: avatarsBucket.public,
        fileSizeLimit: avatarsBucket.file_size_limit
      }
    };
    
  } catch (error) {
    console.error('Test storage error:', error);
    return { success: false, error: 'Storage test failed' };
  }
}
