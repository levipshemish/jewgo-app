-- Create admin_roles table for RBAC management
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('moderator', 'data_admin', 'system_admin', 'super_admin')),
    assigned_by UUID REFERENCES auth.users(id),
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

-- Add audit logging for role changes
CREATE OR REPLACE FUNCTION log_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log role assignment
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            old_data,
            new_data,
            audit_level,
            metadata
        ) VALUES (
            NEW.assigned_by,
            'USER_ROLE_CHANGE',
            'admin_role',
            NEW.user_id,
            NULL,
            jsonb_build_object(
                'role', NEW.role,
                'assigned_by', NEW.assigned_by,
                'assigned_at', NEW.assigned_at,
                'expires_at', NEW.expires_at,
                'notes', NEW.notes
            ),
            'info',
            jsonb_build_object('operation', 'assign_role')
        );
        RETURN NEW;
    END IF;
    
    -- Log role updates
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            old_data,
            new_data,
            audit_level,
            metadata
        ) VALUES (
            COALESCE(NEW.assigned_by, OLD.assigned_by),
            'USER_ROLE_CHANGE',
            'admin_role',
            NEW.user_id,
            jsonb_build_object(
                'role', OLD.role,
                'is_active', OLD.is_active,
                'expires_at', OLD.expires_at,
                'notes', OLD.notes
            ),
            jsonb_build_object(
                'role', NEW.role,
                'is_active', NEW.is_active,
                'expires_at', NEW.expires_at,
                'notes', NEW.notes
            ),
            'info',
            jsonb_build_object('operation', 'update_role')
        );
        RETURN NEW;
    END IF;
    
    -- Log role removal
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            old_data,
            new_data,
            audit_level,
            metadata
        ) VALUES (
            OLD.assigned_by,
            'USER_ROLE_CHANGE',
            'admin_role',
            OLD.user_id,
            jsonb_build_object(
                'role', OLD.role,
                'assigned_by', OLD.assigned_by,
                'assigned_at', OLD.assigned_at,
                'expires_at', OLD.expires_at,
                'notes', OLD.notes
            ),
            NULL,
            'warning',
            jsonb_build_object('operation', 'remove_role')
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin role changes
CREATE TRIGGER trigger_admin_role_change
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_roles
    FOR EACH ROW EXECUTE FUNCTION log_admin_role_change();

-- Add RLS policies for admin_roles table
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own roles
CREATE POLICY "Users can view own admin roles" ON public.admin_roles
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Only super admins can manage admin roles
CREATE POLICY "Super admins can manage admin roles" ON public.admin_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid()::text 
            AND issuperadmin = true
        )
    );

-- Function to get user's active admin role
CREATE OR REPLACE FUNCTION get_user_admin_role(user_id_param UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    user_role VARCHAR(50);
BEGIN
    -- First check if user is super admin
    IF EXISTS (
        SELECT 1 FROM auth.users 
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

-- Function to remove admin role
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
