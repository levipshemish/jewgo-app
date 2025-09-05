-- Create mikvah table for Jewish mikvah facilities
-- This table stores information about mikvah facilities and their services

CREATE TABLE IF NOT EXISTS mikvah (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone_number VARCHAR(50),
    website VARCHAR(500),
    email VARCHAR(255),
    
    -- Mikvah specific fields
    mikvah_type VARCHAR(100), -- women, men, community, private, etc.
    mikvah_category VARCHAR(100), -- orthodox, conservative, reform, etc.
    business_hours TEXT,
    hours_parsed BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50),
    
    -- Mikvah features and services
    has_parking BOOLEAN DEFAULT FALSE,
    has_disabled_access BOOLEAN DEFAULT FALSE,
    has_heating BOOLEAN DEFAULT TRUE,
    has_air_conditioning BOOLEAN DEFAULT TRUE,
    has_private_changing_rooms BOOLEAN DEFAULT TRUE,
    has_amenities BOOLEAN DEFAULT FALSE,
    
    -- Kosher information
    kosher_certification VARCHAR(255),
    kosher_category VARCHAR(100), -- glatt, cholov yisroel, etc.
    is_cholov_yisroel BOOLEAN DEFAULT FALSE,
    is_pas_yisroel BOOLEAN DEFAULT FALSE,
    
    -- Mikvah specific services
    has_attendant BOOLEAN DEFAULT TRUE,
    has_private_sessions BOOLEAN DEFAULT FALSE,
    has_group_sessions BOOLEAN DEFAULT FALSE,
    has_educational_programs BOOLEAN DEFAULT FALSE,
    
    -- Pricing and fees
    has_fees BOOLEAN DEFAULT FALSE,
    fee_amount DECIMAL(10, 2),
    fee_currency VARCHAR(3) DEFAULT 'USD',
    accepts_credit_cards BOOLEAN DEFAULT TRUE,
    accepts_cash BOOLEAN DEFAULT TRUE,
    
    -- Ratings and reviews
    rating DECIMAL(3, 2),
    review_count INTEGER DEFAULT 0,
    star_rating DECIMAL(3, 2),
    google_rating DECIMAL(3, 2),
    
    -- Images and media
    image_url VARCHAR(2000),
    logo_url VARCHAR(2000),
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Search and filtering
    tags TEXT[],
    admin_notes TEXT,
    specials TEXT,
    listing_type VARCHAR(100) DEFAULT 'mikvah'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mikvah_city ON mikvah(city);
CREATE INDEX IF NOT EXISTS idx_mikvah_state ON mikvah(state);
CREATE INDEX IF NOT EXISTS idx_mikvah_mikvah_type ON mikvah(mikvah_type);
CREATE INDEX IF NOT EXISTS idx_mikvah_mikvah_category ON mikvah(mikvah_category);
CREATE INDEX IF NOT EXISTS idx_mikvah_kosher_certification ON mikvah(kosher_certification);
CREATE INDEX IF NOT EXISTS idx_mikvah_is_active ON mikvah(is_active);
CREATE INDEX IF NOT EXISTS idx_mikvah_is_verified ON mikvah(is_verified);
CREATE INDEX IF NOT EXISTS idx_mikvah_location ON mikvah(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_mikvah_rating ON mikvah(rating);
CREATE INDEX IF NOT EXISTS idx_mikvah_created_at ON mikvah(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_mikvah_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_mikvah_updated_at
    BEFORE UPDATE ON mikvah
    FOR EACH ROW
    EXECUTE FUNCTION update_mikvah_updated_at();
