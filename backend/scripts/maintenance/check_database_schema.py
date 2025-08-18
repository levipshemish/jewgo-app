import os
import sys
from dotenv import load_dotenv

from database.database_manager_v3 import EnhancedDatabaseManager

        



        from sqlalchemy import text

#!/usr/bin/env python3
"""
Check the database schema to see if the hours columns exist.
"""

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_database_schema():
    """Check the database schema for hours-related columns."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return
    
    # Initialize database manager
    db_manager = EnhancedDatabaseManager(database_url)
    
    try:
        # Connect to database
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return
        
        print("✅ Connected to database")
        
        # Check the schema of the restaurants table
        schema_query = text("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'restaurants'
        AND column_name IN ('hours_json', 'hours_of_operation', 'google_place_id', 'formatted_address', 'last_google_sync_at')
        ORDER BY column_name
        """)
        
        with db_manager.get_session() as session:
            columns = session.execute(schema_query).fetchall()
        
        print(f"\n📋 Database Schema for hours-related columns:")
        for column in columns:
            print(f"   {column[0]}: {column[1]} (nullable: {column[2]}, default: {column[3]})")
        
        # Check if columns exist
        column_names = [col[0] for col in columns]
        print(f"\n✅ Found columns: {column_names}")
        
        # Check a sample restaurant to see actual data
        sample_query = text("""
        SELECT id, name, hours_json, hours_of_operation, google_place_id, formatted_address, last_google_sync_at
        FROM restaurants 
        WHERE id = 1468
        """)
        
        with db_manager.get_session() as session:
            sample = session.execute(sample_query).fetchone()
        
        if sample:
            print(f"\n📊 Sample restaurant (ID 1468 - Hollywood Deli):")
            print(f"   Name: {sample[1]}")
            print(f"   hours_json: {sample[2]}")
            print(f"   hours_of_operation: {sample[3]}")
            print(f"   google_place_id: {sample[4]}")
            print(f"   formatted_address: {sample[5]}")
            print(f"   last_google_sync_at: {sample[6]}")
        
    except Exception as e:
        print(f"❌ Error checking database schema: {e}")
    finally:
        db_manager.disconnect()

if __name__ == "__main__":
    check_database_schema()
