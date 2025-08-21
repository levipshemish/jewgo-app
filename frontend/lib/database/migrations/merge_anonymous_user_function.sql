-- Transactional merge function for anonymous user data
-- This function handles all table migrations atomically with proper conflict resolution

CREATE OR REPLACE FUNCTION merge_anonymous_user_data(
  source_user_id UUID,
  target_user_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  result TEXT[] := '{}';
  table_name TEXT;
  owner_column TEXT;
  existing_count INTEGER;
  conflict_count INTEGER;
  moved_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Validate input parameters
  IF source_user_id IS NULL OR target_user_id IS NULL THEN
    RAISE EXCEPTION 'Source and target user IDs cannot be null';
  END IF;
  
  IF source_user_id = target_user_id THEN
    RAISE EXCEPTION 'Source and target user IDs cannot be the same';
  END IF;
  
  -- Define table mappings
  CREATE TEMP TABLE table_mappings (
    table_name TEXT,
    owner_column TEXT
  ) ON COMMIT DROP;
  
  INSERT INTO table_mappings VALUES
    ('restaurants', 'user_id'),
    ('reviews', 'user_id'),
    ('favorites', 'user_id'),
    ('marketplace_items', 'seller_id'),
    ('user_profiles', 'user_id'),
    ('notifications', 'user_id');
  
  -- Process each table in a transaction
  FOR table_name, owner_column IN 
    SELECT tm.table_name, tm.owner_column 
    FROM table_mappings tm
  LOOP
    -- Check if source user has records in this table
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I = $1', table_name, owner_column)
    INTO existing_count
    USING source_user_id;
    
    IF existing_count > 0 THEN
      -- Check for conflicts with target user
      EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I = $1', table_name, owner_column)
      INTO conflict_count
      USING target_user_id;
      
      IF conflict_count > 0 THEN
        -- Conflicts exist - remove source records (deterministic: source loses)
        EXECUTE format('DELETE FROM %I WHERE %I = $1', table_name, owner_column)
        USING source_user_id;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        result := result || format('%s:%s(deleted)', table_name, deleted_count);
      ELSE
        -- No conflicts - perform safe update
        EXECUTE format('UPDATE %I SET %I = $1 WHERE %I = $2', table_name, owner_column, owner_column)
        USING target_user_id, source_user_id;
        
        GET DIAGNOSTICS moved_count = ROW_COUNT;
        result := result || format('%s:%s', table_name, moved_count);
      END IF;
    END IF;
  END LOOP;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback the entire transaction on any error
    RAISE EXCEPTION 'Merge operation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION merge_anonymous_user_data(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION merge_anonymous_user_data(UUID, UUID) IS 
'Atomically merges all data from an anonymous user to a target user. 
Handles conflicts by removing source records when conflicts exist.
Returns an array of strings describing the operations performed.';
