# PostGIS Migration Guide

This guide explains how to run the PostGIS migrations on the production database to enable efficient spatial queries and geospatial operations.

## Overview

The PostGIS migration includes:
1. **PostGIS Extension**: Enables spatial data types and functions
2. **pg_trgm Extension**: Enables trigram-based text search
3. **Geometry Columns**: Adds spatial geometry columns to tables
4. **Spatial Indexes**: Creates GIST indexes for efficient spatial queries
5. **Text Search Indexes**: Creates GIN indexes for fast text search

## Prerequisites

- Access to the production server
- `DATABASE_URL` environment variable set
- Python 3.8+ with required dependencies
- Database backup (recommended)

## Migration Files

The migration consists of two main SQL files:

### 1. `backend/database/migrations/add_postgis_geometry_column.sql`
- Adds `geom` column to restaurants table
- Populates geometry from latitude/longitude coordinates
- Creates spatial indexes
- Adds triggers for automatic geometry updates

### 2. `backend/database/postgis_indexes.sql`
- Enables PostGIS and pg_trgm extensions
- Creates spatial (GIST) indexes for KNN queries
- Creates text search (GIN) indexes for trigram search
- Creates composite indexes for common query patterns

## Running the Migration

### Option 1: Automated Script (Recommended)

```bash
# From the project root directory
./scripts/run_postgis_migration_production.sh
```

This script will:
1. Check current PostGIS status
2. Ask for confirmation
3. Run the complete migration
4. Verify the results

### Option 2: Manual Python Script

```bash
# Check current status
cd backend
python scripts/run_postgis_migrations.py --check-only

# Run complete migration
python scripts/run_postgis_migrations.py

# Verify results
python scripts/run_postgis_migrations.py --verify-only
```

### Option 3: Direct SQL Execution

If you prefer to run the SQL files directly:

```bash
# Connect to the database
psql $DATABASE_URL

# Run the migrations
\i backend/database/migrations/add_postgis_geometry_column.sql
\i backend/database/postgis_indexes.sql
```

## What the Migration Does

### Extensions Enabled
- `postgis`: Spatial data types and functions
- `pg_trgm`: Trigram-based text search

### Tables Modified
- `restaurants`: Adds `geom` column with spatial data
- `mikvah`: Adds spatial indexes (if table exists)
- `synagogues`: Adds spatial indexes (if table exists)

### Indexes Created
- **Spatial Indexes**: GIST indexes for efficient distance queries
- **Text Search Indexes**: GIN indexes for fast text search
- **Composite Indexes**: Optimized for common query patterns

## Verification

After running the migration, verify it worked:

```sql
-- Check extensions
SELECT * FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm');

-- Check geometry columns
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'geom' AND table_schema = 'public';

-- Check spatial indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE indexdef LIKE '%GIST%' AND schemaname = 'public';

-- Test spatial function
SELECT ST_Distance(
    ST_Point(-80.1918, 25.7617),  -- Miami coordinates
    ST_Point(-80.1918, 25.7617)
) as distance_test;
```

## Performance Benefits

After the migration, you'll have:

1. **Efficient Distance Queries**: Use `ST_Distance` and KNN operators
2. **Fast Text Search**: Trigram-based fuzzy search
3. **Optimized Spatial Indexes**: GIST indexes for spatial operations
4. **Automatic Geometry Updates**: Triggers maintain spatial data

## Example Queries

### Distance-based Restaurant Search
```sql
-- Find restaurants within 5 miles of a point
SELECT name, city, 
       ST_Distance(geom, ST_Point(-80.1918, 25.7617)) * 69 as distance_miles
FROM restaurants 
WHERE ST_DWithin(geom, ST_Point(-80.1918, 25.7617), 5/69.0)
ORDER BY geom <-> ST_Point(-80.1918, 25.7617);
```

### Text Search
```sql
-- Fuzzy search for restaurant names
SELECT name, city, 
       similarity(name, 'kosher deli') as similarity_score
FROM restaurants 
WHERE name % 'kosher deli'
ORDER BY similarity_score DESC;
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the database user has `CREATE EXTENSION` privileges
2. **Extension Already Exists**: The migration uses `IF NOT EXISTS`, so it's safe to run multiple times
3. **Geometry Column Exists**: The migration checks for existing columns before adding

### Rollback

If you need to rollback the migration:

```sql
-- Remove geometry column (if needed)
ALTER TABLE restaurants DROP COLUMN IF EXISTS geom;

-- Drop spatial indexes
DROP INDEX IF EXISTS idx_restaurants_geom_gist;
DROP INDEX IF EXISTS idx_restaurants_geom_not_null;
DROP INDEX IF EXISTS idx_restaurants_active_geom;

-- Note: Extensions are not dropped as they might be used elsewhere
```

## Monitoring

After the migration, monitor:
- Query performance improvements
- Index usage statistics
- Spatial query execution times

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%geom%' OR indexname LIKE '%trgm%';
```

## Support

If you encounter issues:
1. Check the migration logs
2. Verify database permissions
3. Ensure all dependencies are installed
4. Contact the development team

## Related Files

- `backend/scripts/run_postgis_migrations.py` - Migration runner script
- `scripts/run_postgis_migration_production.sh` - Production migration script
- `backend/database/migrations/add_postgis_geometry_column.sql` - Geometry migration
- `backend/database/postgis_indexes.sql` - Indexes migration
- `backend/utils/geospatial.py` - Geospatial utility functions
