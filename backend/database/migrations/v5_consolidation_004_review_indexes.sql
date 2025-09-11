-- V5 API Consolidation Migration - Review Indexes
-- This script creates performance indexes for review queries
-- Each index is created in its own transaction for CONCURRENTLY support

-- Review entity type and status index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_entity_type_status 
    ON reviews(entity_type, status) WHERE status = 'approved';

-- Review created_at and rating index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_created_rating 
    ON reviews(created_at, rating) WHERE rating IS NOT NULL;
