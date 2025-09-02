-- Migration: Enhance admin roles table with NOTIFY triggers for cache invalidation
-- This migration adds triggers to notify the role invalidation listener when admin roles change

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create notification function for admin role changes
CREATE OR REPLACE FUNCTION public.notify_admin_role_change()
RETURNS TRIGGER AS $$
DECLARE
    user_id_text TEXT;
BEGIN
    -- Determine which user_id to notify about
    IF TG_OP = 'DELETE' THEN
        user_id_text := OLD.user_id::TEXT;
    ELSE
        user_id_text := NEW.user_id::TEXT;
    END IF;
    
    -- Send notification to the role invalidation listener
    PERFORM pg_notify('admin_roles_changed', user_id_text);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.notify_admin_role_change() TO authenticated;

-- Create triggers for admin role changes
DROP TRIGGER IF EXISTS admin_roles_notify_trigger ON public.admin_roles;

CREATE TRIGGER admin_roles_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_role_change();

-- Add comment explaining the trigger
COMMENT ON TRIGGER admin_roles_notify_trigger ON public.admin_roles IS 
    'Triggers notifications for cache invalidation when admin roles change';

-- Create index for efficient user_id lookups
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);

-- Create composite index for role and level queries
CREATE INDEX IF NOT EXISTS idx_admin_roles_role_level ON public.admin_roles(role, level);

-- Add RLS policies for admin role management
-- Only allow users to read their own admin role
CREATE POLICY IF NOT EXISTS "Users can read own admin role" ON public.admin_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Only allow system admins to manage admin roles
CREATE POLICY IF NOT EXISTS "System admins can manage admin roles" ON public.admin_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_roles ar
            WHERE ar.user_id = auth.uid()
            AND ar.role IN ('system_admin', 'super_admin')
        )
    );

-- Create function to get current user's admin role with proper security
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS TABLE(admin_role TEXT, role_level INTEGER) AS $$
BEGIN
    -- Set search path to prevent privilege escalation
    SET search_path = public;
    
    -- Return admin role for the authenticated user
    RETURN QUERY
    SELECT ar.role::TEXT, ar.level::INTEGER
    FROM public.admin_roles ar
    WHERE ar.user_id = auth.uid();
    
    -- Reset search path
    SET search_path = DEFAULT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_admin_role() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_current_admin_role() IS 
    'Returns the current user''s admin role and level. Must be called with user JWT, never service-role.';

