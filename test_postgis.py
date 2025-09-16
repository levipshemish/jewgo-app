#!/usr/bin/env python3
"""Test script to check PostGIS availability and restaurant data."""

import os
import sys
sys.path.append('/Users/mendell/jewgo app/backend')

# Set environment variables
os.environ['DATABASE_URL'] = 'postgresql://jewgo_user:jewgo_password@localhost:5432/jewgo_db'

from database.connection_manager import DatabaseConnectionManager
from sqlalchemy import text

def test_postgis():
    """Test PostGIS availability and restaurant data."""
    dm = DatabaseConnectionManager()
    
    if not dm.connect():
        print("❌ Database connection failed")
        return False
    
    print("✅ Database connection successful")
    
    with dm.engine.connect() as conn:
        # Check PostGIS availability
        try:
            result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')"))
            row = result.fetchone()
            postgis_available = bool(row and row[0])
            print(f"PostGIS available: {'✅' if postgis_available else '❌'}")
        except Exception as e:
            print(f"❌ Error checking PostGIS: {e}")
            postgis_available = False
        
        # Check restaurants with coordinates
        try:
            result = conn.execute(text("SELECT COUNT(*) FROM restaurants WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status = 'active'"))
            row = result.fetchone()
            count = row[0] if row else 0
            print(f"Active restaurants with coordinates: {count}")
        except Exception as e:
            print(f"❌ Error checking restaurants: {e}")
            return False
        
        if count == 0:
            print("❌ No restaurants with coordinates found")
            return False
        
        # Test a sample restaurant
        try:
            result = conn.execute(text("SELECT id, name, latitude, longitude FROM restaurants WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status = 'active' LIMIT 1"))
            row = result.fetchone()
            if row:
                print(f"Sample restaurant: {row[1]} at ({row[2]}, {row[3]})")
                
                # Test PostGIS distance query if available
                if postgis_available:
                    user_lat, user_lon = 26.042422512733207, -80.18460089777355
                    radius_meters = 160 * 1000  # 160km in meters
                    
                    query = text("""
                        SELECT id, name, latitude, longitude,
                               ST_Distance(
                                   ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                                   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                               ) as distance_meters
                        FROM restaurants 
                        WHERE latitude IS NOT NULL 
                          AND longitude IS NOT NULL 
                          AND status = 'active'
                          AND ST_DWithin(
                              ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                              ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                              :radius_meters
                          )
                        LIMIT 5
                    """)
                    
                    result = conn.execute(query, {
                        'lat': user_lat,
                        'lng': user_lon,
                        'radius_meters': radius_meters
                    })
                    
                    rows = result.fetchall()
                    print(f"Restaurants within {radius_meters/1000:.1f}km of user location: {len(rows)}")
                    
                    for row in rows:
                        distance_km = row[4] / 1000 if row[4] else 0
                        print(f"  - {row[1]}: {distance_km:.2f}km")
                else:
                    print("PostGIS not available, cannot test distance queries")
            else:
                print("❌ No restaurants found")
                return False
                
        except Exception as e:
            print(f"❌ Error testing restaurant query: {e}")
            return False
    
    return True

if __name__ == "__main__":
    test_postgis()
