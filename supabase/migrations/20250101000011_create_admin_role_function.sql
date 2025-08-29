-- Migration: Create secure admin role function with minimal-privilege ownership
-- Date: 2025-01-01
-- Description: Creates a secure database function for admin role queries with proper security boundaries

-- Create minimal-privilege role for function ownership
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_admin_ro') THEN
    CREATE ROLE role_admin_ro NOLOGIN;
  END IF;
END $$;

-- Grant only necessary permissions
GRANT SELECT ON public.admin_roles TO role_admin_ro;
GRANT USAGE ON SCHEMA public TO role_admin_ro;

-- Ensure role can access auth schema and auth.uid() function
GRANT USAGE ON SCHEMA auth TO role_admin_ro;
GRANT EXECUTE ON FUNCTION auth.uid() TO role_admin_ro;

-- Create the admin role function with proper ownership
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS TABLE (admin_role text, role_level int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.role,
         CASE ar.role
           WHEN 'super_admin' THEN 4
           WHEN 'system_admin' THEN 3
           WHEN 'data_admin' THEN 2
           WHEN 'moderator' THEN 1
           ELSE 0
         END AS role_level
  FROM public.admin_roles ar
  WHERE ar.user_id = auth.uid()
    AND ar.is_active = true
    AND (ar.expires_at IS NULL OR ar.expires_at > now())
  ORDER BY 2 DESC
  LIMIT 1;
$$;

-- Set function owner to minimal-privilege role
ALTER FUNCTION public.get_current_admin_role() OWNER TO role_admin_ro;

-- Revoke all permissions from public
REVOKE ALL ON FUNCTION public.get_current_admin_role() FROM PUBLIC;

-- Grant execute permission only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_admin_role() TO authenticated;

-- Create notification function for cache invalidation
CREATE OR REPLACE FUNCTION public.notify_admin_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify('admin_roles_changed', 
    COALESCE(NEW.user_id::text, OLD.user_id::text));
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Set minimal permissions for trigger function
ALTER FUNCTION public.notify_admin_role_change() OWNER TO role_admin_ro;
REVOKE ALL ON FUNCTION public.notify_admin_role_change() FROM PUBLIC;

-- Create trigger for cache invalidation
DROP TRIGGER IF EXISTS admin_role_change_notify ON public.admin_roles;
CREATE TRIGGER admin_role_change_notify
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_roles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_role_change();

-- Verify function ownership and permissions
-- This query should show:
-- proname: get_current_admin_role
-- owner: role_admin_ro
-- grantees: {authenticated}
SELECT 
  p.proname,
  r.rolname as owner,
  array_agg(DISTINCT pr.rolname) as grantees
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
LEFT JOIN pg_proc_acl pa ON p.oid = pa.oid
LEFT JOIN pg_roles pr ON pa.grantee = pr.oid
WHERE p.proname = 'get_current_admin_role'
GROUP BY p.proname, r.rolname;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_current_admin_role() IS 
'Returns the current user''s highest privilege admin role and level. 
Returns empty result set for users with no admin role.
Uses role hierarchy: moderator(1) < data_admin(2) < system_admin(3) < super_admin(4).
Owned by minimal-privilege role_admin_ro with only necessary permissions.';

COMMENT ON FUNCTION public.notify_admin_role_change() IS 
'Trigger function to notify cache invalidation when admin roles change.
Sends pg_notify with user_id for cache cleanup.';

-- Enable RLS and create policy for role_admin_ro
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_ro_select ON public.admin_roles;
CREATE POLICY admin_ro_select ON public.admin_roles FOR SELECT TO role_admin_ro USING (user_id = auth.uid());
