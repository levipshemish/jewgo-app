-- Create merge_anonymous_user_data RPC function
-- This function handles the secure merging of anonymous user data to authenticated user

CREATE OR REPLACE FUNCTION merge_anonymous_user_data(
  p_anon_uid UUID,
  p_auth_uid UUID,
  p_correlation_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  moved_data JSONB := '{}';
  profile_record RECORD;
  favorite_record RECORD;
  review_record RECORD;
  search_history_record RECORD;
  favorites_count INTEGER;
  reviews_count INTEGER;
  search_history_count INTEGER;
BEGIN
  -- Validate inputs
  IF p_anon_uid IS NULL OR p_auth_uid IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION 'All parameters must be provided';
  END IF;
  
  -- Prevent self-merge
  IF p_anon_uid = p_auth_uid THEN
    RAISE EXCEPTION 'Cannot merge user with themselves';
  END IF;
  
  -- Check if merge job already exists (idempotency)
  IF EXISTS (SELECT 1 FROM merge_jobs WHERE correlation_id = p_correlation_id) THEN
    SELECT moved_data INTO moved_data FROM merge_jobs WHERE correlation_id = p_correlation_id;
    RETURN moved_data;
  END IF;
  
  -- Begin transaction for atomic merge
  BEGIN
    -- Move profile data (if exists)
    SELECT * INTO profile_record FROM profiles WHERE user_id = p_anon_uid;
    IF FOUND THEN
      INSERT INTO profiles (user_id, name, email, avatar_url, created_at, updated_at)
      VALUES (p_auth_uid, profile_record.name, profile_record.email, profile_record.avatar_url, profile_record.created_at, NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
      IF FOUND THEN
        moved_data := moved_data || jsonb_build_object('profile', true);
      END IF;
    END IF;
    
    -- Move favorites (if exist)
    INSERT INTO favorites (user_id, restaurant_id, created_at)
    SELECT p_auth_uid, restaurant_id, created_at
    FROM favorites
    WHERE user_id = p_anon_uid
    ON CONFLICT (user_id, restaurant_id) DO NOTHING;
    
    GET DIAGNOSTICS favorites_count = ROW_COUNT;
    IF favorites_count > 0 THEN
      moved_data := moved_data || jsonb_build_object('favorites', favorites_count);
    END IF;
    
    -- Move reviews (if exist)
    INSERT INTO reviews (user_id, restaurant_id, rating, comment, created_at, updated_at)
    SELECT p_auth_uid, restaurant_id, rating, comment, created_at, updated_at
    FROM reviews
    WHERE user_id = p_anon_uid
    ON CONFLICT (user_id, restaurant_id) DO NOTHING;
    
    GET DIAGNOSTICS reviews_count = ROW_COUNT;
    IF reviews_count > 0 THEN
      moved_data := moved_data || jsonb_build_object('reviews', reviews_count);
    END IF;
    
    -- Move search history (if exists)
    INSERT INTO search_history (user_id, query, created_at)
    SELECT p_auth_uid, query, created_at
    FROM search_history
    WHERE user_id = p_anon_uid
    ON CONFLICT (user_id, query) DO NOTHING;
    
    GET DIAGNOSTICS search_history_count = ROW_COUNT;
    IF search_history_count > 0 THEN
      moved_data := moved_data || jsonb_build_object('search_history', search_history_count);
    END IF;
    
    -- Record the merge job for idempotency
    INSERT INTO merge_jobs (correlation_id, anon_uid, auth_uid, moved_data, status, completed_at)
    VALUES (p_correlation_id, p_anon_uid, p_auth_uid, moved_data, 'completed', NOW())
    ON CONFLICT (correlation_id) DO NOTHING;
    
    -- Delete anonymous user data after successful merge
    -- Note: The anonymous user account itself is managed by Supabase Auth
    DELETE FROM profiles WHERE user_id = p_anon_uid;
    DELETE FROM favorites WHERE user_id = p_anon_uid;
    DELETE FROM reviews WHERE user_id = p_anon_uid;
    DELETE FROM search_history WHERE user_id = p_anon_uid;
    
    RETURN moved_data;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Record failed merge job
      INSERT INTO merge_jobs (correlation_id, anon_uid, auth_uid, status, error_message, completed_at)
      VALUES (p_correlation_id, p_anon_uid, p_auth_uid, 'failed', SQLERRM, NOW())
      ON CONFLICT (correlation_id) DO NOTHING;
      
      RAISE;
  END;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION merge_anonymous_user_data(UUID, UUID, TEXT) TO service_role;

-- Revoke execute permission from other roles for security
REVOKE EXECUTE ON FUNCTION merge_anonymous_user_data(UUID, UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION merge_anonymous_user_data(UUID, UUID, TEXT) FROM anon;
