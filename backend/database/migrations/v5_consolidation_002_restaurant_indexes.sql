-- V5 API Consolidation Migration - Restaurant Indexes
-- This script creates performance indexes for restaurant queries
-- Each index is created in its own transaction for CONCURRENTLY support

-- Restaurant status and created_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_status_created 
    ON restaurants(status, created_at) WHERE status = 'active';

-- Restaurant kosher category and location index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_kosher_location 
    ON restaurants(kosher_category, latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Restaurant rating and reviews index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_rating_reviews 
    ON restaurants(google_rating, google_reviews_count) 
    WHERE google_rating IS NOT NULL;

-- Restaurant name GIN index for full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_name_gin 
    ON restaurants USING gin(to_tsvector('english', name));
