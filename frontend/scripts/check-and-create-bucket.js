#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:');
console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

console.log('\n🔗 Connecting to Supabase...');

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateBucket() {
  try {
    // First, let's check what buckets exist
    console.log('📋 Listing all buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return false;
    }

    console.log('📦 Existing buckets:');
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (public: ${bucket.public})`);
    });

    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (avatarsBucket) {
      console.log('\n✅ Avatars bucket already exists!');
      console.log(`   Name: ${avatarsBucket.name}`);
      console.log(`   Public: ${avatarsBucket.public}`);
      console.log(`   File size limit: ${avatarsBucket.fileSizeLimit}`);
      return true;
    }

    console.log('\n📦 Creating avatars bucket...');
    
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

    console.log('✅ Avatars bucket created successfully!');
    console.log('   Name:', bucket.name);
    console.log('   Public:', bucket.public);
    console.log('   File size limit:', bucket.fileSizeLimit);

    // Verify the bucket was created by listing again
    console.log('\n🔍 Verifying bucket creation...');
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets();
    
    if (verifyError) {
      console.error('❌ Error verifying bucket:', verifyError);
      return false;
    }

    const verifyAvatarsBucket = verifyBuckets.find(b => b.name === 'avatars');
    if (verifyAvatarsBucket) {
      console.log('✅ Bucket verification successful!');
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
      console.log('\n🎉 Avatars bucket is ready!');
      console.log('\n📋 Next steps:');
      console.log('   1. Test the upload functionality in the app');
      console.log('   2. If uploads fail, check RLS policies in Supabase dashboard');
      console.log('   3. Ensure user authentication is working');
      process.exit(0);
    } else {
      console.log('\n❌ Failed to create avatars bucket');
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your Supabase service role key');
      console.log('   2. Verify your Supabase project URL');
      console.log('   3. Check Supabase dashboard for any errors');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Script failed with error:', error);
    process.exit(1);
  });
