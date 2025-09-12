-- Local Development Database Setup
-- This script creates the basic schema needed for local development

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
    id VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    category_id VARCHAR,
    owner_id VARCHAR,
    location GEOMETRY(POINT, 4326), -- PostGIS location data
    address TEXT,
    city VARCHAR,
    state VARCHAR,
    zip_code VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    website VARCHAR,
    rating FLOAT,
    review_count INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    images TEXT[], -- Array of image URLs
    long_description TEXT,
    facebook_url VARCHAR,
    instagram_url VARCHAR,
    tiktok_url VARCHAR,
    whatsapp_url VARCHAR
);

-- Create business_hours table
CREATE TABLE IF NOT EXISTS business_hours (
    id SERIAL PRIMARY KEY,
    listing_id VARCHAR REFERENCES listings(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (basic)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_business_hours_listing ON business_hours(listing_id);

-- Insert some sample data
INSERT INTO listings (id, title, description, category_id, location, address, city, state, zip_code, phone, is_active) VALUES
('rest_1', 'Kosher Deli Miami', 'Authentic kosher deli with fresh sandwiches', 'restaurants', ST_SetSRID(ST_Point(-80.1918, 25.7617), 4326), '123 Main St', 'Miami', 'FL', '33101', '305-555-0123', true),
('rest_2', 'Jerusalem Grill', 'Mediterranean kosher cuisine', 'restaurants', ST_SetSRID(ST_Point(-80.2000, 25.7500), 4326), '456 Ocean Dr', 'Miami', 'FL', '33139', '305-555-0456', true),
('rest_3', 'Kosher Pizza Corner', 'Best kosher pizza in town', 'restaurants', ST_SetSRID(ST_Point(-80.1800, 25.7700), 4326), '789 Lincoln Rd', 'Miami Beach', 'FL', '33139', '305-555-0789', true),
('shul_1', 'Temple Beth Shalom', 'Conservative synagogue', 'synagogues', ST_SetSRID(ST_Point(-80.1900, 25.7600), 4326), '321 Collins Ave', 'Miami Beach', 'FL', '33139', '305-555-0321', true),
('shul_2', 'Chabad of Miami', 'Orthodox synagogue', 'synagogues', ST_SetSRID(ST_Point(-80.2100, 25.7400), 4326), '654 Washington Ave', 'Miami Beach', 'FL', '33139', '305-555-0654', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample business hours
INSERT INTO business_hours (listing_id, day_of_week, open_time, close_time) VALUES
('rest_1', 1, '08:00', '20:00'), -- Monday
('rest_1', 2, '08:00', '20:00'), -- Tuesday
('rest_1', 3, '08:00', '20:00'), -- Wednesday
('rest_1', 4, '08:00', '20:00'), -- Thursday
('rest_1', 5, '08:00', '20:00'), -- Friday
('rest_1', 6, '08:00', '20:00'), -- Saturday
('rest_1', 0, '08:00', '20:00'), -- Sunday
('rest_2', 1, '11:00', '22:00'),
('rest_2', 2, '11:00', '22:00'),
('rest_2', 3, '11:00', '22:00'),
('rest_2', 4, '11:00', '22:00'),
('rest_2', 5, '11:00', '22:00'),
('rest_2', 6, '11:00', '22:00'),
('rest_2', 0, '11:00', '22:00')
ON CONFLICT DO NOTHING;
