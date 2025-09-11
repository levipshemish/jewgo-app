-- V5 API Consolidation Migration - Synagogue Indexes
-- This script creates performance indexes for synagogue queries
-- Each index is created in its own transaction for CONCURRENTLY support

-- Synagogue status and created_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_synagogues_status_created 
    ON synagogues(status, created_at) WHERE status = 'active';

-- Synagogue location index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_synagogues_location 
    ON synagogues(latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Synagogue name GIN index for full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_synagogues_name_gin 
    ON synagogues USING gin(to_tsvector('english', name));
