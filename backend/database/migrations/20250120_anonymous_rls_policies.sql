-- Migration: Anonymous User RLS Policies
-- Date: 2025-01-20
-- Description: Implement Row Level Security policies for anonymous users

-- Enable RLS on all tables that need protection
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is anonymous
CREATE OR REPLACE FUNCTION is_anonymous_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in auth.users and has is_anonymous flag
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = user_id 
    AND raw_user_meta_data->>'is_anonymous' = 'true'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restaurants RLS Policies
-- Anonymous users can only read active restaurants
CREATE POLICY "restaurants_anonymous_read" ON restaurants
  FOR SELECT
  TO authenticated
  USING (
    NOT is_anonymous_user(get_current_user_id()) OR 
    (status = 'active' AND is_public = true)
  );

-- Only non-anonymous users can create/update/delete restaurants
CREATE POLICY "restaurants_authenticated_write" ON restaurants
  FOR ALL
  TO authenticated
  USING (NOT is_anonymous_user(get_current_user_id()))
  WITH CHECK (NOT is_anonymous_user(get_current_user_id()));

-- Reviews RLS Policies
-- Anonymous users can only read approved reviews
CREATE POLICY "reviews_anonymous_read" ON reviews
  FOR SELECT
  TO authenticated
  USING (
    NOT is_anonymous_user(get_current_user_id()) OR 
    status = 'approved'
  );

-- Only non-anonymous users can create/update/delete reviews
CREATE POLICY "reviews_authenticated_write" ON reviews
  FOR ALL
  TO authenticated
  USING (NOT is_anonymous_user(get_current_user_id()))
  WITH CHECK (NOT is_anonymous_user(get_current_user_id()));

-- Favorites RLS Policies
-- Users can only see their own favorites
CREATE POLICY "favorites_user_access" ON favorites
  FOR ALL
  TO authenticated
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- Anonymous users cannot access favorites at all
CREATE POLICY "favorites_anonymous_deny" ON favorites
  FOR ALL
  TO authenticated
  USING (NOT is_anonymous_user(get_current_user_id()))
  WITH CHECK (NOT is_anonymous_user(get_current_user_id()));

-- Marketplace Items RLS Policies
-- Anonymous users can only read active marketplace items
CREATE POLICY "marketplace_anonymous_read" ON marketplace_items
  FOR SELECT
  TO authenticated
  USING (
    NOT is_anonymous_user(get_current_user_id()) OR 
    (status = 'active' AND is_public = true)
  );

-- Only non-anonymous users can create/update/delete marketplace items
CREATE POLICY "marketplace_authenticated_write" ON marketplace_items
  FOR ALL
  TO authenticated
  USING (NOT is_anonymous_user(get_current_user_id()))
  WITH CHECK (NOT is_anonymous_user(get_current_user_id()));

-- User Profiles RLS Policies
-- Users can only see their own profile
CREATE POLICY "user_profiles_own_access" ON user_profiles
  FOR ALL
  TO authenticated
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- Anonymous users cannot access user profiles
CREATE POLICY "user_profiles_anonymous_deny" ON user_profiles
  FOR ALL
  TO authenticated
  USING (NOT is_anonymous_user(get_current_user_id()))
  WITH CHECK (NOT is_anonymous_user(get_current_user_id()));

-- Notifications RLS Policies
-- Users can only see their own notifications
CREATE POLICY "notifications_user_access" ON notifications
  FOR ALL
  TO authenticated
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- Anonymous users cannot access notifications
CREATE POLICY "notifications_anonymous_deny" ON notifications
  FOR ALL
  TO authenticated
  USING (NOT is_anonymous_user(get_current_user_id()))
  WITH CHECK (NOT is_anonymous_user(get_current_user_id()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurants_status_public ON restaurants(status, is_public) WHERE status = 'active' AND is_public = true;
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_marketplace_status_public ON marketplace_items(status, is_public) WHERE status = 'active' AND is_public = true;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_anonymous_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION is_anonymous_user(UUID) IS 'Check if a user is anonymous based on their metadata';
COMMENT ON FUNCTION get_current_user_id() IS 'Get the current authenticated user ID';
