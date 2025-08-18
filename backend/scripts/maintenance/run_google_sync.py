import os
import sys
from dotenv import load_dotenv

from database.google_places_manager import GooglePlacesManager





#!/usr/bin/env python3
"""
Run Google Places sync to update restaurant data.
"""

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def main():
    """Run the Google Places sync."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return
    
    # Initialize the manager
    manager = GooglePlacesManager(database_url)
    
    # Connect to database
    if not manager.connect():
        print("❌ Failed to connect to database")
        return
    
    print("✅ Connected to database")
    
    # Get current statistics
    stats = manager.get_statistics()
    print(f"📊 Current stats: {stats}")
    
    # Run periodic updates
    print("🔄 Running Google Places sync...")
    update_stats = manager.run_periodic_updates(batch_size=10)
    
    print(f"✅ Sync completed!")
    print(f"   Total processed: {update_stats['total_processed']}")
    print(f"   Successful: {update_stats['successful_updates']}")
    print(f"   Failed: {update_stats['failed_updates']}")
    print(f"   Skipped: {update_stats['skipped_updates']}")
    
    # Get updated statistics
    new_stats = manager.get_statistics()
    print(f"📊 Updated stats: {new_stats}")
    
    # Disconnect
    manager.disconnect()
    print("✅ Disconnected from database")

if __name__ == "__main__":
    main()
