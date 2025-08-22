-- FORCE RLS enablement and comprehensive storage policies
-- This file contains Row Level Security policies for the JewGo application
-- Ensures data security and prevents unauthorized access

-- Enable RLS on all app data tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants FORCE ROW LEVEL SECURITY;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites FORCE ROW LEVEL SECURITY;

ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items FORCE ROW LEVEL SECURITY;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- Note: Telemetry tables (analytics_events, user_sessions) are excluded from RLS
-- to prevent ingestion breakage and maintain analytics functionality

-- Comprehensive moderated public read policies
-- Only active, approved, and non-flagged content is publicly readable

-- Restaurants public read policy with moderation filters
CREATE POLICY "restaurants_public_read" ON restaurants
FOR SELECT TO anon, authenticated
USING (
  status = 'active' 
  AND is_published = true 
  AND is_approved = true 
  AND NOT is_flagged
);

-- Reviews public read policy with moderation filters
CREATE POLICY "reviews_public_read" ON reviews
FOR SELECT TO anon, authenticated
USING (
  status = 'approved' 
  AND is_published = true 
  AND NOT is_flagged
);

-- Marketplace items public read policy with moderation filters
CREATE POLICY "marketplace_items_public_read" ON marketplace_items
FOR SELECT TO anon, authenticated
USING (
  status = 'active' 
  AND is_published = true 
  AND is_approved = true 
  AND NOT is_flagged
);

-- Create public user profiles view with limited information
CREATE OR REPLACE VIEW public_user_profiles AS
SELECT 
  user_id,
  display_name,
  avatar_url,
  bio,
  created_at,
  updated_at
FROM user_profiles
WHERE true; -- All profiles are publicly readable through this view

-- User profiles public read policy - use the view instead of direct table access
CREATE POLICY "user_profiles_public_read" ON user_profiles
FOR SELECT TO anon, authenticated
USING (
  -- Only allow reading through the public view
  -- This prevents direct access to sensitive columns
  false -- Disable direct table access for public read
);

-- Grant access to the public view
GRANT SELECT ON public_user_profiles TO anon, authenticated;

-- Complete CRUD policies with ownership and non-anonymous checks

-- Restaurants CRUD policies
CREATE POLICY "restaurants_owner_insert" ON restaurants
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "restaurants_owner_update" ON restaurants
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "restaurants_owner_delete" ON restaurants
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- Reviews CRUD policies
CREATE POLICY "reviews_owner_insert" ON reviews
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "reviews_owner_update" ON reviews
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "reviews_owner_delete" ON reviews
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- Favorites CRUD policies
CREATE POLICY "favorites_owner_insert" ON favorites
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "favorites_owner_read" ON favorites
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "favorites_owner_update" ON favorites
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "favorites_owner_delete" ON favorites
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- Marketplace items CRUD policies
CREATE POLICY "marketplace_items_owner_insert" ON marketplace_items
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = seller_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "marketplace_items_owner_update" ON marketplace_items
FOR UPDATE TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (
  auth.uid() = seller_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "marketplace_items_owner_delete" ON marketplace_items
FOR DELETE TO authenticated
USING (
  auth.uid() = seller_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- User profiles CRUD policies
CREATE POLICY "user_profiles_owner_insert" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "user_profiles_owner_read" ON user_profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_owner_update" ON user_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "user_profiles_owner_delete" ON user_profiles
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- Notifications CRUD policies
CREATE POLICY "notifications_owner_insert" ON notifications
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "notifications_owner_read" ON notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "notifications_owner_update" ON notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "notifications_owner_delete" ON notifications
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id 
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- Supabase Storage bucket policies
-- Mirror public read moderation filters for file access
-- Note: Uses built-in Supabase storage.foldername() function for path parsing

-- Public images bucket policy with moderation filters
-- Uses storage.foldername() to map object keys to restaurant records
CREATE POLICY "public_images_read" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'public-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM restaurants 
    WHERE status = 'active' 
      AND is_published = true 
      AND is_approved = true 
      AND NOT is_flagged
  )
  -- Additional validation to ensure folder structure matches expected pattern
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- User avatars bucket policy (no moderation needed for user avatars)
-- Uses storage.foldername() to map object keys to user records
CREATE POLICY "user_avatars_read" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'user-avatars' 
  AND (storage.foldername(name))[1] IN (
    SELECT user_id::text 
    FROM user_profiles 
    WHERE true -- Allow all user avatars to be readable
  )
  -- Additional validation to ensure folder structure matches expected pattern
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- User avatars upload policy
CREATE POLICY "user_avatars_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- User avatars update policy
CREATE POLICY "user_avatars_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- User avatars delete policy
CREATE POLICY "user_avatars_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- Collision-safe patterns and comprehensive comments
-- These policies ensure data security and prevent unauthorized access
-- Anonymous users are blocked from all write operations
-- Public read access is limited to active, approved, and non-flagged content
-- Storage access is controlled and mirrors database moderation filters
