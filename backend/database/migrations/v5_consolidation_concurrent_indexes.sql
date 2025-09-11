-- V5 Consolidation Migration - Concurrent Index Creation
-- This script creates indexes with CONCURRENTLY to avoid blocking operations
-- Run this AFTER the main v5_consolidation.sql migration

-- =============================================================================
-- CONCURRENT INDEX CREATION FOR V5 PERFORMANCE
-- =============================================================================

-- Note: These operations cannot be run inside a transaction
-- Run each CREATE INDEX CONCURRENTLY statement individually

-- Entity-based indexes for consolidated queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_status_created_concurrent 
    ON restaurants(status, created_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_kosher_location_concurrent 
    ON restaurants(kosher_category, latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_rating_reviews_concurrent 
    ON restaurants(google_rating, google_reviews_count) 
    WHERE google_rating IS NOT NULL;

-- Synagogue indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_synagogues_status_created_concurrent 
    ON synagogues(status, created_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_synagogues_location_concurrent 
    ON synagogues(latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Review indexes for cross-entity reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_entity_type_status_concurrent 
    ON reviews(entity_type, entity_id, status) WHERE status = 'approved';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_created_rating_concurrent 
    ON reviews(created_at DESC, rating) WHERE rating IS NOT NULL;

-- Full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_name_gin_concurrent 
    ON restaurants USING gin(to_tsvector('english', name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_synagogues_name_gin_concurrent 
    ON synagogues USING gin(to_tsvector('english', name));

-- Additional concurrent indexes for v5 monitoring tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_metrics_v5_timestamp_endpoint_concurrent 
    ON api_metrics_v5(timestamp, endpoint);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_metrics_v5_status_endpoint_concurrent 
    ON api_metrics_v5(status_code, endpoint) WHERE status_code >= 400;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_metrics_v5_user_timestamp_concurrent 
    ON api_metrics_v5(user_id, timestamp) WHERE user_id IS NOT NULL;

-- ETag cache indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_etag_cache_v5_expires_concurrent 
    ON etag_cache_v5(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_etag_cache_v5_last_accessed_concurrent 
    ON etag_cache_v5(last_accessed);

-- Rate limiting indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_v5_blocked_until_concurrent 
    ON rate_limits_v5(blocked_until) WHERE blocked_until IS NOT NULL;

-- Audit log indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_v5_timestamp_user_concurrent 
    ON audit_log_v5(timestamp DESC, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_v5_action_resource_concurrent 
    ON audit_log_v5(action, resource_type, resource_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_v5_risk_score_concurrent 
    ON audit_log_v5(risk_score) WHERE risk_score > 70;

-- Auth failures indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_failures_v5_ip_timestamp_concurrent 
    ON auth_failures_v5(ip_address, timestamp DESC);

-- =============================================================================
-- POST-CONCURRENT INDEX VERIFICATION
-- =============================================================================

-- Verify that all concurrent indexes were created successfully
SELECT 
    'Concurrent Index Creation Summary' as operation,
    schemaname || '.' || indexname as index_name,
    schemaname || '.' || tablename as table_name,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE '%_concurrent'
ORDER BY tablename, indexname;

-- Display index sizes for monitoring
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE indexrelname LIKE '%_concurrent'
ORDER BY pg_relation_size(indexrelid) DESC;
