-- Migration: Create merge_anonymous_user_data function
-- This function safely merges data from an anonymous user to a target user
-- It handles all tables with user ownership and prevents data loss

CREATE OR REPLACE FUNCTION merge_anonymous_user_data(
  source_user_id UUID,
  target_user_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  moved_records TEXT[] := ARRAY[]::TEXT[];
  record_count INTEGER;
BEGIN
  -- Validate inputs
  IF source_user_id IS NULL OR target_user_id IS NULL THEN
    RAISE EXCEPTION 'Both source_user_id and target_user_id must be provided';
  END IF;
  
  IF source_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot merge user with themselves';
  END IF;
  
  -- Ensure source user exists and is anonymous
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = source_user_id 
    AND (raw_user_meta_data->>'is_anonymous')::boolean = true
  ) THEN
    RAISE EXCEPTION 'Source user does not exist or is not anonymous';
  END IF;
  
  -- Ensure target user exists and is not anonymous
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = target_user_id 
    AND (raw_user_meta_data->>'is_anonymous')::boolean = false
  ) THEN
    RAISE EXCEPTION 'Target user does not exist or is anonymous';
  END IF;
  
  -- Merge restaurants
  UPDATE restaurants 
  SET user_id = target_user_id, 
      updated_at = NOW()
  WHERE user_id = source_user_id;
  
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    moved_records := array_append(moved_records, 'restaurants:' || record_count);
  END IF;
  
  -- Merge reviews
  UPDATE reviews 
  SET user_id = target_user_id, 
      updated_at = NOW()
  WHERE user_id = source_user_id;
  
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    moved_records := array_append(moved_records, 'reviews:' || record_count);
  END IF;
  
  -- Merge favorites
  UPDATE favorites 
  SET user_id = target_user_id, 
      updated_at = NOW()
  WHERE user_id = source_user_id;
  
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    moved_records := array_append(moved_records, 'favorites:' || record_count);
  END IF;
  
  -- Merge marketplace items
  UPDATE marketplace_items 
  SET seller_id = target_user_id, 
      updated_at = NOW()
  WHERE seller_id = source_user_id;
  
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    moved_records := array_append(moved_records, 'marketplace_items:' || record_count);
  END IF;
  
  -- Merge user profiles (upsert to handle conflicts)
  INSERT INTO user_profiles (user_id, name, email, avatar_url, bio, is_public, status, created_at, updated_at)
  SELECT target_user_id, name, email, avatar_url, bio, is_public, status, NOW(), NOW()
  FROM user_profiles 
  WHERE user_id = source_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
    is_public = COALESCE(EXCLUDED.is_public, user_profiles.is_public),
    status = COALESCE(EXCLUDED.status, user_profiles.status),
    updated_at = NOW();
  
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    moved_records := array_append(moved_records, 'user_profiles:' || record_count);
  END IF;
  
  -- Merge notifications
  UPDATE notifications 
  SET user_id = target_user_id, 
      updated_at = NOW()
  WHERE user_id = source_user_id;
  
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    moved_records := array_append(moved_records, 'notifications:' || record_count);
  END IF;
  
  -- Delete the anonymous user profile after successful merge
  DELETE FROM user_profiles WHERE user_id = source_user_id;
  
  -- Note: We don't delete the auth.users record here as that should be handled
  -- by the application logic after confirming the merge was successful
  
  RETURN moved_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION merge_anonymous_user_data(UUID, UUID) TO authenticated;

-- Create index for efficient user lookups during merge
CREATE INDEX IF NOT EXISTS idx_merge_user_lookup ON auth.users(id) 
WHERE (raw_user_meta_data->>'is_anonymous')::boolean = true;

-- Add comment for documentation
COMMENT ON FUNCTION merge_anonymous_user_data(UUID, UUID) IS 
'Merge data from anonymous user to target user. Returns array of moved record counts by table.';
