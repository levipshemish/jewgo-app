-- Create merge_jobs table for tracking anonymous user merges
-- This table ensures idempotency and provides audit trail for merge operations

-- Create merge_jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS merge_jobs (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT UNIQUE NOT NULL,
  anon_uid UUID NOT NULL,
  auth_uid UUID NOT NULL,
  moved_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Indexes for performance
  CONSTRAINT merge_jobs_correlation_id_unique UNIQUE (correlation_id),
  CONSTRAINT merge_jobs_anon_uid_not_null CHECK (anon_uid IS NOT NULL),
  CONSTRAINT merge_jobs_auth_uid_not_null CHECK (auth_uid IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_merge_jobs_correlation_id ON merge_jobs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_merge_jobs_anon_uid ON merge_jobs(anon_uid);
CREATE INDEX IF NOT EXISTS idx_merge_jobs_auth_uid ON merge_jobs(auth_uid);
CREATE INDEX IF NOT EXISTS idx_merge_jobs_status ON merge_jobs(status);
CREATE INDEX IF NOT EXISTS idx_merge_jobs_created_at ON merge_jobs(created_at);

-- Add RLS policies if RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'merge_jobs' 
    AND table_schema = 'public'
  ) THEN
    -- Enable RLS
    ALTER TABLE merge_jobs ENABLE ROW LEVEL SECURITY;
    
    -- Policy: Only service role can access merge_jobs
    DROP POLICY IF EXISTS merge_jobs_service_role_policy ON merge_jobs;
    CREATE POLICY merge_jobs_service_role_policy ON merge_jobs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
      
    -- Policy: No access for authenticated users (this is internal data)
    DROP POLICY IF EXISTS merge_jobs_authenticated_policy ON merge_jobs;
    CREATE POLICY merge_jobs_authenticated_policy ON merge_jobs
      FOR ALL
      TO authenticated
      USING (false)
      WITH CHECK (false);
      
    -- Policy: No access for anon users
    DROP POLICY IF EXISTS merge_jobs_anon_policy ON merge_jobs;
    CREATE POLICY merge_jobs_anon_policy ON merge_jobs
      FOR ALL
      TO anon
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;
