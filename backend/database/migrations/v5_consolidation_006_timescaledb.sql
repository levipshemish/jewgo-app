-- V5 API Consolidation Migration - TimescaleDB Setup
-- This script sets up TimescaleDB hypertables with proper guards
-- Each operation is in its own transaction

-- Create hypertables with TimescaleDB guards
DO $$ 
BEGIN 
    -- Create hypertable for metrics if TimescaleDB is available
    BEGIN
        PERFORM create_hypertable('metrics', 'timestamp', if_not_exists => TRUE);
        RAISE NOTICE 'TimescaleDB hypertable created for metrics';
    EXCEPTION 
        WHEN undefined_function THEN
            RAISE NOTICE 'TimescaleDB not available, skipping hypertable creation';
        WHEN duplicate_table THEN
            RAISE NOTICE 'Hypertable already exists for metrics';
    END;
    
    -- Create hypertable for audit logs if TimescaleDB is available
    BEGIN
        PERFORM create_hypertable('audit_logs', 'created_at', if_not_exists => TRUE);
        RAISE NOTICE 'TimescaleDB hypertable created for audit_logs';
    EXCEPTION 
        WHEN undefined_function THEN
            RAISE NOTICE 'TimescaleDB not available, skipping hypertable creation';
        WHEN duplicate_table THEN
            RAISE NOTICE 'Hypertable already exists for audit_logs';
    END;
END $$;
