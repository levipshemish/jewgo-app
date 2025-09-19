#!/usr/bin/env python3
"""
Create sample specials data for testing the specials system.

This script creates sample specials for existing restaurants to test
the complete specials functionality including claims and events.
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine, text

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def get_database_url():
    """Get database URL from environment or use default."""
    return os.environ.get(
        'DATABASE_URL', 
        'postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db'
    )

def get_sample_specials_data():
    """Generate sample specials data."""
    now = datetime.now(timezone.utc)
    
    # Get some restaurant IDs from the database
    engine = create_engine(get_database_url())
    
    with engine.connect() as conn:
        # Get a few restaurant IDs
        result = conn.execute(text("SELECT id, name FROM restaurants LIMIT 5"))
        restaurants = result.fetchall()
        
        if not restaurants:
            print("❌ No restaurants found in database")
            return []
        
        print(f"✅ Found {len(restaurants)} restaurants for sample data")
        
        sample_specials = []
        
        # Create different types of specials for each restaurant
        for i, (restaurant_id, restaurant_name) in enumerate(restaurants):
            # Create 2-3 specials per restaurant with different types
            specials_for_restaurant = [
                {
                    'restaurant_id': restaurant_id,
                    'title': f'Happy Hour Special',
                    'subtitle': f'Great deals at {restaurant_name}',
                    'description': 'Join us for our daily happy hour with discounted drinks and appetizers.',
                    'discount_type': 'percentage',
                    'discount_value': 20.0,
                    'discount_label': '20% Off Drinks & Apps',
                    'valid_from': now,
                    'valid_until': now + timedelta(hours=3),
                    'max_claims_total': 50,
                    'max_claims_per_user': 1,
                    'per_visit': False,
                    'requires_code': False,
                    'terms': 'Valid during happy hour only. Cannot be combined with other offers.',
                    'hero_image_url': f'https://example.com/images/special-{i}-1.jpg'
                },
                {
                    'restaurant_id': restaurant_id,
                    'title': f'Weekend Brunch Special',
                    'subtitle': f'Delicious brunch at {restaurant_name}',
                    'description': 'Enjoy our signature brunch menu with fresh ingredients and kosher options.',
                    'discount_type': 'fixed_amount',
                    'discount_value': 10.0,
                    'discount_label': '$10 Off Brunch',
                    'valid_from': now + timedelta(days=1),
                    'valid_until': now + timedelta(days=3),
                    'max_claims_total': 25,
                    'max_claims_per_user': 2,
                    'per_visit': True,
                    'requires_code': True,
                    'code_hint': 'Ask server for code',
                    'terms': 'Valid Saturday and Sunday only. Minimum $25 purchase required.',
                    'hero_image_url': f'https://example.com/images/special-{i}-2.jpg'
                },
                {
                    'restaurant_id': restaurant_id,
                    'title': f'Free Dessert',
                    'subtitle': f'Sweet ending at {restaurant_name}',
                    'description': 'Complimentary dessert with any main course purchase.',
                    'discount_type': 'free_item',
                    'discount_value': None,
                    'discount_label': 'Free Dessert',
                    'valid_from': now - timedelta(hours=1),
                    'valid_until': now + timedelta(days=7),
                    'max_claims_total': 100,
                    'max_claims_per_user': 1,
                    'per_visit': False,
                    'requires_code': False,
                    'terms': 'One free dessert per table. Cannot be combined with other offers.',
                    'hero_image_url': f'https://example.com/images/special-{i}-3.jpg'
                }
            ]
            
            # Only add 2 specials for some restaurants to have variety
            if i < 3:
                sample_specials.extend(specials_for_restaurant[:2])
            else:
                sample_specials.extend(specials_for_restaurant[:1])
        
        return sample_specials

def create_sample_specials():
    """Create sample specials in the database."""
    print("🚀 Creating sample specials data...")
    
    # Get database connection
    engine = create_engine(get_database_url())
    
    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                # Get sample data
                sample_specials = get_sample_specials_data()
                
                if not sample_specials:
                    print("❌ No sample data to create")
                    return False
                
                created_count = 0
                
                for special_data in sample_specials:
                    # Generate UUID for the special
                    special_id = str(uuid.uuid4())
                    
                    # Insert the special
                    conn.execute(text("""
                        INSERT INTO specials (
                            id, restaurant_id, title, subtitle, description,
                            discount_type, discount_value, discount_label,
                            valid_from, valid_until, max_claims_total,
                            max_claims_per_user, per_visit, requires_code,
                            code_hint, terms, hero_image_url, is_active,
                            created_at, updated_at
                        ) VALUES (
                            :id, :restaurant_id, :title, :subtitle, :description,
                            :discount_type, :discount_value, :discount_label,
                            :valid_from, :valid_until, :max_claims_total,
                            :max_claims_per_user, :per_visit, :requires_code,
                            :code_hint, :terms, :hero_image_url, :is_active,
                            :created_at, :updated_at
                        )
                    """), {
                        'id': special_id,
                        'restaurant_id': special_data['restaurant_id'],
                        'title': special_data['title'],
                        'subtitle': special_data['subtitle'],
                        'description': special_data['description'],
                        'discount_type': special_data['discount_type'],
                        'discount_value': special_data['discount_value'],
                        'discount_label': special_data['discount_label'],
                        'valid_from': special_data['valid_from'],
                        'valid_until': special_data['valid_until'],
                        'max_claims_total': special_data['max_claims_total'],
                        'max_claims_per_user': special_data['max_claims_per_user'],
                        'per_visit': special_data['per_visit'],
                        'requires_code': special_data['requires_code'],
                        'code_hint': special_data.get('code_hint'),
                        'terms': special_data['terms'],
                        'hero_image_url': special_data['hero_image_url'],
                        'is_active': True,
                        'created_at': datetime.now(timezone.utc),
                        'updated_at': datetime.now(timezone.utc)
                    })
                    
                    created_count += 1
                    print(f"✅ Created special: {special_data['title']} for restaurant {special_data['restaurant_id']}")
                
                # Commit transaction
                trans.commit()
                
                print(f"🎉 Successfully created {created_count} sample specials!")
                
                # Verify creation
                result = conn.execute(text("SELECT COUNT(*) FROM specials"))
                total_specials = result.scalar()
                print(f"📊 Total specials in database: {total_specials}")
                
                return True
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Error creating sample specials: {e}")
                return False
                
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def verify_sample_data():
    """Verify the sample data was created correctly."""
    print("\n🔍 Verifying sample data...")
    
    engine = create_engine(get_database_url())
    
    try:
        with engine.connect() as conn:
            # Check specials
            result = conn.execute(text("""
                SELECT s.id, s.title, s.discount_label, r.name as restaurant_name,
                       s.valid_from, s.valid_until, s.max_claims_total
                FROM specials s
                JOIN restaurants r ON s.restaurant_id = r.id
                ORDER BY s.created_at DESC
                LIMIT 10
            """))
            
            specials = result.fetchall()
            
            if not specials:
                print("❌ No specials found")
                return False
            
            print(f"✅ Found {len(specials)} specials:")
            for special in specials:
                print(f"  - {special.title} at {special.restaurant_name}")
                print(f"    Discount: {special.discount_label}")
                print(f"    Valid: {special.valid_from} to {special.valid_until}")
                print(f"    Max claims: {special.max_claims_total}")
                print()
            
            return True
            
    except Exception as e:
        print(f"❌ Error verifying sample data: {e}")
        return False

def main():
    """Main function."""
    print("🎯 Sample Specials Data Creator")
    print("=" * 40)
    
    # Create sample specials
    if create_sample_specials():
        # Verify the data
        verify_sample_data()
        print("\n✅ Sample specials data creation completed successfully!")
    else:
        print("\n❌ Failed to create sample specials data")
        sys.exit(1)

if __name__ == "__main__":
    main()
