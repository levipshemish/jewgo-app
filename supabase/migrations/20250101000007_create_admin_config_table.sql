-- Create admin_config table for system configuration management
CREATE TABLE IF NOT EXISTS public.admin_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON public.admin_config(key);

-- Add audit logging for config changes
CREATE OR REPLACE FUNCTION log_admin_config_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log config updates
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
            NEW.updated_by,
            'CONFIG_CHANGE',
            'admin_config',
            NEW.key,
            NULL,
            jsonb_build_object(
                'key', NEW.key,
                'value', NEW.value,
                'updated_by', NEW.updated_by,
                'updated_at', NEW.updated_at
            ),
            'info',
            jsonb_build_object('operation', 'create_config')
        );
        RETURN NEW;
    END IF;
    
    -- Log config updates
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
            COALESCE(NEW.updated_by, OLD.updated_by),
            'CONFIG_CHANGE',
            'admin_config',
            NEW.key,
            jsonb_build_object(
                'key', OLD.key,
                'value', OLD.value,
                'updated_by', OLD.updated_by,
                'updated_at', OLD.updated_at
            ),
            jsonb_build_object(
                'key', NEW.key,
                'value', NEW.value,
                'updated_by', NEW.updated_by,
                'updated_at', NEW.updated_at
            ),
            'info',
            jsonb_build_object('operation', 'update_config')
        );
        RETURN NEW;
    END IF;
    
    -- Log config deletion
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
            OLD.updated_by,
            'CONFIG_CHANGE',
            'admin_config',
            OLD.key,
            jsonb_build_object(
                'key', OLD.key,
                'value', OLD.value,
                'updated_by', OLD.updated_by,
                'updated_at', OLD.updated_at
            ),
            NULL,
            'warning',
            jsonb_build_object('operation', 'delete_config')
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin config changes
CREATE TRIGGER trigger_admin_config_change
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_config
    FOR EACH ROW EXECUTE FUNCTION log_admin_config_change();

-- Add RLS policies for admin_config table
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can view config
CREATE POLICY "Super admins can view config" ON public.admin_config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND issuperadmin = true
        )
    );

-- Policy: Only super admins can manage config
CREATE POLICY "Super admins can manage config" ON public.admin_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND issuperadmin = true
        )
    );

-- Function to get system configuration with defaults
CREATE OR REPLACE FUNCTION get_system_config()
RETURNS JSONB AS $$
DECLARE
    config JSONB;
    defaults JSONB;
BEGIN
    -- Default configuration values
    defaults := '{
        "maintenanceMode": false,
        "debugMode": false,
        "emailNotifications": true,
        "auditLogging": true,
        "rateLimiting": true,
        "backupFrequency": "daily",
        "sessionTimeout": 60,
        "maxFileSize": 5
    }'::jsonb;
    
    -- Get all config values from database
    SELECT jsonb_object_agg(key, value) INTO config
    FROM public.admin_config;
    
    -- Merge with defaults (database values override defaults)
    RETURN defaults || COALESCE(config, '{}'::jsonb);
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
