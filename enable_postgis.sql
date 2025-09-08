-- Enable PostGIS extensions for cursor-based pagination with distance sorting
-- This script enables the required extensions for the JewGo app

-- Enable cube extension (required for earthdistance)
CREATE EXTENSION IF NOT EXISTS cube;

-- Enable earthdistance extension (for geographic distance calculations)
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Enable postgis extension (for spatial data support)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify extensions are enabled
SELECT extname, extversion FROM pg_extension WHERE extname IN ('cube', 'earthdistance', 'postgis') ORDER BY extname;

-- Test earthdistance functions
SELECT 'Testing ll_to_earth function...' as test;
SELECT ll_to_earth(40.7128, -74.0060) as nyc_point;

SELECT 'Testing earth_distance function...' as test;
SELECT earth_distance(
    ll_to_earth(40.7128, -74.0060),
    ll_to_earth(40.7589, -73.9851)
) as distance_meters;

SELECT 'PostGIS extensions enabled successfully!' as status;
