#!/usr/bin/env python3
"""
Simple Database Test
===================
Test database connection with minimal configuration.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def simple_db_test():
    """Test database connection with minimal configuration."""
    try:
        print("🔍 Simple Database Connection Test")
        print("=" * 40)
        
        # Simple database URL without any extra parameters
        database_url = 'postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db'
        
        print(f"Database URL: {database_url}")
        
        # Create engine with minimal configuration
        engine = create_engine(
            database_url,
            pool_pre_ping=True,
            echo=False
        )
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM restaurants"))
            total_restaurants = result.fetchone()[0]
            print(f"Total restaurants: {total_restaurants}")
            
            result = conn.execute(text("SELECT COUNT(*) FROM restaurants WHERE status = 'active'"))
            active_restaurants = result.fetchone()[0]
            print(f"Active restaurants: {active_restaurants}")
            
            # Test a simple query
            result = conn.execute(text("SELECT id, name, status FROM restaurants WHERE status = 'active' LIMIT 5"))
            restaurants = result.fetchall()
            print(f"\nFirst 5 active restaurants:")
            for restaurant in restaurants:
                print(f"  - {restaurant[1]} (ID: {restaurant[0]}, Status: {restaurant[2]})")
        
        print("\n✅ Database connection test successful!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    simple_db_test()
