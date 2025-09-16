#!/usr/bin/env python3
"""Debug script to check restaurant count in database."""

import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Now import our modules
from database.connection_manager import DatabaseConnectionManager
from database.models import Restaurant

def main():
    """Check restaurant count and sample data."""
    try:
        # Initialize connection
        print("Initializing database connection...")
        db_manager = DatabaseConnectionManager()
        
        print(f"Database URL: {db_manager._unified_manager.database_url}")
        
        with db_manager.session_scope() as session:
            # Count total restaurants
            total_count = session.query(Restaurant).count()
            print(f"Total restaurants in database: {total_count}")
            
            if total_count > 0:
                # Get sample restaurants
                sample_restaurants = session.query(Restaurant).limit(5).all()
                print("\nSample restaurants:")
                for restaurant in sample_restaurants:
                    print(f"  ID: {restaurant.id}, Name: {restaurant.name}, Status: {restaurant.status}")
                    print(f"      City: {restaurant.city}, State: {restaurant.state}")
                    print(f"      Created: {restaurant.created_at}")
                    print()
                
                # Check status distribution
                print("Status distribution:")
                from sqlalchemy import func
                status_counts = session.query(
                    Restaurant.status,
                    func.count(Restaurant.id)
                ).group_by(Restaurant.status).all()
                
                for status, count in status_counts:
                    print(f"  {status}: {count}")
            else:
                print("No restaurants found in database!")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
