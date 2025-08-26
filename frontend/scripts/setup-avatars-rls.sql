-- =====================================================
-- Supabase Storage RLS Policies for Avatars Bucket
-- Run this script in the Supabase SQL Editor
-- =====================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on storage.buckets if not already enabled
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Bucket-Level Policies (for listing buckets)
-- =====================================================

-- Allow authenticated users to list buckets
CREATE POLICY "Authenticated users can list buckets" ON storage.buckets
FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- Object-Level Policies (for file operations)
-- =====================================================

-- Policy 1: Allow anyone to view avatars (public access)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Policy 2: Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- Verification Queries (optional - run to check)
-- =====================================================

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename IN ('objects', 'buckets');

-- List all policies on storage.objects
SELECT 
    policyname,
    operation,
    definition
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- List all policies on storage.buckets
SELECT 
    policyname,
    operation,
    definition
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'buckets'
ORDER BY policyname;

-- =====================================================
-- Notes:
-- =====================================================
-- 1. This script creates policies that allow:
--    - Authenticated users to list buckets
--    - Anyone to view avatars (public access)
--    - Users to upload/update/delete only their own avatars
--
-- 2. The folder structure will be: {user_id}/filename
--    Example: e4e72162-c0c8-4490-8477-126982f82e95/avatar.png
--
-- 3. If you get "policy already exists" errors, that's fine - 
--    it means the policies were already created.
--
-- 4. After running this script, test the upload functionality
--    in your app to make sure it works correctly.
