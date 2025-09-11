-- V5 API Consolidation Migration Script
-- This script prepares the database for the v5 API consolidation
-- with enhanced performance, monitoring, and security features.

BEGIN;

-- =============================================================================
-- METADATA AND VERSIONING
-- =============================================================================

-- Create migrations tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by VARCHAR(255) DEFAULT CURRENT_USER,
    description TEXT
);

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('v5_consolidation_001', 'V5 API Consolidation - Performance and Monitoring Enhancements')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================================================

-- Add indexes for v5 API performance
-- Entity-based indexes for consolidated queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_status_created 
    ON restaurants(status, created_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_kosher_location 
    ON restaurants(kosher_category, latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_rating_reviews 
    ON restaurants(google_rating, google_reviews_count) 
    WHERE google_rating IS NOT NULL;

-- Synagogue indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_synagogues_status_created 
    ON synagogues(status, created_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_synagogues_location 
    ON synagogues(latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Review indexes for cross-entity reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_entity_type_status 
    ON reviews(entity_type, entity_id, status) WHERE status = 'approved';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_created_rating 
    ON reviews(created_at DESC, rating) WHERE rating IS NOT NULL;

-- Full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_name_gin 
    ON restaurants USING gin(to_tsvector('english', name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_synagogues_name_gin 
    ON synagogues USING gin(to_tsvector('english', name));

-- =============================================================================
-- V5 MONITORING AND METRICS TABLES
-- =============================================================================

-- API metrics table for v5 monitoring
CREATE TABLE IF NOT EXISTS api_metrics_v5 (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms FLOAT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    request_size INTEGER,
    response_size INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    error_message TEXT,
    trace_id VARCHAR(255)
);

-- Partition api_metrics_v5 by month for performance
SELECT create_hypertable('api_metrics_v5', 'timestamp', if_not_exists => TRUE);

-- Indexes for api_metrics_v5
CREATE INDEX IF NOT EXISTS idx_api_metrics_v5_timestamp_endpoint 
    ON api_metrics_v5(timestamp, endpoint);

CREATE INDEX IF NOT EXISTS idx_api_metrics_v5_status_endpoint 
    ON api_metrics_v5(status_code, endpoint) WHERE status_code >= 400;

CREATE INDEX IF NOT EXISTS idx_api_metrics_v5_user_timestamp 
    ON api_metrics_v5(user_id, timestamp) WHERE user_id IS NOT NULL;

-- Database performance metrics
CREATE TABLE IF NOT EXISTS db_performance_v5 (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    operation_type VARCHAR(50) NOT NULL, -- SELECT, INSERT, UPDATE, DELETE
    table_name VARCHAR(100) NOT NULL,
    query_time_ms FLOAT NOT NULL,
    rows_affected INTEGER,
    query_hash VARCHAR(64), -- For grouping similar queries
    slow_query BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    connection_pool_size INTEGER,
    active_connections INTEGER
);

-- Connection health metrics
CREATE TABLE IF NOT EXISTS connection_health_v5 (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    component VARCHAR(50) NOT NULL, -- 'database', 'redis', 'external_api'
    status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
    response_time_ms FLOAT,
    error_count INTEGER DEFAULT 0,
    metadata JSONB,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- V5 CACHING AND SESSION TABLES
-- =============================================================================

-- ETag cache table for v5 caching system
CREATE TABLE IF NOT EXISTS etag_cache_v5 (
    cache_key VARCHAR(255) PRIMARY KEY,
    etag VARCHAR(255) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    content_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Index for ETag cache cleanup
CREATE INDEX IF NOT EXISTS idx_etag_cache_v5_expires 
    ON etag_cache_v5(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_etag_cache_v5_last_accessed 
    ON etag_cache_v5(last_accessed);

-- Rate limiting table for v5 token bucket implementation
CREATE TABLE IF NOT EXISTS rate_limits_v5 (
    identifier VARCHAR(255) PRIMARY KEY, -- user_id, ip_address, api_key, etc.
    bucket_type VARCHAR(50) NOT NULL, -- 'user', 'ip', 'api_key', 'admin'
    tokens_remaining INTEGER NOT NULL,
    tokens_per_minute INTEGER NOT NULL,
    last_refill TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE
);

-- Index for rate limit cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_v5_blocked_until 
    ON rate_limits_v5(blocked_until) WHERE blocked_until IS NOT NULL;

-- =============================================================================
-- V5 SECURITY AND AUDIT ENHANCEMENTS
-- =============================================================================

-- Enhanced audit log for v5 security
CREATE TABLE IF NOT EXISTS audit_log_v5 (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    flags TEXT[], -- ['suspicious_ip', 'bulk_operation', etc.]
    metadata JSONB
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_v5_timestamp_user 
    ON audit_log_v5(timestamp DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_v5_action_resource 
    ON audit_log_v5(action, resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_v5_risk_score 
    ON audit_log_v5(risk_score) WHERE risk_score > 70;

-- Failed authentication attempts
CREATE TABLE IF NOT EXISTS auth_failures_v5 (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET NOT NULL,
    user_identifier VARCHAR(255), -- email, username, etc.
    failure_type VARCHAR(50) NOT NULL, -- 'invalid_credentials', 'rate_limited', etc.
    user_agent TEXT,
    blocked_until TIMESTAMP WITH TIME ZONE,
    attempt_count INTEGER DEFAULT 1
);

-- Index for security monitoring
CREATE INDEX IF NOT EXISTS idx_auth_failures_v5_ip_timestamp 
    ON auth_failures_v5(ip_address, timestamp DESC);

-- =============================================================================
-- V5 FEATURE FLAGS AND CONFIGURATION
-- =============================================================================

-- Feature flags table for v5 gradual rollout
CREATE TABLE IF NOT EXISTS feature_flags_v5 (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    target_users INTEGER[], -- Specific user IDs
    target_roles TEXT[], -- Specific user roles
    conditions JSONB, -- Complex conditions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

-- Insert default v5 feature flags
INSERT INTO feature_flags_v5 (name, description, enabled, rollout_percentage) VALUES 
    ('v5_api_enabled', 'Enable v5 consolidated API endpoints', TRUE, 100),
    ('v5_enhanced_caching', 'Enable v5 ETag-based caching system', TRUE, 100),
    ('v5_advanced_monitoring', 'Enable v5 OpenTelemetry monitoring', TRUE, 50),
    ('v5_rate_limiting', 'Enable v5 token bucket rate limiting', TRUE, 80),
    ('v5_audit_logging', 'Enable enhanced v5 audit logging', TRUE, 100)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- V5 DATABASE FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for etag_cache_v5
DROP TRIGGER IF EXISTS update_etag_cache_v5_updated_at ON etag_cache_v5;
CREATE TRIGGER update_etag_cache_v5_updated_at 
    BEFORE UPDATE ON etag_cache_v5 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for automatic cache cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_cache_v5()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired ETag cache entries
    DELETE FROM etag_cache_v5 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old entries that haven't been accessed in 30 days
    DELETE FROM etag_cache_v5 
    WHERE last_accessed < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Clean up old rate limit entries
    DELETE FROM rate_limits_v5 
    WHERE blocked_until IS NULL 
    AND last_refill < NOW() - INTERVAL '1 hour';
    
    -- Clean up old failed auth attempts (older than 7 days)
    DELETE FROM auth_failures_v5 
    WHERE timestamp < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to increment cache hit counter
CREATE OR REPLACE FUNCTION increment_etag_hit(cache_key_param VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    UPDATE etag_cache_v5 
    SET hit_count = hit_count + 1, 
        last_accessed = NOW() 
    WHERE cache_key = cache_key_param;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- V5 VIEWS FOR MONITORING AND ANALYTICS
-- =============================================================================

-- View for API performance monitoring
CREATE OR REPLACE VIEW api_performance_v5 AS
SELECT 
    endpoint,
    method,
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
    COUNT(*) FILTER (WHERE cache_hit = TRUE) as cache_hits,
    COUNT(*) FILTER (WHERE status_code >= 500) as server_errors
FROM api_metrics_v5 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint, method, DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC, avg_response_time DESC;

-- View for database performance summary
CREATE OR REPLACE VIEW db_performance_summary_v5 AS
SELECT 
    table_name,
    operation_type,
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as query_count,
    AVG(query_time_ms) as avg_query_time,
    COUNT(*) FILTER (WHERE slow_query = TRUE) as slow_query_count,
    SUM(rows_affected) as total_rows_affected
FROM db_performance_v5 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY table_name, operation_type, DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC, avg_query_time DESC;

-- View for security monitoring
CREATE OR REPLACE VIEW security_summary_v5 AS
SELECT 
    DATE_TRUNC('day', timestamp) as day,
    COUNT(*) as total_audit_events,
    COUNT(*) FILTER (WHERE success = FALSE) as failed_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(*) FILTER (WHERE risk_score > 70) as high_risk_events,
    array_agg(DISTINCT unnest(flags)) FILTER (WHERE flags IS NOT NULL) as all_flags
FROM audit_log_v5 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY day DESC;

-- =============================================================================
-- V5 CLEANUP AND MAINTENANCE PROCEDURES
-- =============================================================================

-- Schedule automatic cleanup (requires pg_cron extension)
-- SELECT cron.schedule('v5-cache-cleanup', '0 2 * * *', 'SELECT cleanup_expired_cache_v5();');

-- Create cleanup procedure for manual execution
CREATE OR REPLACE FUNCTION maintenance_v5_cleanup()
RETURNS TABLE(
    cleaned_component TEXT,
    rows_affected INTEGER,
    execution_time_ms FLOAT
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    rows_count INTEGER;
BEGIN
    -- Clean expired cache
    start_time := clock_timestamp();
    SELECT cleanup_expired_cache_v5() INTO rows_count;
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 'etag_cache_cleanup'::TEXT, rows_count, 
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Clean old metrics (keep last 90 days)
    start_time := clock_timestamp();
    DELETE FROM api_metrics_v5 WHERE timestamp < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS rows_count = ROW_COUNT;
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 'api_metrics_cleanup'::TEXT, rows_count,
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Clean old db performance logs (keep last 30 days)
    start_time := clock_timestamp();
    DELETE FROM db_performance_v5 WHERE timestamp < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS rows_count = ROW_COUNT;
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 'db_performance_cleanup'::TEXT, rows_count,
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Vacuum analyze critical tables
    PERFORM pg_stat_reset();
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FINAL OPTIMIZATIONS AND CONSTRAINTS
-- =============================================================================

-- Update table statistics for optimal query planning
ANALYZE restaurants, synagogues, reviews, users;

-- Add constraints for data integrity
ALTER TABLE api_metrics_v5 
    ADD CONSTRAINT check_response_time_positive 
    CHECK (response_time_ms >= 0);

ALTER TABLE db_performance_v5 
    ADD CONSTRAINT check_query_time_positive 
    CHECK (query_time_ms >= 0);

-- Add comments for documentation
COMMENT ON TABLE api_metrics_v5 IS 'V5 API request metrics for monitoring and analytics';
COMMENT ON TABLE etag_cache_v5 IS 'V5 ETag-based caching system for improved performance';
COMMENT ON TABLE rate_limits_v5 IS 'V5 token bucket rate limiting implementation';
COMMENT ON TABLE audit_log_v5 IS 'V5 enhanced security audit logging';
COMMENT ON TABLE feature_flags_v5 IS 'V5 feature flag system for gradual rollout';

-- =============================================================================
-- MIGRATION COMPLETION
-- =============================================================================

-- Update migration status
UPDATE schema_migrations 
SET applied_at = NOW() 
WHERE version = 'v5_consolidation_001';

-- Log successful migration
INSERT INTO audit_log_v5 (
    user_id, ip_address, action, resource_type, 
    success, metadata
) VALUES (
    NULL, '127.0.0.1'::inet, 'database_migration', 'schema',
    TRUE, '{"migration": "v5_consolidation_001", "description": "V5 API Consolidation Migration Completed"}'::jsonb
);

COMMIT;

-- Post-migration verification
SELECT 
    'V5 Consolidation Migration' as migration_name,
    version,
    applied_at,
    applied_by
FROM schema_migrations 
WHERE version = 'v5_consolidation_001';

-- Display performance enhancement summary
SELECT 
    'Index Created' as enhancement_type,
    schemaname || '.' || indexname as object_name,
    schemaname || '.' || tablename as table_name
FROM pg_indexes 
WHERE indexname LIKE '%_v5_%' 
   OR indexname LIKE 'idx_restaurants_%'
   OR indexname LIKE 'idx_synagogues_%'
   OR indexname LIKE 'idx_reviews_%'
ORDER BY tablename, indexname;