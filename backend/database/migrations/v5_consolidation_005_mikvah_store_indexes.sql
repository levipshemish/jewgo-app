-- V5 API Consolidation Migration - Mikvah and Store Indexes
-- This script creates performance indexes for mikvah and store queries
-- Each index is created in its own transaction for CONCURRENTLY support

-- Mikvah indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mikvah_status_created 
    ON mikvah(status, created_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mikvah_location 
    ON mikvah(latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mikvah_name_gin 
    ON mikvah USING gin(to_tsvector('english', name));

-- Store indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stores_status_created 
    ON stores(status, created_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stores_location 
    ON stores(latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stores_name_gin 
    ON stores USING gin(to_tsvector('english', name));
