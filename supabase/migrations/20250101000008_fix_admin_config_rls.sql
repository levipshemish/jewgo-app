-- Fix RLS policies for admin_config table to work without auth schema
-- This migration updates the policies to work with regular PostgreSQL

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can view config" ON public.admin_config;
DROP POLICY IF EXISTS "Super admins can manage config" ON public.admin_config;

-- Create simplified policies that work without auth schema
-- Note: In a regular PostgreSQL setup, we'll rely on application-level authentication
-- rather than database-level RLS policies

-- Policy: Allow all operations (application will handle auth)
CREATE POLICY "Allow all operations" ON public.admin_config
    FOR ALL USING (true);

-- Alternative: If you want to restrict access, you can use a more specific policy
-- CREATE POLICY "Restrict config access" ON public.admin_config
--     FOR ALL USING (
--         EXISTS (
--             SELECT 1 FROM public.users 
--             WHERE id = current_setting('app.current_user_id', true)::text 
--             AND issuperadmin = true
--         )
--     );

-- Add a function to set current user context (for use with RLS)
CREATE OR REPLACE FUNCTION set_current_user_id(user_id text)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id, false);
END;
$$ LANGUAGE plpgsql;

-- Update the update_system_config function to work without auth schema
CREATE OR REPLACE FUNCTION update_system_config(
    config_key VARCHAR(100),
    config_value JSONB,
    updated_by_param VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if updater is super admin (simplified check)
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = updated_by_param 
        AND issuperadmin = true
    ) THEN
        RAISE EXCEPTION 'Only super admins can update system configuration';
    END IF;
    
    -- Validate allowed config keys
    IF config_key NOT IN (
        'maintenanceMode', 'debugMode', 'emailNotifications', 
        'auditLogging', 'rateLimiting', 'backupFrequency', 
        'sessionTimeout', 'maxFileSize'
    ) THEN
        RAISE EXCEPTION 'Invalid configuration key: %', config_key;
    END IF;
    
    -- Insert or update config
    INSERT INTO public.admin_config (
        key,
        value,
        updated_by
    ) VALUES (
        config_key,
        config_value,
        updated_by_param
    )
    ON CONFLICT (key)
    DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
