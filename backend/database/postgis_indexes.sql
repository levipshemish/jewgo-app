-- PostGIS and search indexes for JewGo backend
-- Run these indexes to optimize spatial queries and text search

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Spatial (geometry) indexes for KNN queries
CREATE INDEX IF NOT EXISTS idx_mikvah_geom ON mikvah USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_synagogues_geom ON synagogues USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_restaurants_geom ON restaurants USING GIST (geom);

-- Search (ILIKE) indexes - enable trigram for real speed
CREATE INDEX IF NOT EXISTS idx_mikvah_name_trgm ON mikvah USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mikvah_desc_trgm ON mikvah USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_synagogues_name_trgm ON synagogues USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_synagogues_desc_trgm ON synagogues USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm ON restaurants USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_restaurants_desc_trgm ON restaurants USING GIN (description gin_trgm_ops);

-- Common filter indexes
CREATE INDEX IF NOT EXISTS idx_mikvah_is_approved ON mikvah (is_approved);
CREATE INDEX IF NOT EXISTS idx_mikvah_is_active ON mikvah (is_active);
CREATE INDEX IF NOT EXISTS idx_synagogues_is_approved ON synagogues (is_approved);
CREATE INDEX IF NOT EXISTS idx_synagogues_is_active ON synagogues (is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_approved ON restaurants (is_approved);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants (is_active);

-- Location-based indexes
CREATE INDEX IF NOT EXISTS idx_mikvah_city_state ON mikvah (city, state);
CREATE INDEX IF NOT EXISTS idx_synagogues_city_state ON synagogues (city, state);
CREATE INDEX IF NOT EXISTS idx_restaurants_city_state ON restaurants (city, state);

-- Optional partial indexes for approved entities (more efficient for common queries)
CREATE INDEX IF NOT EXISTS idx_mikvah_geom_approved ON mikvah USING GIST (geom) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_synagogues_geom_approved ON synagogues USING GIST (geom) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_restaurants_geom_approved ON restaurants USING GIST (geom) WHERE is_approved = true;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_mikvah_active_approved ON mikvah (is_active, is_approved) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_synagogues_active_approved ON synagogues (is_active, is_approved) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_restaurants_active_approved ON restaurants (is_active, is_approved) WHERE is_active = true;
