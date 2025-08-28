-- Create categories table for marketplace functionality
-- Migration: 20250101000010_create_categories_table.sql

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_active ON subcategories(active);
CREATE INDEX IF NOT EXISTS idx_subcategories_sort_order ON subcategories(sort_order);

-- Insert some default categories for marketplace
INSERT INTO categories (name, slug, sort_order, active) VALUES
    ('Baked Goods', 'baked-goods', 1, true),
    ('Accessories', 'accessories', 2, true),
    ('Books & Media', 'books-media', 3, true),
    ('Clothing', 'clothing', 4, true),
    ('Home & Garden', 'home-garden', 5, true),
    ('Jewelry', 'jewelry', 6, true),
    ('Food & Beverages', 'food-beverages', 7, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert some default subcategories
INSERT INTO subcategories (category_id, name, slug, sort_order, active) 
SELECT 
    c.id,
    sub.name,
    sub.slug,
    sub.sort_order,
    sub.active
FROM categories c
CROSS JOIN (
    VALUES 
        ('Bread', 'bread', 1, true),
        ('Pastries', 'pastries', 2, true),
        ('Cakes', 'cakes', 3, true),
        ('Cookies', 'cookies', 4, true)
) AS sub(name, slug, sort_order, active)
WHERE c.slug = 'baked-goods'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Add RLS policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active categories and subcategories
CREATE POLICY "Allow public read access to active categories" ON categories
    FOR SELECT USING (active = true);

CREATE POLICY "Allow public read access to active subcategories" ON subcategories
    FOR SELECT USING (active = true);

-- Allow authenticated users to manage categories (for admin functionality)
CREATE POLICY "Allow authenticated users to manage categories" ON categories
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage subcategories" ON subcategories
    FOR ALL USING (auth.role() = 'authenticated');
