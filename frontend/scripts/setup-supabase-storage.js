#!/usr/bin/env node

/**
 * setup-supabase-storage
 * Wrap function with error handling
 * 
 * This script provides wrap function with error handling for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category setup
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage node setup-supabase-storage.js [options]
 * @options --help, --verbose, --config
 * 
 * @example
 * node setup-supabase-storage.js --verbose --config=production
 * 
 * @returns Exit code 0 for success, non-zero for errors
 * @throws Common error conditions and their meanings
 * 
 * @see Related scripts in the project
 * @see Links to relevant documentation
 */
function wrapWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapFunction(fn, context);
}

/**
 * Wrap synchronous function with error handling
 */
function wrapSyncWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapSyncFunction(fn, context);
}


async function setupSupabaseStorage() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    defaultLogger.error('❌ Missing required environment variables:');
    defaultLogger.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    defaultLogger.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    wrapSyncWithErrorHandling(() => process.exit)(1);
  }

  defaultLogger.info('🔗 Connecting to Supabase...');
  
  // Create Supabase client with service role key for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if avatars bucket already exists
    defaultLogger.info('📋 Checking if avatars bucket exists...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      defaultLogger.error('❌ Error listing buckets:', listError);
      return false;
    }

    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (avatarsBucket) {
      defaultLogger.info('✅ Avatars bucket already exists');
    } else {
      defaultLogger.info('📦 Creating avatars bucket...');
      
      // Create the avatars bucket
      const { data: bucket, error: createError } = await supabase.storage.createBucket('avatars', {
        public: true, // Allow public read access
        fileSizeLimit: 5242880, // 5MB limit
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });

      if (createError) {
        defaultLogger.error('❌ Error creating bucket:', createError);
        return false;
      }

      defaultLogger.info('✅ Avatars bucket created successfully');
    }

    // Set up RLS policies for the avatars bucket
    defaultLogger.info('🔒 Setting up RLS policies...');

    // Policy 1: Allow public read access to all avatars
    const { error: publicReadError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Public read access to avatars" ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars');
      `
    });

    if (publicReadError && !publicReadError.message.includes('already exists')) {
      defaultLogger.error('❌ Error creating public read policy:', publicReadError);
    } else {
      defaultLogger.info('✅ Public read policy created/verified');
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
      defaultLogger.error('❌ Error creating upload policy:', uploadError);
    } else {
      defaultLogger.info('✅ Upload policy created/verified');
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
      defaultLogger.error('❌ Error creating update policy:', updateError);
    } else {
      defaultLogger.info('✅ Update policy created/verified');
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
      defaultLogger.error('❌ Error creating delete policy:', deleteError);
    } else {
      defaultLogger.info('✅ Delete policy created/verified');
    }

    defaultLogger.info('\n🎉 Supabase Storage setup completed successfully!');
    defaultLogger.info('\n📋 Summary:');
    defaultLogger.info('   ✅ Avatars bucket: Ready');
    defaultLogger.info('   ✅ Public read access: Enabled');
    defaultLogger.info('   ✅ User upload access: Enabled (own folder)');
    defaultLogger.info('   ✅ User update access: Enabled (own files)');
    defaultLogger.info('   ✅ User delete access: Enabled (own files)');
    defaultLogger.info('\n🔗 Bucket URL: https://your-project.supabase.co/storage/v1/object/public/avatars/');
    
    return true;

  } catch (error) {
    defaultLogger.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the setup
setupSupabaseStorage()
  .then(success => {
    if (success) {
      defaultLogger.info('\n✅ Setup completed successfully!');
      wrapSyncWithErrorHandling(() => process.exit)(0);
    } else {
      defaultLogger.info('\n❌ Setup failed!');
      wrapSyncWithErrorHandling(() => process.exit)(1);
    }
  })
  .catch(error => {
    defaultLogger.error('❌ Setup failed with error:', error);
    wrapSyncWithErrorHandling(() => process.exit)(1);
  });
