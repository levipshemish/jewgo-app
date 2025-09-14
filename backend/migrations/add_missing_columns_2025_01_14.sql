-- Migration: Add Missing Columns
-- Date: 2025-01-14
-- Description: Add missing columns identified from search API errors
-- 
-- Missing columns identified:
-- 1. mikvah.supervision - Orthodox, Conservative, etc.
-- 2. stores.business_category - Retail, Wholesale, Online, etc.

-- Start transaction
BEGIN;

-- Add missing columns to mikvah table
DO $$
BEGIN
    -- Check if supervision column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'supervision'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN supervision VARCHAR(100);
        COMMENT ON COLUMN mikvah.supervision IS 'Orthodox, Conservative, etc.';
        RAISE NOTICE 'Added supervision column to mikvah table';
    ELSE
        RAISE NOTICE 'supervision column already exists in mikvah table';
    END IF;
END $$;

-- Add missing columns to stores table
DO $$
BEGIN
    -- Check if business_category column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'business_category'
    ) THEN
        ALTER TABLE stores ADD COLUMN business_category VARCHAR(100);
        COMMENT ON COLUMN stores.business_category IS 'Retail, Wholesale, Online, etc.';
        RAISE NOTICE 'Added business_category column to stores table';
    ELSE
        RAISE NOTICE 'business_category column already exists in stores table';
    END IF;
END $$;

-- Add any other missing columns that might be referenced in the models
-- Check for other potentially missing columns in mikvah table
DO $$
BEGIN
    -- Check for appointment_required column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'appointment_required'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN appointment_required BOOLEAN DEFAULT TRUE;
        COMMENT ON COLUMN mikvah.appointment_required IS 'Whether appointment is required';
        RAISE NOTICE 'Added appointment_required column to mikvah table';
    END IF;

    -- Check for walk_ins_accepted column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'walk_ins_accepted'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN walk_ins_accepted BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN mikvah.walk_ins_accepted IS 'Whether walk-ins are accepted';
        RAISE NOTICE 'Added walk_ins_accepted column to mikvah table';
    END IF;

    -- Check for accessibility column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'accessibility'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN accessibility VARCHAR(100);
        COMMENT ON COLUMN mikvah.accessibility IS 'Fully accessible, Limited, Not accessible';
        RAISE NOTICE 'Added accessibility column to mikvah table';
    END IF;

    -- Check for wheelchair_accessible column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'wheelchair_accessible'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN wheelchair_accessible BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN mikvah.wheelchair_accessible IS 'Whether wheelchair accessible';
        RAISE NOTICE 'Added wheelchair_accessible column to mikvah table';
    END IF;

    -- Check for private_changing_rooms column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'private_changing_rooms'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN private_changing_rooms BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN mikvah.private_changing_rooms IS 'Whether private changing rooms available';
        RAISE NOTICE 'Added private_changing_rooms column to mikvah table';
    END IF;

    -- Check for towels_provided column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'towels_provided'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN towels_provided BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN mikvah.towels_provided IS 'Whether towels are provided';
        RAISE NOTICE 'Added towels_provided column to mikvah table';
    END IF;

    -- Check for soap_provided column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'soap_provided'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN soap_provided BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN mikvah.soap_provided IS 'Whether soap is provided';
        RAISE NOTICE 'Added soap_provided column to mikvah table';
    END IF;

    -- Check for hair_dryer_available column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'hair_dryer_available'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN hair_dryer_available BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN mikvah.hair_dryer_available IS 'Whether hair dryer is available';
        RAISE NOTICE 'Added hair_dryer_available column to mikvah table';
    END IF;

    -- Check for cost column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'cost'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN cost VARCHAR(100);
        COMMENT ON COLUMN mikvah.cost IS 'Cost information';
        RAISE NOTICE 'Added cost column to mikvah table';
    END IF;

    -- Check for payment_methods column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'payment_methods'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN payment_methods VARCHAR(255);
        COMMENT ON COLUMN mikvah.payment_methods IS 'Accepted payment methods';
        RAISE NOTICE 'Added payment_methods column to mikvah table';
    END IF;

    -- Check for cancellation_policy column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'cancellation_policy'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN cancellation_policy TEXT;
        COMMENT ON COLUMN mikvah.cancellation_policy IS 'Cancellation policy';
        RAISE NOTICE 'Added cancellation_policy column to mikvah table';
    END IF;

    -- Check for special_hours column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'special_hours'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN special_hours TEXT;
        COMMENT ON COLUMN mikvah.special_hours IS 'Special hours information';
        RAISE NOTICE 'Added special_hours column to mikvah table';
    END IF;

    -- Check for created_by column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN created_by VARCHAR(100);
        COMMENT ON COLUMN mikvah.created_by IS 'User who created the record';
        RAISE NOTICE 'Added created_by column to mikvah table';
    END IF;

    -- Check for updated_by column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN updated_by VARCHAR(100);
        COMMENT ON COLUMN mikvah.updated_by IS 'User who last updated the record';
        RAISE NOTICE 'Added updated_by column to mikvah table';
    END IF;

    -- Check for deleted_at column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mikvah' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE mikvah ADD COLUMN deleted_at TIMESTAMP;
        COMMENT ON COLUMN mikvah.deleted_at IS 'Soft delete timestamp';
        RAISE NOTICE 'Added deleted_at column to mikvah table';
    END IF;
