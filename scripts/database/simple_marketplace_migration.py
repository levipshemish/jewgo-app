#!/usr/bin/env python3
"""Simple Marketplace Migration Script.
===========================================
This script directly creates the marketplace table and populates sample data.
Simplified version to avoid complex dependency issues.
"""

import os
import sys
import json
from datetime import datetime, date
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables from backend/.env
env_file = project_root / "backend" / ".env"
if env_file.exists():
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

def create_marketplace_table():
    """Create the marketplace table using raw SQL."""
    try:
        import psycopg
        from psycopg.rows import dict_row
        
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL environment variable is required")
            return False
        
        # Convert SQLAlchemy URL format to psycopg format
        if database_url.startswith('postgresql+psycopg://'):
            database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
        
        print("🔗 Connecting to database...")
        with psycopg.connect(database_url) as conn:
            print("✅ Database connection established")
            
            # Check if table already exists
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'marketplace'
                    );
                """)
                table_exists = cur.fetchone()[0]
                
                if table_exists:
                    print("✅ Marketplace table already exists")
                    return True
            
            print("🏗️ Creating marketplace table...")
            
            # Create marketplace table
            create_table_sql = """
            CREATE TABLE marketplace (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                
                -- Required Fields
                name VARCHAR(255) NOT NULL,
                title VARCHAR(500) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                category VARCHAR(100) NOT NULL,
                location VARCHAR(500) NOT NULL,
                
                -- Location Details
                city VARCHAR(100) NOT NULL,
                state VARCHAR(50) NOT NULL,
                zip_code VARCHAR(20) NOT NULL,
                latitude FLOAT,
                longitude FLOAT,
                
                -- Product Images
                product_image VARCHAR(2000),
                additional_images TEXT[],
                thumbnail VARCHAR(2000),
                
                -- Product Details
                subcategory VARCHAR(100),
                description TEXT,
                original_price DECIMAL(10, 2),
                currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
                stock INTEGER DEFAULT 0 NOT NULL,
                is_available BOOLEAN DEFAULT TRUE NOT NULL,
                is_featured BOOLEAN DEFAULT FALSE NOT NULL,
                is_on_sale BOOLEAN DEFAULT FALSE NOT NULL,
                discount_percentage INTEGER,
                
                -- Vendor Information
                vendor_name VARCHAR(255) NOT NULL,
                vendor_id VARCHAR(100),
                vendor_logo VARCHAR(2000),
                vendor_address VARCHAR(500),
                vendor_phone VARCHAR(50),
                vendor_email VARCHAR(255),
                vendor_website VARCHAR(500),
                vendor_rating FLOAT,
                vendor_review_count INTEGER DEFAULT 0 NOT NULL,
                vendor_is_verified BOOLEAN DEFAULT FALSE NOT NULL,
                vendor_is_premium BOOLEAN DEFAULT FALSE NOT NULL,
                
                -- Kosher Certification
                kosher_agency VARCHAR(100),
                kosher_level VARCHAR(50),
                kosher_certificate_number VARCHAR(100),
                kosher_expiry_date DATE,
                kosher_is_verified BOOLEAN DEFAULT FALSE NOT NULL,
                
                -- Dietary Information
                is_gluten_free BOOLEAN DEFAULT FALSE NOT NULL,
                is_dairy_free BOOLEAN DEFAULT FALSE NOT NULL,
                is_nut_free BOOLEAN DEFAULT FALSE NOT NULL,
                is_vegan BOOLEAN DEFAULT FALSE NOT NULL,
                is_vegetarian BOOLEAN DEFAULT FALSE NOT NULL,
                allergens TEXT[],
                
                -- Product Metadata
                tags TEXT[],
                specifications JSONB,
                shipping_info JSONB,
                
                -- Ratings & Reviews
                rating FLOAT DEFAULT 0.0 NOT NULL,
                review_count INTEGER DEFAULT 0 NOT NULL,
                
                -- Business Logic
                status VARCHAR(20) DEFAULT 'active' NOT NULL,
                priority INTEGER DEFAULT 0 NOT NULL,
                expiry_date DATE,
                created_by VARCHAR(100),
                approved_by VARCHAR(100),
                approved_at TIMESTAMP,
                
                -- Additional Information
                notes TEXT,
                external_id VARCHAR(100),
                source VARCHAR(50) DEFAULT 'manual' NOT NULL
            );
            """
            
            with conn.cursor() as cur:
                cur.execute(create_table_sql)
                
                # Create indexes
                indexes = [
                    "CREATE INDEX idx_marketplace_name ON marketplace(name);",
                    "CREATE INDEX idx_marketplace_category ON marketplace(category);",
                    "CREATE INDEX idx_marketplace_subcategory ON marketplace(subcategory);",
                    "CREATE INDEX idx_marketplace_vendor_name ON marketplace(vendor_name);",
                    "CREATE INDEX idx_marketplace_price ON marketplace(price);",
                    "CREATE INDEX idx_marketplace_status ON marketplace(status);",
                    "CREATE INDEX idx_marketplace_is_featured ON marketplace(is_featured);",
                    "CREATE INDEX idx_marketplace_is_on_sale ON marketplace(is_on_sale);",
                    "CREATE INDEX idx_marketplace_rating ON marketplace(rating);",
                    "CREATE INDEX idx_marketplace_created_at ON marketplace(created_at);",
                    "CREATE INDEX idx_marketplace_location ON marketplace(city, state);",
                    "CREATE INDEX idx_marketplace_kosher_agency ON marketplace(kosher_agency);",
                    "CREATE INDEX idx_marketplace_kosher_level ON marketplace(kosher_level);",
                    "CREATE INDEX idx_marketplace_vendor_id ON marketplace(vendor_id);",
                    "CREATE INDEX idx_marketplace_external_id ON marketplace(external_id);"
                ]
                
                for index_sql in indexes:
                    cur.execute(index_sql)
                
                # Create full-text search index
                cur.execute("""
                    CREATE INDEX idx_marketplace_search 
                    ON marketplace USING gin(to_tsvector('english', name || ' ' || title || ' ' || COALESCE(description, '')));
                """)
                
                # Add constraints
                constraints = [
                    "ALTER TABLE marketplace ADD CONSTRAINT check_price_positive CHECK (price >= 0);",
                    "ALTER TABLE marketplace ADD CONSTRAINT check_stock_positive CHECK (stock >= 0);",
                    "ALTER TABLE marketplace ADD CONSTRAINT check_rating_range CHECK (rating >= 0 AND rating <= 5);",
                    "ALTER TABLE marketplace ADD CONSTRAINT check_discount_range CHECK (discount_percentage >= 0 AND discount_percentage <= 100);",
                    "ALTER TABLE marketplace ADD CONSTRAINT check_status_valid CHECK (status IN ('active', 'inactive', 'pending', 'sold_out'));",
                    "ALTER TABLE marketplace ADD CONSTRAINT check_kosher_level_valid CHECK (kosher_level IN ('glatt', 'regular', 'chalav_yisrael', 'pas_yisrael'));"
                ]
                
                for constraint_sql in constraints:
                    cur.execute(constraint_sql)
            
            print("✅ Marketplace table created successfully with indexes and constraints")
            return True
            
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install psycopg: pip install psycopg[binary]")
        return False
    except Exception as e:
        print(f"❌ Error creating marketplace table: {e}")
        return False

def populate_sample_data():
    """Populate the marketplace table with sample data."""
    try:
        import psycopg
        from psycopg.rows import dict_row
        
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL environment variable is required")
            return False
        
        # Convert SQLAlchemy URL format to psycopg format
        if database_url.startswith('postgresql+psycopg://'):
            database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
        
        print("📊 Populating sample data...")
        
        with psycopg.connect(database_url) as conn:
            # Check if data already exists
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM marketplace")
                count = cur.fetchone()[0]
                
                if count > 0:
                    print(f"✅ Marketplace table already contains {count} records")
                    return True
            
            # Sample marketplace listings
            sample_listings = [
                {
                    "name": "Glatt Kosher Beef Brisket",
                    "title": "Premium Quality Beef Brisket - Perfect for Shabbat",
                    "price": 45.99,
                    "original_price": 59.99,
                    "category": "Meat & Poultry",
                    "subcategory": "Beef",
                    "location": "123 Main Street, Miami, FL 33101",
                    "city": "Miami",
                    "state": "FL",
                    "zip_code": "33101",
                    "vendor_name": "Kosher Delights Market",
                    "vendor_id": "kd_001",
                    "vendor_address": "123 Main Street, Miami, FL 33101",
                    "vendor_phone": "(305) 555-0123",
                    "vendor_email": "info@kosherdelights.com",
                    "vendor_website": "https://kosherdelights.com",
                    "vendor_rating": 4.7,
                    "vendor_review_count": 234,
                    "vendor_is_verified": True,
                    "vendor_is_premium": True,
                    "product_image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
                    "thumbnail": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
                    "additional_images": [
                        "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
                        "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop"
                    ],
                    "description": "Premium quality beef brisket, perfect for Shabbat meals. Hand-selected and expertly prepared. This tender, flavorful brisket is ideal for special occasions and family gatherings.",
                    "stock": 15,
                    "is_available": True,
                    "is_featured": True,
                    "is_on_sale": True,
                    "discount_percentage": 23,
                    "kosher_agency": "OU",
                    "kosher_level": "glatt",
                    "kosher_certificate_number": "OU-12345",
                    "kosher_expiry_date": date(2025, 12, 31),
                    "kosher_is_verified": True,
                    "is_gluten_free": False,
                    "is_dairy_free": True,
                    "is_nut_free": True,
                    "is_vegan": False,
                    "is_vegetarian": False,
                    "allergens": ["beef"],
                    "tags": ["meat", "brisket", "shabbat", "glatt", "premium"],
                    "specifications": json.dumps({
                        "weight": "3-4 lbs",
                        "cut": "Brisket",
                        "preparation": "Ready to cook",
                        "storage": "Refrigerate or freeze"
                    }),
                    "shipping_info": json.dumps({
                        "weight": 4.0,
                        "dimensions": {"length": 12, "width": 8, "height": 3},
                        "shipping_methods": [
                            {"name": "Standard", "price": 5.99, "estimated_days": 3},
                            {"name": "Express", "price": 12.99, "estimated_days": 1}
                        ]
                    }),
                    "rating": 4.8,
                    "review_count": 127,
                    "status": "active",
                    "priority": 10,
                    "created_by": "admin",
                    "source": "manual"
                },
                {
                    "name": "Chalav Yisrael Milk",
                    "title": "Fresh Chalav Yisrael Whole Milk - 1 Gallon",
                    "price": 8.99,
                    "category": "Dairy",
                    "subcategory": "Milk",
                    "location": "456 Oak Avenue, Miami, FL 33102",
                    "city": "Miami",
                    "state": "FL",
                    "zip_code": "33102",
                    "vendor_name": "Kosher Dairy Farm",
                    "vendor_id": "kdf_001",
                    "vendor_address": "456 Oak Avenue, Miami, FL 33102",
                    "vendor_phone": "(305) 555-0456",
                    "vendor_email": "orders@kosherdairy.com",
                    "vendor_website": "https://kosherdairy.com",
                    "vendor_rating": 4.9,
                    "vendor_review_count": 156,
                    "vendor_is_verified": True,
                    "vendor_is_premium": True,
                    "product_image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&h=600&fit=crop",
                    "thumbnail": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop",
                    "description": "Fresh chalav yisrael whole milk, sourced from our own kosher dairy farm. Rich, creamy, and perfect for all your dairy needs.",
                    "stock": 50,
                    "is_available": True,
                    "is_featured": True,
                    "is_on_sale": False,
                    "kosher_agency": "OU",
                    "kosher_level": "chalav_yisrael",
                    "kosher_certificate_number": "OU-67890",
                    "kosher_expiry_date": date(2025, 6, 30),
                    "kosher_is_verified": True,
                    "is_gluten_free": True,
                    "is_dairy_free": False,
                    "is_nut_free": True,
                    "is_vegan": False,
                    "is_vegetarian": True,
                    "allergens": ["milk"],
                    "tags": ["dairy", "milk", "chalav_yisrael", "fresh", "kosher"],
                    "rating": 4.9,
                    "review_count": 89,
                    "status": "active",
                    "priority": 8,
                    "created_by": "admin",
                    "source": "manual"
                }
            ]
            
            # Insert sample data
            with conn.cursor() as cur:
                for listing in sample_listings:
                    cur.execute("""
                        INSERT INTO marketplace (
                            name, title, price, original_price, category, subcategory, location,
                            city, state, zip_code, vendor_name, vendor_id, vendor_address,
                            vendor_phone, vendor_email, vendor_website, vendor_rating,
                            vendor_review_count, vendor_is_verified, vendor_is_premium,
                            product_image, thumbnail, additional_images, description,
                            stock, is_available, is_featured, is_on_sale, discount_percentage,
                            kosher_agency, kosher_level, kosher_certificate_number,
                            kosher_expiry_date, kosher_is_verified, is_gluten_free,
                            is_dairy_free, is_nut_free, is_vegan, is_vegetarian,
                            allergens, tags, specifications, shipping_info, rating,
                            review_count, status, priority, created_by, source
                        ) VALUES (
                            %(name)s, %(title)s, %(price)s, %(original_price)s, %(category)s,
                            %(subcategory)s, %(location)s, %(city)s, %(state)s, %(zip_code)s,
                            %(vendor_name)s, %(vendor_id)s, %(vendor_address)s, %(vendor_phone)s,
                            %(vendor_email)s, %(vendor_website)s, %(vendor_rating)s,
                            %(vendor_review_count)s, %(vendor_is_verified)s, %(vendor_is_premium)s,
                            %(product_image)s, %(thumbnail)s, %(additional_images)s, %(description)s,
                            %(stock)s, %(is_available)s, %(is_featured)s, %(is_on_sale)s,
                            %(discount_percentage)s, %(kosher_agency)s, %(kosher_level)s,
                            %(kosher_certificate_number)s, %(kosher_expiry_date)s,
                            %(kosher_is_verified)s, %(is_gluten_free)s, %(is_dairy_free)s,
                            %(is_nut_free)s, %(is_vegan)s, %(is_vegetarian)s, %(allergens)s,
                            %(tags)s, %(specifications)s, %(shipping_info)s, %(rating)s,
                            %(review_count)s, %(status)s, %(priority)s, %(created_by)s, %(source)s
                        )
                    """, listing)
            
            print(f"✅ Successfully inserted {len(sample_listings)} sample marketplace listings")
            return True
            
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install psycopg: pip install psycopg[binary]")
        return False
    except Exception as e:
        print(f"❌ Error populating sample data: {e}")
        return False

def verify_migration():
    """Verify that the migration was successful."""
    try:
        import psycopg
        
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL environment variable is required")
            return False
        
        # Convert SQLAlchemy URL format to psycopg format
        if database_url.startswith('postgresql+psycopg://'):
            database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
        
        print("🔍 Verifying migration...")
        
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cur:
                # Check table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'marketplace'
                    );
                """)
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    print("❌ Marketplace table does not exist")
                    return False
                
                # Check record count
                cur.execute("SELECT COUNT(*) FROM marketplace")
                count = cur.fetchone()[0]
                
                print(f"✅ Marketplace table exists with {count} records")
                
                # Check sample data
                cur.execute("SELECT name, vendor_name, price FROM marketplace LIMIT 3")
                samples = cur.fetchall()
                
                print("📋 Sample records:")
                for sample in samples:
                    print(f"  - {sample[0]} by {sample[1]} (${sample[2]})")
                
                return True
                
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        return False
    except Exception as e:
        print(f"❌ Error verifying migration: {e}")
        return False

def main():
    """Main execution function."""
    print("🚀 Starting simple marketplace migration...")
    
    try:
        # Step 1: Create marketplace table
        if not create_marketplace_table():
            print("❌ Failed to create marketplace table")
            return 1
        
        # Step 2: Populate sample data
        if not populate_sample_data():
            print("❌ Failed to populate sample data")
            return 1
        
        # Step 3: Verify migration
        if not verify_migration():
            print("❌ Migration verification failed")
            return 1
        
        print("\n🎉 Marketplace migration completed successfully!")
        print("✅ Database table created")
        print("✅ Sample data populated")
        print("✅ Migration verified")
        print("\n📋 Next steps:")
        print("1. Test marketplace functionality in the application")
        print("2. Configure Redis caching if needed")
        print("3. Set up monitoring and alerts")
        
        return 0
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
