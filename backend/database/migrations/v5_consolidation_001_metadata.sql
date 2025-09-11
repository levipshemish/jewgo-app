-- V5 API Consolidation Migration - Metadata and Versioning
-- This script creates the metadata tracking and versioning infrastructure

BEGIN;

-- Create migrations tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by VARCHAR(255) DEFAULT CURRENT_USER,
    description TEXT
);

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('v5_consolidation_001', 'V5 API Consolidation - Metadata and Versioning')
ON CONFLICT (version) DO NOTHING;

COMMIT;
