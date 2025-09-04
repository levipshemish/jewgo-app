-- Migration: Add performance indexes for shuls table
-- Date: 2025-01-27
-- Purpose: Improve query performance for synagogues API, especially location-based queries

-- Enable required extensions for distance calculations
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Add spatial index for efficient distance queries
-- This enables fast radius searches using earthdistance functions
CREATE INDEX IF NOT EXISTS idx_shuls_earth ON shuls USING gist (ll_to_earth(latitude, longitude));

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_shuls_location_status ON shuls (latitude, longitude, is_active, is_verified) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND is_active = true AND is_verified = true;

-- Create index for denomination + location filtering (commonly used together)
CREATE INDEX IF NOT EXISTS idx_shuls_denomination_location ON shuls (denomination, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND is_active = true;

-- Create index for shul type + location filtering
CREATE INDEX IF NOT EXISTS idx_shuls_type_location ON shuls (shul_type, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND is_active = true;

-- Create index for city + denomination filtering
CREATE INDEX IF NOT EXISTS idx_shuls_city_denomination ON shuls (city, denomination, is_active)
WHERE is_active = true;

-- Create index for city + shul type filtering
CREATE INDEX IF NOT EXISTS idx_shuls_city_type ON shuls (city, shul_type, is_active)
WHERE is_active = true;

-- Create index for services filtering
CREATE INDEX IF NOT EXISTS idx_shuls_services ON shuls (has_daily_minyan, has_shabbat_services, is_active)
WHERE is_active = true;

-- Create index for rating-based sorting
CREATE INDEX IF NOT EXISTS idx_shuls_rating_active ON shuls (rating, is_active, is_verified)
WHERE is_active = true AND is_verified = true AND rating IS NOT NULL;

-- Create index for review count-based sorting
CREATE INDEX IF NOT EXISTS idx_shuls_review_count_active ON shuls (review_count, is_active, is_verified)
WHERE is_active = true AND is_verified = true AND review_count > 0;

-- Create index for text search optimization
CREATE INDEX IF NOT EXISTS idx_shuls_name_trgm ON shuls USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shuls_city_trgm ON shuls USING gin (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shuls_description_trgm ON shuls USING gin (description gin_trgm_ops);

-- Create index for tags array searching
CREATE INDEX IF NOT EXISTS idx_shuls_tags_gin ON shuls USING gin (tags);

-- Add comments for documentation
COMMENT ON INDEX idx_shuls_earth IS 'Spatial index for earthdistance radius queries';
COMMENT ON INDEX idx_shuls_location_status IS 'Composite index for location + status filtering';
COMMENT ON INDEX idx_shuls_denomination_location IS 'Composite index for denomination + location filtering';
COMMENT ON INDEX idx_shuls_type_location IS 'Composite index for shul type + location filtering';
COMMENT ON INDEX idx_shuls_city_denomination IS 'Composite index for city + denomination filtering';
COMMENT ON INDEX idx_shuls_city_type IS 'Composite index for city + shul type filtering';
COMMENT ON INDEX idx_shuls_services IS 'Composite index for services filtering';
COMMENT ON INDEX idx_shuls_rating_active IS 'Composite index for rating-based sorting';
COMMENT ON INDEX idx_shuls_review_count_active IS 'Composite index for review count-based sorting';

-- Show created indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'shuls'
ORDER BY indexname;
