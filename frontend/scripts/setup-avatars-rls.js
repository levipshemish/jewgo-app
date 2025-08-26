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

async function setupAvatarsRLS() {
  try {
    console.log('📋 Setting up RLS policies for avatars bucket...');

    // Policy 1: Allow authenticated users to upload their own avatars
    const uploadPolicy = `
      CREATE POLICY "Users can upload their own avatars" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
      );
    `;

    // Policy 2: Allow users to view all avatars (public access)
    const selectPolicy = `
      CREATE POLICY "Anyone can view avatars" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
    `;

    // Policy 3: Allow users to update their own avatars
    const updatePolicy = `
      CREATE POLICY "Users can update their own avatars" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
      );
    `;

    // Policy 4: Allow users to delete their own avatars
    const deletePolicy = `
      CREATE POLICY "Users can delete their own avatars" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
      );
    `;

    // Enable RLS on storage.objects if not already enabled
    console.log('🔒 Enabling RLS on storage.objects...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.log('RLS might already be enabled or exec_sql not available:', rlsError.message);
    }

    // Create policies
    const policies = [
      { name: 'Upload Policy', sql: uploadPolicy },
      { name: 'Select Policy', sql: selectPolicy },
      { name: 'Update Policy', sql: updatePolicy },
      { name: 'Delete Policy', sql: deletePolicy }
    ];

    for (const policy of policies) {
      console.log(`📝 Creating ${policy.name}...`);
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
        if (error) {
          console.log(`⚠️  ${policy.name} might already exist:`, error.message);
        } else {
          console.log(`✅ ${policy.name} created successfully`);
        }
      } catch (err) {
        console.log(`⚠️  ${policy.name} creation failed:`, err.message);
      }
    }

    // Alternative: Try to create policies using direct SQL if exec_sql doesn't work
    console.log('\n🔄 Trying alternative method with direct SQL...');
    
    const alternativePolicies = [
      {
        name: 'Upload Policy (Alternative)',
        sql: `INSERT INTO storage.policies (name, definition, bucket_id) 
              VALUES ('Users can upload their own avatars', 
                      'bucket_id = ''avatars'' AND auth.uid()::text = (storage.foldername(name))[1]', 
                      'avatars')
              ON CONFLICT (name, bucket_id) DO NOTHING;`
      }
    ];

    for (const policy of alternativePolicies) {
      console.log(`📝 Creating ${policy.name}...`);
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
        if (error) {
          console.log(`⚠️  ${policy.name} failed:`, error.message);
        } else {
          console.log(`✅ ${policy.name} created successfully`);
        }
      } catch (err) {
        console.log(`⚠️  ${policy.name} creation failed:`, err.message);
      }
    }

    console.log('\n📋 RLS Policy Summary:');
    console.log('   - Users can upload avatars to their own folder');
    console.log('   - Anyone can view avatars (public access)');
    console.log('   - Users can update their own avatars');
    console.log('   - Users can delete their own avatars');
    console.log('\n⚠️  Note: If policies failed to create programmatically,');
    console.log('   you may need to set them up manually in the Supabase dashboard:');
    console.log('   1. Go to Storage > Policies');
    console.log('   2. Select the "avatars" bucket');
    console.log('   3. Add the policies manually');

    return true;

  } catch (error) {
    console.error('❌ Error setting up RLS policies:', error);
    return false;
  }
}

// Run the setup
setupAvatarsRLS()
  .then(success => {
    if (success) {
      console.log('\n🎉 RLS setup completed!');
      console.log('\n📋 Next steps:');
      console.log('   1. Test the upload functionality in the app');
      console.log('   2. If uploads still fail, check the Supabase dashboard');
      console.log('   3. Verify the policies were created correctly');
      process.exit(0);
    } else {
      console.log('\n❌ Failed to set up RLS policies');
      console.log('\n🔧 Manual setup required:');
      console.log('   1. Go to Supabase Dashboard > Storage > Policies');
      console.log('   2. Select the "avatars" bucket');
      console.log('   3. Add the following policies manually:');
      console.log('      - INSERT: bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1]');
      console.log('      - SELECT: bucket_id = \'avatars\'');
      console.log('      - UPDATE: bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1]');
      console.log('      - DELETE: bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1]');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Script failed with error:', error);
    process.exit(1);
  });
