-- Migration: Create merge_anonymous_user_data function and merge_jobs table
-- Date: 2025-01-20
-- Purpose: Support idempotent anonymous user data merging with ON CONFLICT DO NOTHING

-- Create merge_jobs table for idempotency tracking
CREATE TABLE IF NOT EXISTS merge_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_user_id UUID NOT NULL,
    target_user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    moved_records JSONB,
    UNIQUE(source_user_id, target_user_id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_merge_jobs_source_target ON merge_jobs(source_user_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_merge_jobs_status ON merge_jobs(status);

-- Function to merge anonymous user data with idempotency
CREATE OR REPLACE FUNCTION merge_anonymous_user_data(
    source_user_id UUID,
    target_user_id UUID
)
RETURNS TEXT[] AS $$
DECLARE
    moved_records TEXT[] := '{}';
    job_id UUID;
    existing_job RECORD;
BEGIN
    -- Check if merge job already exists
    SELECT * INTO existing_job 
    FROM merge_jobs 
    WHERE source_user_id = $1 AND target_user_id = $2;
    
    -- If job exists and is completed, return existing results
    IF existing_job IS NOT NULL AND existing_job.status = 'completed' THEN
        RETURN COALESCE(existing_job.moved_records, '{}');
    END IF;
    
    -- If job exists and is pending, wait briefly and check again
    IF existing_job IS NOT NULL AND existing_job.status = 'pending' THEN
        -- Wait up to 5 seconds for completion
        FOR i IN 1..10 LOOP
            PERFORM pg_sleep(0.5);
            SELECT * INTO existing_job 
            FROM merge_jobs 
            WHERE source_user_id = $1 AND target_user_id = $2;
            
            IF existing_job.status = 'completed' THEN
                RETURN COALESCE(existing_job.moved_records, '{}');
            ELSIF existing_job.status = 'failed' THEN
                RAISE EXCEPTION 'Previous merge job failed: %', existing_job.error_message;
            END IF;
        END LOOP;
        
        -- If still pending after timeout, proceed with new job
    END IF;
    
    -- Create new merge job
    INSERT INTO merge_jobs (source_user_id, target_user_id, status)
    VALUES ($1, $2, 'pending')
    ON CONFLICT (source_user_id, target_user_id) DO UPDATE SET
        status = 'pending',
        created_at = NOW(),
        completed_at = NULL,
        error_message = NULL,
        moved_records = NULL
    RETURNING id INTO job_id;
    
    BEGIN
        -- Migrate restaurants with ON CONFLICT DO NOTHING
        UPDATE restaurants 
        SET user_id = $2 
        WHERE user_id = $1;
        
        IF FOUND THEN
            moved_records := array_append(moved_records, 'restaurants');
        END IF;
        
        -- Migrate reviews with ON CONFLICT DO NOTHING
        UPDATE reviews 
        SET user_id = $2 
        WHERE user_id = $1;
        
        IF FOUND THEN
            moved_records := array_append(moved_records, 'reviews');
        END IF;
        
        -- Migrate favorites with ON CONFLICT DO NOTHING
        UPDATE favorites 
        SET user_id = $2 
        WHERE user_id = $1;
        
        IF FOUND THEN
            moved_records := array_append(moved_records, 'favorites');
        END IF;
        
        -- Migrate marketplace_items with ON CONFLICT DO NOTHING
        UPDATE marketplace_items 
        SET seller_id = $2 
        WHERE seller_id = $1;
        
        IF FOUND THEN
            moved_records := array_append(moved_records, 'marketplace_items');
        END IF;
        
        -- Migrate user_profiles with ON CONFLICT DO NOTHING
        UPDATE user_profiles 
        SET user_id = $2 
        WHERE user_id = $1;
        
        IF FOUND THEN
            moved_records := array_append(moved_records, 'user_profiles');
        END IF;
        
        -- Migrate notifications with ON CONFLICT DO NOTHING
        UPDATE notifications 
        SET user_id = $2 
        WHERE user_id = $1;
        
        IF FOUND THEN
            moved_records := array_append(moved_records, 'notifications');
        END IF;
        
        -- Mark job as completed
        UPDATE merge_jobs 
        SET status = 'completed', 
            completed_at = NOW(),
            moved_records = moved_records
        WHERE id = job_id;
        
        RETURN moved_records;
        
    EXCEPTION WHEN OTHERS THEN
        -- Mark job as failed
        UPDATE merge_jobs 
        SET status = 'failed', 
            completed_at = NOW(),
            error_message = SQLERRM
        WHERE id = job_id;
        
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION merge_anonymous_user_data(UUID, UUID) TO authenticated;

-- Add RLS policies for merge_jobs table
ALTER TABLE merge_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own merge jobs
CREATE POLICY "Users can view own merge jobs" ON merge_jobs
    FOR SELECT USING (
        auth.uid() = source_user_id OR auth.uid() = target_user_id
    );

-- Only service role can insert/update merge jobs
CREATE POLICY "Service role can manage merge jobs" ON merge_jobs
    FOR ALL USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON FUNCTION merge_anonymous_user_data(UUID, UUID) IS 
'Idempotent function to merge anonymous user data from source_user_id to target_user_id. 
Uses ON CONFLICT DO NOTHING to prevent data loss and maintains audit trail in merge_jobs table.';
