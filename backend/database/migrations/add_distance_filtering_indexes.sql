-- Migration: Add distance filtering indexes and extensions
-- Date: 2025-01-27
-- Purpose: Enable efficient server-side distance filtering with earthdistance extension

-- Enable required extensions for distance calculations
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Add timezone column for timezone-aware "open now" filtering
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add structured hours storage for accurate "open now" filtering
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hours_structured JSONB;

-- Create spatial index for efficient distance queries
-- This enables fast radius searches using earthdistance functions
CREATE INDEX IF NOT EXISTS idx_restaurants_earth ON restaurants USING gist (ll_to_earth(latitude, longitude));

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_restaurants_location_status ON restaurants (latitude, longitude, status) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for timezone-aware queries
CREATE INDEX IF NOT EXISTS idx_restaurants_timezone ON restaurants (timezone) WHERE timezone IS NOT NULL;

-- Create index for kosher category filtering (commonly used with distance)
CREATE INDEX IF NOT EXISTS idx_restaurants_kosher_location ON restaurants (kosher_category, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for certifying agency filtering (commonly used with distance)
CREATE INDEX IF NOT EXISTS idx_restaurants_agency_location ON restaurants (certifying_agency, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON INDEX idx_restaurants_earth IS 'Spatial index for earthdistance radius queries';
COMMENT ON INDEX idx_restaurants_location_status IS 'Composite index for location + status filtering';
COMMENT ON INDEX idx_restaurants_timezone IS 'Index for timezone-aware "open now" filtering';
COMMENT ON INDEX idx_restaurants_kosher_location IS 'Composite index for kosher category + location filtering';
COMMENT ON INDEX idx_restaurants_agency_location IS 'Composite index for certifying agency + location filtering';

-- Update existing restaurants with default timezone if not set
UPDATE restaurants 
SET timezone = 'America/New_York' 
WHERE timezone IS NULL 
AND (state = 'FL' OR state = 'NY' OR state = 'CA');

-- Set timezone based on state for existing records
UPDATE restaurants 
SET timezone = 'America/Los_Angeles' 
WHERE timezone = 'America/New_York' 
AND state = 'CA';

UPDATE restaurants 
SET timezone = 'America/New_York' 
WHERE timezone = 'America/New_York' 
AND state IN ('FL', 'NY');
