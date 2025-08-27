/* eslint-disable no-console */
"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { appLogger } from '@/lib/utils/logger';

export async function testStorage() {
  try {
    const supabase = createAdminSupabaseClient();
    
    // Test if we can list buckets with admin permissions
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      appLogger.error('Error listing buckets', { error: String(listError) });
      return { success: false, error: listError.message };
    }
    
    appLogger.info('Available buckets', { count: buckets?.length || 0 });
    
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
    appLogger.error('Test storage error', { error: String(error) });
    return { success: false, error: 'Storage test failed' };
  }
}
/* eslint-disable no-console */
