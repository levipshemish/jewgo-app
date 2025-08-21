-- Function to merge anonymous user data to authenticated user
-- This function handles the secure transfer of data from anonymous to authenticated users
-- Uses ON CONFLICT DO NOTHING to handle potential duplicates gracefully

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
  v_moved_data JSONB := '{}'::JSONB;
  v_favorites_count INTEGER := 0;
  v_reviews_count INTEGER := 0;
  v_marketplace_count INTEGER := 0;
  v_preferences_count INTEGER := 0;
  v_notifications_count INTEGER := 0;
BEGIN
  -- Validate input parameters
  IF p_anon_uid IS NULL OR p_auth_uid IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters: anon_uid, auth_uid, and correlation_id are required';
  END IF;
  
  -- Ensure we're not trying to merge the same user
  IF p_anon_uid = p_auth_uid THEN
    RAISE EXCEPTION 'Cannot merge user with itself';
  END IF;
  
  -- Start transaction
  BEGIN
    -- Move favorites
    WITH moved_favorites AS (
      UPDATE favorites 
      SET user_id = p_auth_uid,
          updated_at = NOW()
      WHERE user_id = p_anon_uid
      RETURNING id
    )
    SELECT COUNT(*) INTO v_favorites_count FROM moved_favorites;
    
    -- Move reviews (using ON CONFLICT DO NOTHING to handle duplicates)
    WITH moved_reviews AS (
      INSERT INTO reviews (
        user_id, restaurant_id, rating, review_text, 
        created_at, updated_at, status, is_published, is_approved, is_flagged
      )
      SELECT 
        p_auth_uid, restaurant_id, rating, review_text,
        created_at, NOW(), status, is_published, is_approved, is_flagged
      FROM reviews 
      WHERE user_id = p_anon_uid
      ON CONFLICT (user_id, restaurant_id) DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*) INTO v_reviews_count FROM moved_reviews;
    
    -- Delete original reviews after successful insertion
    DELETE FROM reviews WHERE user_id = p_anon_uid;
    
    -- Move marketplace items
    WITH moved_marketplace AS (
      UPDATE marketplace_items 
      SET seller_id = p_auth_uid,
          updated_at = NOW()
      WHERE seller_id = p_anon_uid
      RETURNING id
    )
    SELECT COUNT(*) INTO v_marketplace_count FROM moved_marketplace;
    
    -- Move user preferences (using ON CONFLICT DO NOTHING)
    WITH moved_preferences AS (
      INSERT INTO user_preferences (
        user_id, preferences, created_at, updated_at
      )
      SELECT 
        p_auth_uid, preferences, created_at, NOW()
      FROM user_preferences 
      WHERE user_id = p_anon_uid
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*) INTO v_preferences_count FROM moved_preferences;
    
    -- Delete original preferences after successful insertion
    DELETE FROM user_preferences WHERE user_id = p_anon_uid;
    
    -- Move notifications
    WITH moved_notifications AS (
      UPDATE notifications 
      SET user_id = p_auth_uid,
          updated_at = NOW()
      WHERE user_id = p_anon_uid
      RETURNING id
    )
    SELECT COUNT(*) INTO v_notifications_count FROM moved_notifications;
    
    -- Build result object
    v_moved_data := jsonb_build_object(
      'favorites', v_favorites_count,
      'reviews', v_reviews_count,
      'marketplace_items', v_marketplace_count,
      'user_preferences', v_preferences_count,
      'notifications', v_notifications_count,
      'correlation_id', p_correlation_id,
      'merged_at', NOW()
    );
    
    -- Log the merge operation
    INSERT INTO merge_logs (
      correlation_id,
      anon_uid,
      auth_uid,
      moved_data,
      status,
      created_at
    ) VALUES (
      p_correlation_id,
      p_anon_uid,
      p_auth_uid,
      v_moved_data,
      'completed',
      NOW()
    );
    
    RETURN v_moved_data;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error
      INSERT INTO merge_logs (
        correlation_id,
        anon_uid,
        auth_uid,
        moved_data,
        status,
        error_message,
        created_at
      ) VALUES (
        p_correlation_id,
        p_anon_uid,
        p_auth_uid,
        v_moved_data,
        'failed',
        SQLERRM,
        NOW()
      );
      
      -- Re-raise the error
      RAISE;
  END;
END;
$$;

-- Create merge_jobs table for idempotency
CREATE TABLE IF NOT EXISTS merge_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT UNIQUE NOT NULL,
  anon_uid UUID NOT NULL,
  auth_uid UUID NOT NULL,
  moved_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT merge_jobs_status_check CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Create merge_logs table for audit trail
CREATE TABLE IF NOT EXISTS merge_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL,
  anon_uid UUID NOT NULL,
  auth_uid UUID NOT NULL,
  moved_data JSONB,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_merge_jobs_correlation_id ON merge_jobs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_merge_jobs_status ON merge_jobs(status);
CREATE INDEX IF NOT EXISTS idx_merge_logs_correlation_id ON merge_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_merge_logs_created_at ON merge_logs(created_at);

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION merge_anonymous_user_data(UUID, UUID, TEXT) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON merge_jobs TO authenticated;
GRANT SELECT, INSERT ON merge_logs TO authenticated;
