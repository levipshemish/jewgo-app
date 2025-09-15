# Database Schema Documentation - V5

## Overview

This document describes the database schema for the JewGo V5 API, including the optimized JSONB fields and enhanced indexing for improved performance.

## Core Tables

### Restaurants Table

The `restaurants` table is the central table for kosher restaurant data with enhanced JSONB support.

```sql
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    website VARCHAR(255),
    email VARCHAR(255),
    
    -- Location Data
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geometry GEOMETRY(POINT, 4326), -- PostGIS spatial data
    
    -- Kosher Information
    kosher_category VARCHAR(50), -- 'Meat', 'Dairy', 'Pareve'
    kosher_details TEXT[], -- Array of kosher details
    agency VARCHAR(100), -- Kosher supervision agency
    
    -- Business Information
    listing_type VARCHAR(50), -- 'Restaurant', 'Caterer', 'Bakery', etc.
    price_range VARCHAR(20),
    rating DECIMAL(3, 2),
    review_count INTEGER DEFAULT 0,
    
    -- Hours and Operations (JSONB)
    hours_json JSONB, -- Structured hours data
    hours_of_operation TEXT, -- Legacy text field
    hours_last_updated TIMESTAMP WITH TIME ZONE,
    timezone VARCHAR(50),
    
    -- Additional Data
    short_description TEXT,
    google_place_id VARCHAR(255),
    google_reviews JSONB, -- Recent Google reviews
    place_id VARCHAR(255), -- Google Places place ID
    
    -- Audit Fields
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false
);
```

### Hours JSONB Structure

The `hours_json` field stores structured hours data in JSONB format for optimal querying:

```json
{
  "open_now": true,
  "periods": [
    {
      "open": {"day": 0, "time": "1100"},
      "close": {"day": 0, "time": "2200"}
    },
    {
      "open": {"day": 1, "time": "1100"},
      "close": {"day": 1, "time": "2200"}
    }
  ],
  "weekday_text": [
    "Monday: 11:00 AM – 10:00 PM",
    "Tuesday: 11:00 AM – 10:00 PM"
  ]
}
```

**Field Descriptions:**
- `open_now`: Boolean indicating current open status
- `periods`: Array of opening periods
  - `day`: Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  - `time`: Time in HHMM format (24-hour)
- `weekday_text`: Human-readable hours for display

### Google Reviews JSONB Structure

The `google_reviews` field stores recent Google reviews:

```json
{
  "reviews": [
    {
      "author_name": "John Doe",
      "rating": 5,
      "text": "Great kosher food!",
      "time": 1640995200,
      "relative_time_description": "2 months ago"
    }
  ],
  "last_updated": "2025-01-15T10:30:00Z"
}
```

## Indexes

### Primary Indexes

```sql
-- Primary key
CREATE INDEX idx_restaurants_id ON restaurants(id);

-- Location indexes for spatial queries
CREATE INDEX idx_restaurants_geometry ON restaurants USING GIST(geometry);
CREATE INDEX idx_restaurants_lat_lng ON restaurants(latitude, longitude);

-- Business data indexes
CREATE INDEX idx_restaurants_kosher_category ON restaurants(kosher_category);
CREATE INDEX idx_restaurants_agency ON restaurants(agency);
CREATE INDEX idx_restaurants_listing_type ON restaurants(listing_type);
CREATE INDEX idx_restaurants_rating ON restaurants(rating DESC);
CREATE INDEX idx_restaurants_is_active ON restaurants(is_active);
```

### JSONB Indexes

```sql
-- Hours JSONB indexes for efficient filtering
CREATE INDEX idx_restaurants_hours_open_now ON restaurants USING GIN((hours_json->>'open_now'));
CREATE INDEX idx_restaurants_hours_periods ON restaurants USING GIN((hours_json->'periods'));

-- Google reviews JSONB index
CREATE INDEX idx_restaurants_google_reviews ON restaurants USING GIN(google_reviews);
```

### Composite Indexes

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_restaurants_location_category ON restaurants(latitude, longitude, kosher_category);
CREATE INDEX idx_restaurants_active_rating ON restaurants(is_active, rating DESC);
CREATE INDEX idx_restaurants_agency_category ON restaurants(agency, kosher_category);
```

## Spatial Data (PostGIS)

The `geometry` field uses PostGIS for advanced spatial operations:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Spatial reference system (WGS84)
SELECT AddGeometryColumn('restaurants', 'geometry', 4326, 'POINT', 2);

-- Spatial indexes
CREATE INDEX idx_restaurants_geometry_gist ON restaurants USING GIST(geometry);
```

