-- Add PostGIS geometry column to restaurants table
-- This migration adds a geometry column and creates spatial indexes for efficient distance queries

-- Add geometry column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurants' AND column_name = 'geom'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN geom geometry(Point, 4326);
    END IF;
END $$;

-- Populate the geometry column from latitude/longitude
UPDATE restaurants 
SET geom = ST_SetSRID(ST_Point(longitude, latitude), 4326)
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND geom IS NULL;

-- Create spatial index for efficient distance queries
CREATE INDEX IF NOT EXISTS idx_restaurants_geom_gist ON restaurants USING GIST (geom);

-- Create index for restaurants with valid coordinates
CREATE INDEX IF NOT EXISTS idx_restaurants_geom_not_null ON restaurants (id) WHERE geom IS NOT NULL;

-- Create index for active restaurants with valid coordinates
CREATE INDEX IF NOT EXISTS idx_restaurants_active_geom ON restaurants (id) WHERE status = 'active' AND geom IS NOT NULL;

-- Add constraint to ensure geometry is valid when present
ALTER TABLE restaurants ADD CONSTRAINT check_valid_geom 
CHECK (geom IS NULL OR ST_IsValid(geom));

-- Create function to automatically update geometry when lat/lng changes
CREATE OR REPLACE FUNCTION update_restaurant_geometry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326);
    ELSE
        NEW.geom = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geometry
DROP TRIGGER IF EXISTS trigger_update_restaurant_geometry ON restaurants;
CREATE TRIGGER trigger_update_restaurant_geometry
    BEFORE INSERT OR UPDATE OF latitude, longitude ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_restaurant_geometry();

-- Verify the setup
SELECT 
    'PostGIS setup complete' as status,
    COUNT(*) as total_restaurants,
    COUNT(geom) as restaurants_with_geometry,
    COUNT(*) - COUNT(geom) as restaurants_without_geometry
FROM restaurants;
