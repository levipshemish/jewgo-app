#!/usr/bin/env python3
"""
Simple script to create the subcategories table in the production database.
This script connects directly to the database and creates the missing table.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

def create_subcategories_table():
    """Create the subcategories table if it doesn't exist."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        return False
    
    try:
        print("🔧 Connecting to database...")
        conn = psycopg2.connect(database_url, sslmode='require')
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if subcategories table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'subcategories'
            );
        """)
        table_exists = cursor.fetchone()['exists']
        
        if table_exists:
            print("✅ Subcategories table already exists")
            return True
        
        print("📝 Creating subcategories table...")
        
        # Create the subcategories table
        cursor.execute("""
            CREATE TABLE subcategories (
                id SERIAL PRIMARY KEY,
                category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                icon VARCHAR(50),
                slug VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);")
        cursor.execute("CREATE INDEX idx_subcategories_slug ON subcategories(slug);")
        
        conn.commit()
        print("✅ Subcategories table created successfully!")
        
        # Verify the table was created
        cursor.execute("SELECT COUNT(*) FROM subcategories;")
        count = cursor.fetchone()['count']
        print(f"📊 Table contains {count} records")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating subcategories table: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    success = create_subcategories_table()
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("💥 Migration failed!")
        exit(1)
