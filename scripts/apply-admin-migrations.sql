-- Apply Admin Migrations
-- This script creates the admin roles table and related functions

-- Create admin_roles table for RBAC management
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('moderator', 'data_admin', 'system_admin', 'super_admin')),
    assigned_by VARCHAR(50) REFERENCES public.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    -- Ensure one active role per user
    UNIQUE(user_id, role)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON public.admin_roles(is_active);

-- Function to get user's active admin role
CREATE OR REPLACE FUNCTION get_user_admin_role(user_id_param VARCHAR(50))
RETURNS VARCHAR(50) AS $$
DECLARE
    user_role VARCHAR(50);
BEGIN
    -- First check if user is super admin
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id_param 
        AND issuperadmin = true
    ) THEN
        RETURN 'super_admin';
    END IF;
    
    -- Then check admin_roles table for active role
    SELECT role INTO user_role
    FROM public.admin_roles
    WHERE user_id = user_id_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY 
        CASE role
            WHEN 'super_admin' THEN 4
            WHEN 'system_admin' THEN 3
            WHEN 'data_admin' THEN 2
            WHEN 'moderator' THEN 1
            ELSE 0
        END DESC
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign admin role
CREATE OR REPLACE FUNCTION assign_admin_role(
    target_user_id VARCHAR(50),
    role_param VARCHAR(50),
    assigned_by_param VARCHAR(50),
    expires_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if assigner is super admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = assigned_by_param 
        AND issuperadmin = true
    ) THEN
        RAISE EXCEPTION 'Only super admins can assign admin roles';
    END IF;
    
    -- Check if target user exists
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
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

-- Function to remove admin role
CREATE OR REPLACE FUNCTION remove_admin_role(
    target_user_id VARCHAR(50),
    role_param VARCHAR(50),
    removed_by_param VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if remover is super admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
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

-- Create admin_config table
CREATE TABLE IF NOT EXISTS public.admin_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(50) REFERENCES public.users(id)
);

-- Create index for admin_config
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON public.admin_config(key);

-- Function to get system configuration
CREATE OR REPLACE FUNCTION get_system_config()
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_object_agg(key, value)
        FROM public.admin_config
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update system configuration
CREATE OR REPLACE FUNCTION update_system_config(
    config_key VARCHAR(100),
    config_value JSONB,
    updated_by_param VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if updater is super admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = updated_by_param 
        AND issuperadmin = true
    ) THEN
        RAISE EXCEPTION 'Only super admins can update system configuration';
    END IF;
    
    -- Insert or update config
    INSERT INTO public.admin_config (
        key,
        value,
        updated_at,
        updated_by
    ) VALUES (
        config_key,
        config_value,
        NOW(),
        updated_by_param
    )
    ON CONFLICT (key)
    DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW(),
        updated_by = updated_by_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
