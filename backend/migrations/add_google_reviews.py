#!/usr/bin/env python3
"""
Migration script to add Google reviews support.
This script adds the place_id field to restaurants table and creates the google_reviews table.
"""

import os
import sys
from sqlalchemy import create_engine, text, MetaData, Table, Column, String, Integer, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def run_migration():
    """Run the migration to add Google reviews support."""
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'config.env'))
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not found")
        return False
    
    # Fix PostgreSQL URL format if needed
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Add place_id column to restaurants table if it doesn't exist
            print("Adding place_id column to restaurants table...")
            try:
                conn.execute(text("""
                    ALTER TABLE restaurants 
                    ADD COLUMN place_id VARCHAR(255)
                """))
                conn.commit()
                print("✓ Added place_id column to restaurants table")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("✓ place_id column already exists in restaurants table")
                else:
                    print(f"Warning: Could not add place_id column: {e}")
            
            # Create google_reviews table
            print("Creating google_reviews table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS google_reviews (
                    id VARCHAR(50) PRIMARY KEY,
                    restaurant_id INTEGER NOT NULL,
                    place_id VARCHAR(255) NOT NULL,
                    google_review_id VARCHAR(255) NOT NULL,
                    author_name VARCHAR(255) NOT NULL,
                    author_url VARCHAR(500),
                    profile_photo_url VARCHAR(500),
                    rating INTEGER NOT NULL,
                    text TEXT,
                    time TIMESTAMP NOT NULL,
                    relative_time_description VARCHAR(100),
                    language VARCHAR(10),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
            """))
            conn.commit()
            print("✓ Created google_reviews table")
            
            # Add indexes for better performance
            print("Adding indexes...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_google_reviews_restaurant_id 
                ON google_reviews(restaurant_id)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_google_reviews_place_id 
                ON google_reviews(place_id)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_google_reviews_time 
                ON google_reviews(time DESC)
            """))
            conn.commit()
            print("✓ Added indexes to google_reviews table")
            
            print("\n🎉 Migration completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