END $$;

-- Add any missing columns to stores table
DO $$
BEGIN
    -- Check for delivery_available column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'delivery_available'
    ) THEN
        ALTER TABLE stores ADD COLUMN delivery_available BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN stores.delivery_available IS 'Whether delivery is available';
        RAISE NOTICE 'Added delivery_available column to stores table';
    END IF;

    -- Check for pickup_available column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'pickup_available'
    ) THEN
        ALTER TABLE stores ADD COLUMN pickup_available BOOLEAN DEFAULT TRUE;
        COMMENT ON COLUMN stores.pickup_available IS 'Whether pickup is available';
        RAISE NOTICE 'Added pickup_available column to stores table';
    END IF;

    -- Check for online_ordering column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'online_ordering'
    ) THEN
        ALTER TABLE stores ADD COLUMN online_ordering BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN stores.online_ordering IS 'Whether online ordering is available';
        RAISE NOTICE 'Added online_ordering column to stores table';
    END IF;

    -- Check for catering_available column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'catering_available'
    ) THEN
        ALTER TABLE stores ADD COLUMN catering_available BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN stores.catering_available IS 'Whether catering is available';
        RAISE NOTICE 'Added catering_available column to stores table';
    END IF;

    -- Check for gift_wrapping column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'gift_wrapping'
    ) THEN
        ALTER TABLE stores ADD COLUMN gift_wrapping BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN stores.gift_wrapping IS 'Whether gift wrapping is available';
        RAISE NOTICE 'Added gift_wrapping column to stores table';
    END IF;

    -- Check for special_hours column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'special_hours'
    ) THEN
        ALTER TABLE stores ADD COLUMN special_hours TEXT;
        COMMENT ON COLUMN stores.special_hours IS 'Special hours information';
        RAISE NOTICE 'Added special_hours column to stores table';
    END IF;

    -- Check for payment_methods column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'payment_methods'
    ) THEN
        ALTER TABLE stores ADD COLUMN payment_methods VARCHAR(255);
        COMMENT ON COLUMN stores.payment_methods IS 'Accepted payment methods';
        RAISE NOTICE 'Added payment_methods column to stores table';
    END IF;

    -- Check for return_policy column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'return_policy'
    ) THEN
        ALTER TABLE stores ADD COLUMN return_policy TEXT;
        COMMENT ON COLUMN stores.return_policy IS 'Return policy';
        RAISE NOTICE 'Added return_policy column to stores table';
    END IF;

    -- Check for shipping_policy column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'shipping_policy'
    ) THEN
        ALTER TABLE stores ADD COLUMN shipping_policy TEXT;
        COMMENT ON COLUMN stores.shipping_policy IS 'Shipping policy';
        RAISE NOTICE 'Added shipping_policy column to stores table';
    END IF;

    -- Check for created_by column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE stores ADD COLUMN created_by VARCHAR(100);
        COMMENT ON COLUMN stores.created_by IS 'User who created the record';
        RAISE NOTICE 'Added created_by column to stores table';
    END IF;

    -- Check for updated_by column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE stores ADD COLUMN updated_by VARCHAR(100);
        COMMENT ON COLUMN stores.updated_by IS 'User who last updated the record';
        RAISE NOTICE 'Added updated_by column to stores table';
    END IF;

    -- Check for deleted_at column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stores' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE stores ADD COLUMN deleted_at TIMESTAMP;
        COMMENT ON COLUMN stores.deleted_at IS 'Soft delete timestamp';
        RAISE NOTICE 'Added deleted_at column to stores table';
    END IF;
END $$;

-- Commit the transaction
COMMIT;

-- Display summary
SELECT 
    'Migration completed successfully' as status,
    'Added missing columns to mikvah and stores tables' as description,
    NOW() as completed_at;
