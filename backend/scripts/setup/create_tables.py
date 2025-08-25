#!/usr/bin/env python3
"""
Simple script to create base database tables using SQLAlchemy models.
"""

import os
import sys
from sqlalchemy import create_engine, text
from database.models import Base

def create_base_tables():
    """Create base database tables."""
    try:
        # Get database URL from environment
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL environment variable not set")
            return False
        
        print(f"🔗 Connecting to database: {database_url}")
        
        # Create engine
        engine = create_engine(database_url)
        
        # Create all tables
        print("📋 Creating base tables...")
        Base.metadata.create_all(engine)
        
        print("✅ Base tables created successfully!")
        
        # Test connection and show table info
        with engine.connect() as conn:
            # Check if restaurants table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'restaurants'
                )
            """))
            table_exists = result.fetchone()[0]
            
            if table_exists:
                print("✅ Restaurants table exists")
                
                # Count rows
                result = conn.execute(text("SELECT COUNT(*) FROM restaurants"))
                count = result.fetchone()[0]
                print(f"📊 Restaurants table has {count} rows")
            else:
                print("❌ Restaurants table not found")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == "__main__":
    success = create_base_tables()
    if success:
        print("\n🚀 Base tables created successfully!")
        print("You can now run the distance filtering migration.")
    else:
        print("\n❌ Failed to create base tables.")
        sys.exit(1)
