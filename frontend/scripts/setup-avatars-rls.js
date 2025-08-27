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

async function setupAvatarsRLS() {
  try {

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

    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {

    }

    // Create policies
    const policies = [
      { name: 'Upload Policy', sql: uploadPolicy },
      { name: 'Select Policy', sql: selectPolicy },
      { name: 'Update Policy', sql: updatePolicy },
      { name: 'Delete Policy', sql: deletePolicy }
    ];

    for (const policy of policies) {

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
        if (error) {

        } else {

        }
      } catch (err) {

      }
    }

    // Alternative: Try to create policies using direct SQL if exec_sql doesn't work

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

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
        if (error) {

        } else {

        }
      } catch (err) {

      }
    }


    console.log('   - Anyone can view avatars (public access)');







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





      process.exit(0);
    } else {





      console.log('      - INSERT: bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1]');

      console.log('      - UPDATE: bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1]');
      console.log('      - DELETE: bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1]');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Script failed with error:', error);
    process.exit(1);
  });
