#!/usr/bin/env python3
"""
Test Restaurant Database Connection
==================================
Simple script to test if the server can connect to the database and retrieve restaurant data.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set the database URL
os.environ['DATABASE_URL'] = 'postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db'

from database.connection_manager import get_connection_manager
from database.models import Restaurant
from sqlalchemy import text

def test_restaurant_db():
    """Test restaurant database connection and data retrieval."""
    try:
        print("🔍 Testing Restaurant Database Connection")
        print("=" * 50)
        
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            # 1. Check total restaurants
            result = session.execute(text("SELECT COUNT(*) FROM restaurants")).fetchone()
            total_restaurants = result[0] if result else 0
            print(f"Total restaurants: {total_restaurants}")
            
            # 2. Check active restaurants
            result = session.execute(text("SELECT COUNT(*) FROM restaurants WHERE status = 'active'")).fetchone()
            active_restaurants = result[0] if result else 0
            print(f"Active restaurants: {active_restaurants}")
            
            # 3. Test SQLAlchemy model
            print("\nTesting SQLAlchemy Restaurant model...")
            restaurants = session.query(Restaurant).filter(Restaurant.status == 'active').limit(5).all()
            print(f"SQLAlchemy query returned {len(restaurants)} restaurants")
            
            if restaurants:
                print("\nFirst 5 restaurants:")
                for i, restaurant in enumerate(restaurants, 1):
                    print(f"  {i}. {restaurant.name} (ID: {restaurant.id}, Status: {restaurant.status})")
            
            # 4. Test EntityRepositoryV5
            print("\nTesting EntityRepositoryV5...")
            from database.repositories.entity_repository_v5 import EntityRepositoryV5
            repo = EntityRepositoryV5(db_manager)
            
            # Test get_entities_with_cursor
            entities, next_cursor, prev_cursor, total_count = repo.get_entities_with_cursor(
                entity_type='restaurants',
                page=1,
                limit=5,
                sort_key='created_at_desc',
                filters={}
            )
            
            print(f"EntityRepositoryV5 returned {len(entities)} entities, total_count: {total_count}")
            
            if entities:
                print("\nFirst 5 entities from EntityRepositoryV5:")
                for i, entity in enumerate(entities, 1):
                    print(f"  {i}. {entity.get('name', 'Unknown')} (ID: {entity.get('id', 'Unknown')}, Status: {entity.get('status', 'Unknown')})")
            
            # 5. Test RestaurantServiceV5
            print("\nTesting RestaurantServiceV5...")
            from database.services.restaurant_service_v5 import RestaurantServiceV5
            service = RestaurantServiceV5(repo, None, None)
            
            restaurants_service, next_cursor, prev_cursor, total_count = service.get_restaurants(
                page=1,
                limit=5,
                sort_key='created_at_desc',
                filters={}
            )
            
            print(f"RestaurantServiceV5 returned {len(restaurants_service)} restaurants, total_count: {total_count}")
            
            if restaurants_service:
                print("\nFirst 5 restaurants from RestaurantServiceV5:")
                for i, restaurant in enumerate(restaurants_service, 1):
                    print(f"  {i}. {restaurant.get('name', 'Unknown')} (ID: {restaurant.get('id', 'Unknown')}, Status: {restaurant.get('status', 'Unknown')})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_restaurant_db()
