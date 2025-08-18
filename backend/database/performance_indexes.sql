-- Performance Indexes for JewGo Restaurants Table
-- This script creates optimized indexes for better query performance

-- Primary search indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants(name);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_state ON restaurants(state);
CREATE INDEX IF NOT EXISTS idx_restaurants_kosher_category ON restaurants(kosher_category);
CREATE INDEX IF NOT EXISTS idx_restaurants_certifying_agency ON restaurants(certifying_agency);

-- Geographic indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_restaurants_city_state ON restaurants(city, state);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_restaurants_category_city ON restaurants(kosher_category, city);
CREATE INDEX IF NOT EXISTS idx_restaurants_agency_category ON restaurants(certifying_agency, kosher_category);
CREATE INDEX IF NOT EXISTS idx_restaurants_name_city ON restaurants(name, city);

-- Kosher-specific indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_cholov_yisroel ON restaurants(is_cholov_yisroel) WHERE is_cholov_yisroel = true;
CREATE INDEX IF NOT EXISTS idx_restaurants_pas_yisroel ON restaurants(is_pas_yisroel) WHERE is_pas_yisroel = true;
CREATE INDEX IF NOT EXISTS idx_restaurants_cholov_stam ON restaurants(cholov_stam) WHERE cholov_stam = true;

-- Timestamp indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON restaurants(created_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_updated_at ON restaurants(updated_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_hours_updated ON restaurants(hours_last_updated);

-- Partial indexes for active restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(id) WHERE hours_parsed = true;

-- Text search index for name and description
CREATE INDEX IF NOT EXISTS idx_restaurants_name_gin ON restaurants USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_restaurants_description_gin ON restaurants USING gin(to_tsvector('english', COALESCE(short_description, '')));

-- Phone number index for quick lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_phone ON restaurants(phone_number);

-- Website index for restaurants with websites
CREATE INDEX IF NOT EXISTS idx_restaurants_has_website ON restaurants(id) WHERE website IS NOT NULL AND website != '';

-- Show created indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'restaurants'
ORDER BY indexname;
