#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;



if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateBucket() {
  try {
    // First, let's check what buckets exist

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return false;
    }

    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (public: ${bucket.public})`);
    });

    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (avatarsBucket) {




      return true;
    }

    // Create the avatars bucket with explicit settings
    const { data: bucket, error: createError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return false;
    }




    // Verify the bucket was created by listing again

    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets();
    
    if (verifyError) {
      console.error('❌ Error verifying bucket:', verifyError);
      return false;
    }

    const verifyAvatarsBucket = verifyBuckets.find(b => b.name === 'avatars');
    if (verifyAvatarsBucket) {

      return true;
    } else {
      console.error('❌ Bucket verification failed - bucket not found after creation');
      return false;
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the check and create
checkAndCreateBucket()
  .then(success => {
    if (success) {





      process.exit(0);
    } else {





      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Script failed with error:', error);
    process.exit(1);
  });
