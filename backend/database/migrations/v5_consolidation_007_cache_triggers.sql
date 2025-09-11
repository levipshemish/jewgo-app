-- V5 API Consolidation Migration - Cache Invalidation Triggers
-- This script creates database triggers for cache invalidation notifications

BEGIN;

-- Create cache invalidation function
CREATE OR REPLACE FUNCTION notify_cache_invalidation()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify cache invalidation worker
    PERFORM pg_notify('entity_change', json_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'old_data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        'new_data', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        'timestamp', NOW()
    )::text);
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all entity tables
CREATE TRIGGER restaurants_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();

CREATE TRIGGER synagogues_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON synagogues
    FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();

CREATE TRIGGER mikvah_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON mikvah
    FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();

CREATE TRIGGER stores_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON stores
    FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();

CREATE TRIGGER reviews_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();

COMMIT;
