-- Florida Synagogues Database Indexes
-- This script creates performance indexes for the florida_synagogues table

-- City index for location-based queries
CREATE INDEX IF NOT EXISTS idx_synagogues_city ON florida_synagogues(city);

-- Affiliation index for denomination-based queries
CREATE INDEX IF NOT EXISTS idx_synagogues_affiliation ON florida_synagogues(affiliation);

-- Chabad synagogues index
CREATE INDEX IF NOT EXISTS idx_synagogues_chabad ON florida_synagogues(is_chabad);

-- Young Israel synagogues index
CREATE INDEX IF NOT EXISTS idx_synagogues_young_israel ON florida_synagogues(is_young_israel);

-- Sephardic synagogues index
CREATE INDEX IF NOT EXISTS idx_synagogues_sephardic ON florida_synagogues(is_sephardic);

-- Name index for search functionality
CREATE INDEX IF NOT EXISTS idx_synagogues_name ON florida_synagogues(name);

-- State index for geographic queries
CREATE INDEX IF NOT EXISTS idx_synagogues_state ON florida_synagogues(state);

-- Composite index for city and affiliation
CREATE INDEX IF NOT EXISTS idx_synagogues_city_affiliation ON florida_synagogues(city, affiliation);

-- Composite index for state and city
CREATE INDEX IF NOT EXISTS idx_synagogues_state_city ON florida_synagogues(state, city);

-- Data quality score index
CREATE INDEX IF NOT EXISTS idx_synagogues_quality ON florida_synagogues(data_quality_score);

-- Created at index for time-based queries
CREATE INDEX IF NOT EXISTS idx_synagogues_created_at ON florida_synagogues(created_at);

-- Updated at index for time-based queries
CREATE INDEX IF NOT EXISTS idx_synagogues_updated_at ON florida_synagogues(updated_at);

-- Show created indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'florida_synagogues'
ORDER BY indexname;
