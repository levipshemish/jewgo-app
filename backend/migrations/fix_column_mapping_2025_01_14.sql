-- Migration: Fix Column Mapping Issues
-- Date: 2025-01-14
-- Description: Fix column mapping issues causing search API errors
-- 
-- Issues identified:
-- 1. Code expects 'supervision' but database has 'rabbinical_supervision'
-- 2. Code expects 'business_category' but database has 'store_category'
-- 3. Some columns exist but with different names than expected by the models

-- Start transaction
BEGIN;

-- Create a view or alias to map the expected column names to actual column names
-- This allows the existing code to work without changes

-- For mikvah table: Create a view that maps 'supervision' to 'rabbinical_supervision'
DO $$
BEGIN
    -- Drop view if it exists
    DROP VIEW IF EXISTS mikvah_search_view;
    
    -- Create view with expected column names
    CREATE VIEW mikvah_search_view AS
    SELECT 
        id,
        name,
        description,
        address,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        mikvah_type,
        rabbinical_supervision AS supervision,  -- Map rabbinical_supervision to supervision
        requires_appointment AS appointment_required,
        walk_in_available AS walk_ins_accepted,
        has_disabled_access AS accessibility,
        has_disabled_access AS wheelchair_accessible,
        has_changing_rooms AS private_changing_rooms,
        has_towels_provided AS towels_provided,
        has_soap_provided AS soap_provided,
        has_hair_dryers AS hair_dryer_available,
        business_hours AS hours_of_operation,
        business_hours AS hours_json,
        NULL AS special_hours,
        fee_amount AS cost,
        CASE 
            WHEN accepts_credit_cards THEN 'Credit Cards'
            WHEN accepts_cash THEN 'Cash'
            ELSE 'Cash'
        END AS payment_methods,
        NULL AS cancellation_policy,
        created_at,
        updated_at,
        NULL AS created_by,
        NULL AS updated_by,
        NULL AS deleted_at
    FROM mikvah
    WHERE is_active = true;
    
    RAISE NOTICE 'Created mikvah_search_view with column mapping';
END $$;

-- For stores table: Create a view that maps 'business_category' to 'store_category'
DO $$
BEGIN
    -- Drop view if it exists
    DROP VIEW IF EXISTS stores_search_view;
    
    -- Create view with expected column names
    CREATE VIEW stores_search_view AS
    SELECT 
        id,
        name,
        description,
        address,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        store_type,
        store_category AS business_category,  -- Map store_category to business_category
        kosher_certification,
        has_delivery AS delivery_available,
        has_pickup AS pickup_available,
        false AS online_ordering,  -- Default value
        false AS catering_available,  -- Default value
        false AS gift_wrapping,  -- Default value
        business_hours AS hours_of_operation,
        business_hours AS hours_json,
        NULL AS special_hours,
        CASE 
            WHEN accepts_credit_cards THEN 'Credit Cards'
            WHEN accepts_cash THEN 'Cash'
            ELSE 'Cash'
        END AS payment_methods,
        NULL AS return_policy,
        NULL AS shipping_policy,
        created_at,
        updated_at,
        NULL AS created_by,
        NULL AS updated_by,
        NULL AS deleted_at
    FROM stores
    WHERE is_active = true;
    
    RAISE NOTICE 'Created stores_search_view with column mapping';
END $$;

-- Grant permissions on the views
DO $$
BEGIN
    GRANT SELECT ON mikvah_search_view TO app_user;
    GRANT SELECT ON stores_search_view TO app_user;
    RAISE NOTICE 'Granted permissions on search views';
END $$;

-- Create indexes on the views (if needed)
-- Note: PostgreSQL doesn't support indexes on views directly, but we can create them on the underlying tables

-- Add any missing columns that are actually needed
DO $$
BEGIN
    -- Check if we need to add any columns that are missing from the models
    
    -- Add status column to mikvah if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        COMMENT ON COLUMN mikvah.status IS 'Status of the mikvah record';
        RAISE NOTICE 'Added status column to mikvah table';
    END IF;

    -- Add status column to stores if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE stores ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        COMMENT ON COLUMN stores.status IS 'Status of the store record';
        RAISE NOTICE 'Added status column to stores table';
    END IF;
END $$;

-- Update the views to include the status column
DO $$
BEGIN
    -- Drop and recreate mikvah view with status
    DROP VIEW IF EXISTS mikvah_search_view;
    CREATE VIEW mikvah_search_view AS
    SELECT 
        id,
        name,
        description,
        address,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        mikvah_type,
        rabbinical_supervision AS supervision,
        requires_appointment AS appointment_required,
        walk_in_available AS walk_ins_accepted,
        has_disabled_access AS accessibility,
        has_disabled_access AS wheelchair_accessible,
        has_changing_rooms AS private_changing_rooms,
        has_towels_provided AS towels_provided,
        has_soap_provided AS soap_provided,
        has_hair_dryers AS hair_dryer_available,
        business_hours AS hours_of_operation,
        business_hours AS hours_json,
        NULL AS special_hours,
        fee_amount AS cost,
        CASE 
            WHEN accepts_credit_cards THEN 'Credit Cards'
            WHEN accepts_cash THEN 'Cash'
            ELSE 'Cash'
        END AS payment_methods,
        NULL AS cancellation_policy,
        created_at,
        updated_at,
        NULL AS created_by,
        NULL AS updated_by,
        NULL AS deleted_at,
        COALESCE(status, 'active') AS status
    FROM mikvah
    WHERE is_active = true;
    
    -- Drop and recreate stores view with status
    DROP VIEW IF EXISTS stores_search_view;
    CREATE VIEW stores_search_view AS
    SELECT 
        id,
        name,
        description,
        address,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        store_type,
        store_category AS business_category,
        kosher_certification,
        has_delivery AS delivery_available,
        has_pickup AS pickup_available,
        false AS online_ordering,
        false AS catering_available,
        false AS gift_wrapping,
        business_hours AS hours_of_operation,
        business_hours AS hours_json,
        NULL AS special_hours,
        CASE 
            WHEN accepts_credit_cards THEN 'Credit Cards'
            WHEN accepts_cash THEN 'Cash'
            ELSE 'Cash'
        END AS payment_methods,
        NULL AS return_policy,
        NULL AS shipping_policy,
        created_at,
        updated_at,
        NULL AS created_by,
        NULL AS updated_by,
        NULL AS deleted_at,
        COALESCE(status, 'active') AS status
    FROM stores
    WHERE is_active = true;
    
    -- Grant permissions again
    GRANT SELECT ON mikvah_search_view TO app_user;
    GRANT SELECT ON stores_search_view TO app_user;
    
    RAISE NOTICE 'Updated views with status columns';
END $$;

-- Commit the transaction
COMMIT;

-- Display summary
SELECT 
    'Column mapping migration completed successfully' as status,
    'Created views to map expected column names to actual database columns' as description,
    NOW() as completed_at;
