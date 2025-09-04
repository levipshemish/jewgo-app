-- Migration: Add simple performance indexes for shuls table
-- Date: 2025-01-27
-- Purpose: Improve query performance for synagogues API with simple, reliable indexes

-- Create basic composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shuls_location_status ON shuls (latitude, longitude, is_active, is_verified);

-- Create index for denomination + location filtering
CREATE INDEX IF NOT EXISTS idx_shuls_denomination_location ON shuls (denomination, latitude, longitude);

-- Create index for shul type + location filtering
CREATE INDEX IF NOT EXISTS idx_shuls_type_location ON shuls (shul_type, latitude, longitude);

-- Create index for city + denomination filtering
CREATE INDEX IF NOT EXISTS idx_shuls_city_denomination ON shuls (city, denomination, is_active);

-- Create index for city + shul type filtering
CREATE INDEX IF NOT EXISTS idx_shuls_city_type ON shuls (city, shul_type, is_active);

-- Create index for services filtering
CREATE INDEX IF NOT EXISTS idx_shuls_services ON shuls (has_daily_minyan, has_shabbat_services, is_active);

-- Create index for rating-based sorting
CREATE INDEX IF NOT EXISTS idx_shuls_rating_active ON shuls (rating, is_active, is_verified);

-- Create index for review count-based sorting
CREATE INDEX IF NOT EXISTS idx_shuls_review_count_active ON shuls (review_count, is_active, is_verified);

-- Show created indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'shuls'
ORDER BY indexname;
