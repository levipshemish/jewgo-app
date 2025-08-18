import os
import sys
from dotenv import load_dotenv

from database.database_manager_v3 import EnhancedDatabaseManager

        
                import json



        from sqlalchemy import text

#!/usr/bin/env python3
"""
Check a sample restaurant's hours data.
"""

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_sample_hours():
    """Check a sample restaurant's hours data."""
    
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
        
        # Check a few sample restaurants
        sample_query = text("""
        SELECT id, name, hours_json, hours_of_operation, google_place_id, formatted_address, last_google_sync_at
        FROM restaurants 
        WHERE hours_json IS NOT NULL
        ORDER BY id
        LIMIT 5
        """)
        
        with db_manager.get_session() as session:
            samples = session.execute(sample_query).fetchall()
        
        print(f"\n📊 Sample restaurants with hours data:")
        for sample in samples:
            print(f"\n🏪 Restaurant {sample[0]}: {sample[1]}")
            print(f"   Google Place ID: {sample[4]}")
            print(f"   Formatted Address: {sample[5]}")
            print(f"   Last Sync: {sample[6]}")
            print(f"   Hours Text: {sample[3][:100]}..." if sample[3] else "   Hours Text: None")
            
            # Parse and display JSON hours
            if sample[2]:
                try:
                    hours_data = json.loads(sample[2]) if isinstance(sample[2], str) else sample[2]
                    print(f"   Open Now: {hours_data.get('open_now', 'Unknown')}")
                    if hours_data.get('weekday_text'):
                        print(f"   Hours:")
                        for day in hours_data['weekday_text'][:3]:  # Show first 3 days
                            print(f"     {day}")
                        if len(hours_data['weekday_text']) > 3:
                            print(f"     ... and {len(hours_data['weekday_text']) - 3} more days")
                except Exception as e:
                    print(f"   Error parsing hours JSON: {e}")
        
    except Exception as e:
        print(f"❌ Error checking sample hours: {e}")
    finally:
        db_manager.disconnect()

if __name__ == "__main__":
    check_sample_hours()
