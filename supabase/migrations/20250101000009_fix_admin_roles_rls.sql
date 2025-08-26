-- Enable RLS on admin_roles table and add policies
-- This migration sets up RLS for admin_roles table

-- Enable RLS on admin_roles table
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can manage admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Allow all operations" ON public.admin_roles;

-- Create policies for Supabase auth
-- Policy: Users can only see their own roles
CREATE POLICY "Users can view own admin roles" ON public.admin_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only super admins can manage admin roles
CREATE POLICY "Super admins can manage admin roles" ON public.admin_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND issuperadmin = true
        )
    );

-- Update the assign_admin_role function to work with UUID
CREATE OR REPLACE FUNCTION assign_admin_role(
    target_user_id UUID,
    role_param VARCHAR(50),
    assigned_by_param UUID,
    expires_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if assigner is super admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = assigned_by_param 
        AND issuperadmin = true
    ) THEN
        RAISE EXCEPTION 'Only super admins can assign admin roles';
    END IF;
    
    -- Check if target user exists
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = target_user_id
    ) THEN
        RAISE EXCEPTION 'Target user does not exist';
    END IF;
    
    -- Insert or update admin role
    INSERT INTO public.admin_roles (
        user_id,
        role,
        assigned_by,
        expires_at,
        notes
    ) VALUES (
        target_user_id,
        role_param,
        assigned_by_param,
        expires_at_param,
        notes_param
    )
    ON CONFLICT (user_id, role)
    DO UPDATE SET
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = NOW(),
        expires_at = EXCLUDED.expires_at,
        notes = EXCLUDED.notes,
        is_active = true;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the remove_admin_role function to work with UUID
CREATE OR REPLACE FUNCTION remove_admin_role(
    target_user_id UUID,
    role_param VARCHAR(50),
    removed_by_param UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if remover is super admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = removed_by_param 
        AND issuperadmin = true
    ) THEN
        RAISE EXCEPTION 'Only super admins can remove admin roles';
    END IF;
    
    -- Soft delete the role
    UPDATE public.admin_roles
    SET is_active = false
    WHERE user_id = target_user_id
    AND role = role_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
