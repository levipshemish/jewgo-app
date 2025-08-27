#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAvatarsBucket() {
  try {
    // Check if avatars bucket already exists

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return false;
    }

    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (avatarsBucket) {

      return true;
    }

    // Create the avatars bucket
    const { data: bucket, error: createError } = await supabase.storage.createBucket('avatars', {
      public: true, // Allow public read access
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return false;
    }

    // Set up RLS policies for the avatars bucket

    // Policy 1: Allow public read access to all avatars
    const { error: publicReadError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Public read access to avatars" ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars');
      `
    });

    if (publicReadError && !publicReadError.message.includes('already exists')) {
      console.error('❌ Error creating public read policy:', publicReadError);
    } else {

    }

    // Policy 2: Allow authenticated users to upload to their own prefix
    const { error: uploadError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can upload to own avatar folder" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'avatars' 
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    });

    if (uploadError && !uploadError.message.includes('already exists')) {
      console.error('❌ Error creating upload policy:', uploadError);
    } else {

    }

    // Policy 3: Allow users to update their own avatars
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can update own avatars" ON storage.objects
        FOR UPDATE USING (
          bucket_id = 'avatars' 
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    });

    if (updateError && !updateError.message.includes('already exists')) {
      console.error('❌ Error creating update policy:', updateError);
    } else {

    }

    // Policy 4: Allow users to delete their own avatars
    const { error: deleteError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can delete own avatars" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'avatars' 
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    });

    if (deleteError && !deleteError.message.includes('already exists')) {
      console.error('❌ Error creating delete policy:', deleteError);
    } else {

    }




    console.log('   ✅ User upload access: Enabled (own folder)');
    console.log('   ✅ User update access: Enabled (own files)');
    console.log('   ✅ User delete access: Enabled (own files)');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the setup
createAvatarsBucket()
  .then(success => {
    if (success) {

      process.exit(0);
    } else {

      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Setup failed with error:', error);
    process.exit(1);
  });
