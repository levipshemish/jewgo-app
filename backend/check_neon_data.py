#!/usr/bin/env python3
"""
Check Neon Database Data
=======================

This script checks what data exists in the Neon database.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def connect_to_neon_db():
    """Connect to Neon PostgreSQL database."""
    neon_url = os.getenv("NEON_DATABASE_URL")
    if not neon_url:
        print("❌ NEON_DATABASE_URL not found in environment")
        return None
    
    try:
        engine = create_engine(
            neon_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 30}
        )
        return engine
    except Exception as e:
        print(f"Failed to connect to Neon database: {e}")
        return None

def check_neon_data(engine):
    """Check data in Neon database."""
    tables = [
        'restaurants',
        'restaurant_images',
        'reviews',
        'florida_synagogues',
        'google_places_data',
        'marketplace',
        'marketplace_subcategories',
        'review_flags'
    ]
    
    print("📊 Neon Database Data Summary:")
    print("-" * 40)
    
    total_rows = 0
    for table in tables:
        try:
            with engine.connect() as conn:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"✅ {table}: {count} rows")
                total_rows += count
        except SQLAlchemyError as e:
            print(f"⚠️  {table}: Error - {e}")
    
    print(f"\n📊 Total rows in Neon: {total_rows}")
    return total_rows

def show_sample_data(engine, table_name, limit=3):
    """Show sample data from a table."""
    print(f"\n🔍 Sample data from {table_name}:")
    print("-" * 50)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT * FROM {table_name} LIMIT {limit}"))
            rows = result.fetchall()
            columns = result.keys()
            
            print(f"Columns: {list(columns)}")
            print(f"Rows: {len(rows)}")
            
            for i, row in enumerate(rows, 1):
                print(f"Row {i}: {row}")
                
    except SQLAlchemyError as e:
        print(f"Error getting sample data from {table_name}: {e}")

def main():
    """Main function."""
    print("🔍 Neon Database Data Check")
    print("=" * 60)
    
    # Connect to Neon database
    engine = connect_to_neon_db()
    if not engine:
        print("❌ Failed to connect to Neon database")
        return False
    
    print("✅ Connected to Neon PostgreSQL database")
    
    # Check data
    total_rows = check_neon_data(engine)
    
    if total_rows > 0:
        print(f"\n✅ Found {total_rows} rows of data in Neon database")
        
        # Show sample data from key tables
        key_tables = ['restaurants', 'restaurant_images', 'florida_synagogues']
        for table in key_tables:
            show_sample_data(engine, table, 2)
    else:
        print("❌ No data found in Neon database")
    
    return total_rows > 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