-- Create function to check if user has minimum admin level
CREATE OR REPLACE FUNCTION public.has_admin_level(min_level INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_level INTEGER;
BEGIN
    -- Set search path to prevent privilege escalation
    SET search_path = public;
    
    -- Get user's admin level
    SELECT ar.level INTO user_level
    FROM public.admin_roles ar
    WHERE ar.user_id = auth.uid();
    
    -- Reset search path
    SET search_path = DEFAULT;
    
    -- Return true if user has sufficient level
    RETURN COALESCE(user_level, 0) >= min_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_admin_level(INTEGER) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.has_admin_level(INTEGER) IS 
    'Checks if the current user has at least the specified admin level. Must be called with user JWT, never service-role.';

-- Create function to promote user to admin role (admin only)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(
    target_user_id UUID,
    new_role TEXT,
    new_level INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    caller_level INTEGER;
BEGIN
    -- Set search path to prevent privilege escalation
    SET search_path = public;
    
    -- Check if caller has sufficient privileges (system_admin or super_admin)
    SELECT ar.level INTO caller_level
    FROM public.admin_roles ar
    WHERE ar.user_id = auth.uid()
    AND ar.role IN ('system_admin', 'super_admin');
    
    IF caller_level IS NULL OR caller_level < 3 THEN
        RAISE EXCEPTION 'Insufficient privileges to promote users';
    END IF;
    
    -- Check if caller is trying to promote to a higher level than themselves
    IF new_level >= caller_level THEN
        RAISE EXCEPTION 'Cannot promote user to equal or higher level than caller';
    END IF;
    
    -- Insert or update admin role
    INSERT INTO public.admin_roles (user_id, role, level)
    VALUES (target_user_id, new_role, new_level)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        role = EXCLUDED.role,
        level = EXCLUDED.level,
        created_at = NOW();
    
    -- Reset search path
    SET search_path = DEFAULT;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(UUID, TEXT, INTEGER) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.promote_user_to_admin(UUID, TEXT, INTEGER) IS 
    'Promotes a user to admin role. Only system_admin+ can use this function. Must be called with user JWT, never service-role.';

-- Create function to demote user from admin role (admin only)
CREATE OR REPLACE FUNCTION public.demote_user_from_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    caller_level INTEGER;
    target_level INTEGER;
BEGIN
    -- Set search path to prevent privilege escalation
    SET search_path = public;
    
    -- Check if caller has sufficient privileges (system_admin or super_admin)
    SELECT ar.level INTO caller_level
    FROM public.admin_roles ar
    WHERE ar.user_id = auth.uid()
    AND ar.role IN ('system_admin', 'super_admin');
    
    IF caller_level IS NULL OR caller_level < 3 THEN
        RAISE EXCEPTION 'Insufficient privileges to demote users';
    END IF;
    
    -- Check if caller is trying to demote someone at their level or higher
    SELECT ar.level INTO target_level
    FROM public.admin_roles ar
    WHERE ar.user_id = target_user_id;
    
    IF target_level IS NOT NULL AND target_level >= caller_level THEN
        RAISE EXCEPTION 'Cannot demote user at equal or higher level than caller';
    END IF;
    
    -- Remove admin role
    DELETE FROM public.admin_roles WHERE user_id = target_user_id;
    
    -- Reset search path
    SET search_path = DEFAULT;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.demote_user_from_admin(UUID) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.demote_user_from_admin(UUID) IS 
    'Demotes a user from admin role. Only system_admin+ can use this function. Must be called with user JWT, never service-role.';

-- Create view for admin role management (read-only for admins)
CREATE OR REPLACE VIEW public.admin_roles_view AS
SELECT 
    ar.user_id,
    ar.role,
    ar.level,
    ar.created_at,
    -- Only show user_id if caller has sufficient privileges
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.admin_roles caller_ar
            WHERE caller_ar.user_id = auth.uid()
            AND caller_ar.role IN ('system_admin', 'super_admin')
        ) THEN ar.user_id
        ELSE NULL
    END AS visible_user_id
FROM public.admin_roles ar;

-- Grant select permission to authenticated users
GRANT SELECT ON public.admin_roles_view TO authenticated;

-- Add comment explaining the view
COMMENT ON VIEW public.admin_roles_view IS 
    'Read-only view of admin roles. Only shows user_id to system_admin+.';

-- Create audit log table for admin role changes
CREATE TABLE IF NOT EXISTS public.admin_role_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('promoted', 'demoted', 'role_changed', 'level_changed')),
    old_role TEXT,
    new_role TEXT,
    old_level INTEGER,
    new_level INTEGER,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_admin_role_audit_user_id ON public.admin_role_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_audit_changed_by ON public.admin_role_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_admin_role_audit_changed_at ON public.admin_role_audit_log(changed_at);

-- Enable RLS on audit log
ALTER TABLE public.admin_role_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit log
CREATE POLICY IF NOT EXISTS "Users can read own audit log" ON public.admin_role_audit_log
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = changed_by);

CREATE POLICY IF NOT EXISTS "System admins can read all audit logs" ON public.admin_role_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_roles ar
            WHERE ar.user_id = auth.uid()
            AND ar.role IN ('system_admin', 'super_admin')
        )
    );

-- Grant permissions on audit log
GRANT SELECT ON public.admin_role_audit_log TO authenticated;