### Spatial Queries

```sql
-- Find restaurants within radius
SELECT * FROM restaurants 
WHERE ST_DWithin(geometry, ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326), 10000);

-- Calculate distance
SELECT *, ST_Distance(geometry, ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)) as distance
FROM restaurants 
ORDER BY distance;
```

## JSONB Queries

### Hours Filtering Queries

```sql
-- Find restaurants currently open
SELECT * FROM restaurants 
WHERE hours_json->>'open_now' = 'true';

-- Find restaurants with hours data
SELECT * FROM restaurants 
WHERE hours_json IS NOT NULL 
AND hours_json->'periods' IS NOT NULL;

-- Find restaurants open on specific day
SELECT * FROM restaurants 
WHERE hours_json->'periods' @> '[{"open": {"day": 0}}]';
```

### Google Reviews Queries

```sql
-- Find restaurants with Google reviews
SELECT * FROM restaurants 
WHERE google_reviews IS NOT NULL 
AND google_reviews->'reviews' IS NOT NULL;

-- Find restaurants with high Google ratings
SELECT * FROM restaurants 
WHERE (google_reviews->'reviews'->0->>'rating')::int >= 4;
```

## Data Types and Constraints

### Enums and Check Constraints

```sql
-- Kosher category constraint
ALTER TABLE restaurants 
ADD CONSTRAINT chk_kosher_category 
CHECK (kosher_category IN ('Meat', 'Dairy', 'Pareve'));

-- Rating constraint
ALTER TABLE restaurants 
ADD CONSTRAINT chk_rating 
CHECK (rating >= 0 AND rating <= 5);

-- Phone format constraint
ALTER TABLE restaurants 
ADD CONSTRAINT chk_phone_format 
CHECK (phone ~ '^\+?[1-9]\d{1,14}$');
```

### Triggers

```sql
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_updated_at 
BEFORE UPDATE ON restaurants 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Performance Optimization

### Query Optimization

1. **JSONB Indexes**: Use GIN indexes for JSONB fields that are frequently queried
2. **Spatial Indexes**: Use GIST indexes for PostGIS geometry fields
3. **Composite Indexes**: Create indexes for common query patterns
4. **Partial Indexes**: Use partial indexes for filtered queries

### Maintenance

```sql
-- Analyze tables for query optimization
ANALYZE restaurants;

-- Update statistics
UPDATE pg_stat_user_tables 
SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0 
WHERE relname = 'restaurants';

-- Vacuum and reindex
VACUUM ANALYZE restaurants;
REINDEX TABLE restaurants;
```

## Migration Notes

### From V4 to V5

1. **Hours Field Migration**: The `hours_json` field was migrated from TEXT to JSONB
2. **Index Updates**: New JSONB indexes were added for hours filtering
3. **Spatial Data**: PostGIS integration for advanced location queries
4. **Performance**: Enhanced indexing for better query performance

### Data Validation

```sql
-- Validate hours_json data
SELECT id, name, hours_json 
FROM restaurants 
WHERE hours_json IS NOT NULL 
AND NOT (hours_json ? 'periods' AND hours_json ? 'open_now');

-- Check for invalid JSON
SELECT id, name, hours_json 
FROM restaurants 
WHERE hours_json IS NOT NULL 
AND NOT (hours_json::text ~ '^\{.*\}$');
```

## Backup and Recovery

### Backup Strategy

```bash
# Full database backup
pg_dump -h localhost -U app_user -d jewgo_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema-only backup
pg_dump -h localhost -U app_user -d jewgo_db --schema-only > schema_backup.sql

# Data-only backup
pg_dump -h localhost -U app_user -d jewgo_db --data-only > data_backup.sql
```

### Recovery

```bash
# Restore from backup
psql -h localhost -U app_user -d jewgo_db < backup_20250115_103000.sql
```

## Monitoring

### Query Performance

```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
WHERE query LIKE '%restaurants%'
ORDER BY mean_time DESC;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'restaurants';
```

### Database Health

```sql
-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename = 'restaurants';

-- Check index sizes
SELECT indexname, pg_size_pretty(pg_relation_size(indexname)) as size
FROM pg_indexes 
WHERE tablename = 'restaurants';
```
