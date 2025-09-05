-- Create stores table for Jewish stores and businesses
-- This table stores information about kosher stores, Judaica shops, and other Jewish businesses

CREATE TABLE IF NOT EXISTS stores (
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
    
    -- Store specific fields
    store_type VARCHAR(100), -- grocery, judaica, bakery, butcher, etc.
    store_category VARCHAR(100), -- kosher, glatt, cholov yisroel, etc.
    business_hours TEXT,
    hours_parsed BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50),
    
    -- Store features
    has_parking BOOLEAN DEFAULT FALSE,
    has_delivery BOOLEAN DEFAULT FALSE,
    has_pickup BOOLEAN DEFAULT FALSE,
    accepts_credit_cards BOOLEAN DEFAULT TRUE,
    accepts_cash BOOLEAN DEFAULT TRUE,
    
    -- Kosher information
    kosher_certification VARCHAR(255),
    kosher_category VARCHAR(100), -- glatt, cholov yisroel, pas yisroel, etc.
    is_cholov_yisroel BOOLEAN DEFAULT FALSE,
    is_pas_yisroel BOOLEAN DEFAULT FALSE,
    
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
    listing_type VARCHAR(100) DEFAULT 'store'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city);
CREATE INDEX IF NOT EXISTS idx_stores_state ON stores(state);
CREATE INDEX IF NOT EXISTS idx_stores_store_type ON stores(store_type);
CREATE INDEX IF NOT EXISTS idx_stores_store_category ON stores(store_category);
CREATE INDEX IF NOT EXISTS idx_stores_kosher_certification ON stores(kosher_certification);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_is_verified ON stores(is_verified);
CREATE INDEX IF NOT EXISTS idx_stores_location ON stores(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_stores_rating ON stores(rating);
CREATE INDEX IF NOT EXISTS idx_stores_created_at ON stores(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_stores_updated_at();