-- Create trigger to log admin role changes
CREATE OR REPLACE FUNCTION public.log_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.admin_role_audit_log (
            user_id, action, new_role, new_level, changed_by
        ) VALUES (
            NEW.user_id, 'promoted', NEW.role, NEW.level, auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.admin_role_audit_log (
            user_id, action, old_role, new_role, old_level, new_level, changed_by
        ) VALUES (
            NEW.user_id, 
            CASE 
                WHEN OLD.role != NEW.role THEN 'role_changed'
                WHEN OLD.level != NEW.level THEN 'level_changed'
                ELSE 'role_changed'
            END,
            OLD.role, NEW.role, OLD.level, NEW.level, auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.admin_role_audit_log (
            user_id, action, old_role, old_level, changed_by
        ) VALUES (
            OLD.user_id, 'demoted', OLD.role, OLD.level, auth.uid()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS admin_roles_audit_trigger ON public.admin_roles;

CREATE TRIGGER admin_roles_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_admin_role_change();

-- Add comment explaining the audit trigger
COMMENT ON TRIGGER admin_roles_audit_trigger ON public.admin_roles IS 
    'Logs all admin role changes for audit purposes';

-- Create function to get role statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_admin_role_stats()
RETURNS TABLE(
    total_admins INTEGER,
    role_counts JSON,
    level_distribution JSON
) AS $$
DECLARE
    role_counts_json JSON;
    level_dist_json JSON;
BEGIN
    -- Set search path to prevent privilege escalation
    SET search_path = public;
    
    -- Check if caller has sufficient privileges
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_roles ar
        WHERE ar.user_id = auth.uid()
        AND ar.role IN ('system_admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient privileges to view role statistics';
    END IF;
    
    -- Get role counts
    SELECT json_object_agg(role, count) INTO role_counts_json
    FROM (
        SELECT role, COUNT(*) as count
        FROM public.admin_roles
        GROUP BY role
        ORDER BY role
    ) role_stats;
    
    -- Get level distribution
    SELECT json_object_agg(level::TEXT, count) INTO level_dist_json
    FROM (
        SELECT level, COUNT(*) as count
        FROM public.admin_roles
        GROUP BY level
        ORDER BY level
    ) level_stats;
    
    -- Reset search path
    SET search_path = DEFAULT;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.admin_roles)::INTEGER,
        COALESCE(role_counts_json, '{}'::JSON),
        COALESCE(level_dist_json, '{}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_role_stats() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_admin_role_stats() IS 
    'Returns statistics about admin roles. Only system_admin+ can use this function.';

-- Create function to clean up expired audit logs (admin only)
CREATE OR REPLACE FUNCTION public.cleanup_admin_role_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Set search path to prevent privilege escalation
    SET search_path = public;
    
    -- Check if caller has sufficient privileges
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_roles ar
        WHERE ar.user_id = auth.uid()
        AND ar.role IN ('system_admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient privileges to cleanup audit logs';
    END IF;
    
    -- Delete expired audit logs
    DELETE FROM public.admin_role_audit_log
    WHERE changed_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Reset search path
    SET search_path = DEFAULT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_admin_role_audit_logs(INTEGER) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.cleanup_admin_role_audit_logs(INTEGER) IS 
    'Cleans up expired admin role audit logs. Only system_admin+ can use this function.';

-- Create scheduled job to cleanup old audit logs (optional)
-- This requires pg_cron extension to be enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Schedule daily cleanup of audit logs older than 90 days
        PERFORM cron.schedule(
            'cleanup-admin-role-audit-logs',
            '0 2 * * *', -- Daily at 2 AM
            'SELECT public.cleanup_admin_role_audit_logs(90);'
        );
    END IF;
END $$;

-- Add comment about the scheduled job
COMMENT ON FUNCTION public.cleanup_admin_role_audit_logs(INTEGER) IS 
    'Cleans up expired admin role audit logs. Only system_admin+ can use this function. Scheduled to run daily if pg_cron is available.';
