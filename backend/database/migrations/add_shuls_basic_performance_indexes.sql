-- Migration: Add basic performance indexes for shuls table
-- Date: 2025-01-27
-- Purpose: Improve query performance for synagogues API without requiring cube extension

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

-- Create index for tags array searching
CREATE INDEX IF NOT EXISTS idx_shuls_tags_gin ON shuls USING gin (tags);

-- Show created indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'shuls'
ORDER BY indexname;
