#!/usr/bin/env python3
"""Check Shuls Coordinates Status.
========================================

This script checks the current status of latitude and longitude coordinates
for shuls in the database.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_coordinates_status():
    """Check the status of coordinates in the shuls table."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False
    
    try:
        # Create engine
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check total count
        cursor.execute("SELECT COUNT(*) as total FROM shuls")
        total_result = cursor.fetchone()
        total_count = total_result['total'] if total_result else 0
        
        # Check coordinates status
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coordinates,
                COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as missing_coordinates,
                COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as with_address,
                COUNT(CASE WHEN address IS NULL OR address = '' THEN 1 END) as without_address
            FROM shuls
        """)
        
        status_result = cursor.fetchone()
        
        # Check by city
        cursor.execute("""
            SELECT 
                city,
                COUNT(*) as total,
                COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coordinates,
                COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as missing_coordinates
            FROM shuls
            WHERE city IS NOT NULL AND city != ''
            GROUP BY city
            ORDER BY city
        """)
        
        city_status = cursor.fetchall()
        
        # Get sample of shuls missing coordinates
        cursor.execute("""
            SELECT id, name, address, city, state, zip_code
            FROM shuls
            WHERE (latitude IS NULL OR longitude IS NULL)
            AND address IS NOT NULL AND address != ''
            LIMIT 10
        """)
        
        sample_missing = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Print results
        print("🔍 SHULS COORDINATES STATUS REPORT")
        print("=" * 50)
        print(f"Total shuls in database: {total_count}")
        print(f"Shuls with coordinates: {status_result['with_coordinates']}")
        print(f"Shuls missing coordinates: {status_result['missing_coordinates']}")
        print(f"Shuls with address data: {status_result['with_address']}")
        print(f"Shuls without address data: {status_result['without_address']}")
        
        if total_count > 0:
            coordinate_percentage = (status_result['with_coordinates'] / total_count) * 100
            print(f"Coordinate coverage: {coordinate_percentage:.1f}%")
        
        print("\n📊 COORDINATES BY CITY:")
        print("-" * 30)
        for city_data in city_status:
            city_name = city_data['city'] or 'Unknown'
            total = city_data['total']
            with_coords = city_data['with_coordinates']
            missing = city_data['missing_coordinates']
            percentage = (with_coords / total * 100) if total > 0 else 0
            
            print(f"{city_name}: {with_coords}/{total} ({percentage:.1f}%)")
        
        if sample_missing:
            print(f"\n📝 SAMPLE OF SHULS MISSING COORDINATES (showing first 10):")
            print("-" * 50)
            for shul in sample_missing:
                print(f"ID {shul['id']}: {shul['name']} - {shul['address']}, {shul['city']}, {shul['state']}")
        
        print(f"\n💡 RECOMMENDATIONS:")
        print("-" * 20)
        if status_result['missing_coordinates'] > 0:
            print(f"• Run populate_shuls_coordinates.py to add coordinates for {status_result['missing_coordinates']} shuls")
        if status_result['without_address'] > 0:
            print(f"• {status_result['without_address']} shuls need address data before geocoding")
        if status_result['with_coordinates'] == total_count:
            print("• All shuls have coordinates! 🎉")
        
        return True
        
    except Exception as e:
        logger.error(f"Error checking coordinates status: {e}")
        return False

def main():
    """Main execution function."""
    print("🔍 Starting shuls coordinates status check...")
    print("=" * 50)
    
    success = check_coordinates_status()
    
    if success:
        print("\n✅ Status check completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Status check failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
