#!/usr/bin/env python3
"""
Create additional specials for more restaurants using the API.

This script creates diverse specials for restaurants that don't have any yet,
demonstrating the complete specials system functionality.
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def get_api_base_url():
    """Get API base URL from environment or use default."""
    return os.environ.get('API_BASE_URL', 'http://localhost:5000')

def get_database_url():
    """Get database URL for direct queries."""
    return os.environ.get('DATABASE_URL', 'postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db')

def get_restaurants_without_specials() -> List[Dict[str, Any]]:
    """Get restaurants that don't have specials yet."""
    from sqlalchemy import create_engine, text
    
    engine = create_engine(get_database_url())
    with engine.connect() as conn:
        result = conn.execute(text('''
            SELECT id, name, address, city, state, kosher_category, certifying_agency
            FROM restaurants 
            WHERE id NOT IN (SELECT DISTINCT restaurant_id FROM specials)
            AND status = 'active'
            ORDER BY name
            LIMIT 10
        '''))
        
        restaurants = []
        for row in result.fetchall():
            restaurants.append({
                'id': row.id,
                'name': row.name,
                'address': row.address,
                'city': row.city,
                'state': row.state,
                'kosher_category': row.kosher_category,
                'certifying_agency': row.certifying_agency
            })
        
        return restaurants

def create_special_via_database_only(special_data: Dict[str, Any]) -> bool:
    """Create a special directly in the database."""
    try:
        from sqlalchemy import create_engine, text
        
        engine = create_engine(get_database_url())
        with engine.connect() as conn:
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
            
            conn.commit()
            print(f"✅ Created: {special_data['title']} at {special_data['restaurant_id']}")
            return True
            
    except Exception as e:
        print(f"❌ Database error creating special: {e}")
        return False

def create_special_via_database(special_data: Dict[str, Any]) -> bool:
    """Create a special directly in the database (fallback)."""
    try:
        from sqlalchemy import create_engine, text
        
        engine = create_engine(get_database_url())
        with engine.connect() as conn:
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
            
            conn.commit()
            print(f"✅ Created via DB: {special_data['title']} at {special_data['restaurant_id']}")
            return True
            
    except Exception as e:
        print(f"❌ Database error creating special: {e}")
        return False

def generate_specials_for_restaurant(restaurant: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate diverse specials for a restaurant based on its type."""
    now = datetime.now(timezone.utc)
    restaurant_id = restaurant['id']
    restaurant_name = restaurant['name']
    kosher_category = restaurant.get('kosher_category', 'dairy')
    
    # Determine special types based on restaurant category
    specials = []
    
    if 'sushi' in restaurant_name.lower() or 'wok' in restaurant_name.lower():
        # Asian restaurant specials
        specials.extend([
            {
                'restaurant_id': restaurant_id,
                'title': 'Lunch Combo Special',
                'subtitle': f'Great lunch deals at {restaurant_name}',
                'description': 'Choose from our popular lunch combinations with sushi, wok dishes, and soup.',
                'discount_type': 'fixed_amount',
                'discount_value': 5.0,
                'discount_label': '$5 Off Lunch Combo',
                'valid_from': now,
                'valid_until': now + timedelta(hours=6),
                'max_claims_total': 30,
                'max_claims_per_user': 1,
                'per_visit': False,
                'requires_code': False,
                'terms': 'Valid for lunch combos only. Cannot be combined with other offers.',
                'hero_image_url': f'https://example.com/images/sushi-lunch-{restaurant_id}.jpg'
            },
            {
                'restaurant_id': restaurant_id,
                'title': 'Happy Hour Rolls',
                'subtitle': f'Sushi specials at {restaurant_name}',
                'description': 'Enjoy discounted sushi rolls during our happy hour.',
                'discount_type': 'percentage',
                'discount_value': 25.0,
                'discount_label': '25% Off Sushi Rolls',
                'valid_from': now + timedelta(days=1),
                'valid_until': now + timedelta(days=1, hours=3),
                'max_claims_total': 20,
                'max_claims_per_user': 1,
                'per_visit': False,
                'requires_code': True,
                'code_hint': 'Ask server for code',
                'terms': 'Valid during happy hour only. Excludes premium rolls.',
                'hero_image_url': f'https://example.com/images/sushi-rolls-{restaurant_id}.jpg'
            }
        ])
    
    elif 'pizza' in restaurant_name.lower() or 'bakery' in restaurant_name.lower():
        # Pizza/bakery specials
        specials.extend([
            {
                'restaurant_id': restaurant_id,
                'title': 'Family Pizza Deal',
                'subtitle': f'Family specials at {restaurant_name}',
                'description': 'Large pizza with two toppings and a side salad for the whole family.',
                'discount_type': 'fixed_amount',
                'discount_value': 8.0,
                'discount_label': '$8 Off Family Deal',
                'valid_from': now,
                'valid_until': now + timedelta(days=7),
                'max_claims_total': 50,
                'max_claims_per_user': 2,
                'per_visit': False,
                'requires_code': False,
                'terms': 'Valid on large pizzas with 2+ toppings. Includes side salad.',
                'hero_image_url': f'https://example.com/images/pizza-family-{restaurant_id}.jpg'
            },
            {
                'restaurant_id': restaurant_id,
                'title': 'Fresh Bakery Items',
                'subtitle': f'Fresh baked goods at {restaurant_name}',
                'description': 'Complimentary fresh bread with any meal purchase.',
                'discount_type': 'free_item',
                'discount_value': None,
                'discount_label': 'Free Fresh Bread',
                'valid_from': now - timedelta(hours=2),
                'valid_until': now + timedelta(days=14),
                'max_claims_total': 100,
                'max_claims_per_user': 1,
                'per_visit': True,
                'requires_code': False,
                'terms': 'One free bread per table with meal purchase.',
                'hero_image_url': f'https://example.com/images/bakery-bread-{restaurant_id}.jpg'
            }
        ])
    
    elif 'grill' in restaurant_name.lower() or 'kitchen' in restaurant_name.lower():
        # Grill/kitchen specials
        specials.extend([
            {
                'restaurant_id': restaurant_id,
                'title': 'Grill Master Special',
                'subtitle': f'Grilled specialties at {restaurant_name}',
                'description': 'Enjoy our signature grilled items with premium sides.',
                'discount_type': 'percentage',
                'discount_value': 15.0,
                'discount_label': '15% Off Grill Items',
                'valid_from': now,
                'valid_until': now + timedelta(hours=4),
                'max_claims_total': 25,
                'max_claims_per_user': 1,
                'per_visit': False,
                'requires_code': False,
                'terms': 'Valid on all grilled entrees. Cannot be combined with other offers.',
                'hero_image_url': f'https://example.com/images/grill-special-{restaurant_id}.jpg'
            }
        ])
    
    else:
        # Generic restaurant specials
        specials.extend([
            {
                'restaurant_id': restaurant_id,
                'title': 'Welcome Special',
                'subtitle': f'New customer deal at {restaurant_name}',
                'description': 'First-time customers get a special discount on their meal.',
                'discount_type': 'percentage',
                'discount_value': 10.0,
                'discount_label': '10% Off First Visit',
                'valid_from': now,
                'valid_until': now + timedelta(days=30),
                'max_claims_total': 100,
                'max_claims_per_user': 1,
                'per_visit': False,
                'requires_code': True,
                'code_hint': 'Mention this special to server',
                'terms': 'Valid for first-time customers only. Cannot be combined with other offers.',
                'hero_image_url': f'https://example.com/images/welcome-{restaurant_id}.jpg'
            },
            {
                'restaurant_id': restaurant_id,
                'title': 'Weekend Brunch',
                'subtitle': f'Weekend specials at {restaurant_name}',
                'description': 'Join us for a delicious weekend brunch with fresh ingredients.',
                'discount_type': 'fixed_amount',
                'discount_value': 6.0,
                'discount_label': '$6 Off Brunch',
                'valid_from': now + timedelta(days=2),
                'valid_until': now + timedelta(days=4),
                'max_claims_total': 40,
                'max_claims_per_user': 1,
                'per_visit': True,
                'requires_code': False,
                'terms': 'Valid Saturday and Sunday only. Minimum $20 purchase required.',
                'hero_image_url': f'https://example.com/images/brunch-{restaurant_id}.jpg'
            }
        ])
    
    return specials

def create_additional_specials():
    """Create additional specials for restaurants without any."""
    print("🚀 Creating Additional Specials")
    print("=" * 50)
    
    # Get restaurants without specials
    restaurants = get_restaurants_without_specials()
    
    if not restaurants:
        print("❌ No restaurants found without specials")
        return False
    
    print(f"📊 Found {len(restaurants)} restaurants without specials")
    print()
    
    created_count = 0
    failed_count = 0
    
    # Create specials for each restaurant
    for restaurant in restaurants:
        print(f"🏪 Processing: {restaurant['name']} (ID: {restaurant['id']})")
        
        # Generate specials for this restaurant
        specials = generate_specials_for_restaurant(restaurant)
        
        for special in specials:
            # Create via database
            success = create_special_via_database_only(special)
            
            if success:
                created_count += 1
            else:
                failed_count += 1
        
        print()
    
    print("=" * 50)
    print(f"📊 Results:")
    print(f"✅ Created: {created_count} specials")
    print(f"❌ Failed: {failed_count} specials")
    
    return created_count > 0

def show_database_breakdown():
    """Show detailed breakdown of the specials database."""
    print("\n📊 Database Breakdown")
    print("=" * 60)
    
    from sqlalchemy import create_engine, text
    
    engine = create_engine(get_database_url())
    with engine.connect() as conn:
        # Total specials
        result = conn.execute(text('SELECT COUNT(*) FROM specials'))
        total_specials = result.scalar()
        print(f"🎯 Total Specials: {total_specials}")
        
        # Active specials
        result = conn.execute(text('SELECT COUNT(*) FROM specials WHERE is_active = true AND deleted_at IS NULL'))
        active_specials = result.scalar()
        print(f"✅ Active Specials: {active_specials}")
        
        # Specials by discount type
        result = conn.execute(text('''
            SELECT dk.label, COUNT(s.id) as count
            FROM specials s
            JOIN discount_kinds dk ON s.discount_type = dk.code
            WHERE s.is_active = true AND s.deleted_at IS NULL
            GROUP BY dk.code, dk.label
            ORDER BY count DESC
        '''))
        
        print(f"\n💰 Specials by Discount Type:")
        for row in result.fetchall():
            print(f"  - {row.label}: {row.count}")
        
        # Specials by restaurant
        result = conn.execute(text('''
            SELECT r.name, COUNT(s.id) as special_count
            FROM restaurants r
            LEFT JOIN specials s ON r.id = s.restaurant_id AND s.is_active = true AND s.deleted_at IS NULL
            WHERE r.id IN (SELECT DISTINCT restaurant_id FROM specials)
            GROUP BY r.id, r.name
            ORDER BY special_count DESC
        '''))
        
        print(f"\n🏪 Specials by Restaurant:")
        for row in result.fetchall():
            print(f"  - {row.name}: {row.special_count} specials")
        
        # Time-based breakdown
        result = conn.execute(text('''
            SELECT 
                COUNT(CASE WHEN valid_from <= NOW() AND valid_until >= NOW() THEN 1 END) as current,
                COUNT(CASE WHEN valid_from > NOW() THEN 1 END) as upcoming,
                COUNT(CASE WHEN valid_until < NOW() THEN 1 END) as expired
            FROM specials 
            WHERE is_active = true AND deleted_at IS NULL
        '''))
        
        time_breakdown = result.fetchone()
        print(f"\n⏰ Time-based Breakdown:")
        print(f"  - Currently Active: {time_breakdown.current}")
        print(f"  - Upcoming: {time_breakdown.upcoming}")
        print(f"  - Expired: {time_breakdown.expired}")
        
        # Lookup tables
        result = conn.execute(text('SELECT COUNT(*) FROM discount_kinds'))
        discount_kinds = result.scalar()
        result = conn.execute(text('SELECT COUNT(*) FROM claim_statuses'))
        claim_statuses = result.scalar()
        result = conn.execute(text('SELECT COUNT(*) FROM media_kinds'))
        media_kinds = result.scalar()
        
        print(f"\n📋 Lookup Tables:")
        print(f"  - Discount Kinds: {discount_kinds}")
        print(f"  - Claim Statuses: {claim_statuses}")
        print(f"  - Media Kinds: {media_kinds}")
        
        # Database structure
        result = conn.execute(text('''
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            AND table_name LIKE 'special%'
            ORDER BY table_name
        '''))
        
        print(f"\n🗄️ Database Tables:")
        for row in result.fetchall():
            print(f"  - {row.table_name}: {row.column_count} columns")

def main():
    """Main function."""
    print("🎯 Additional Specials Creator")
    print("=" * 50)
    
    # Create additional specials
    if create_additional_specials():
        # Show database breakdown
        show_database_breakdown()
        print("\n🎉 Additional specials creation completed successfully!")
    else:
        print("\n❌ Failed to create additional specials")
        sys.exit(1)

if __name__ == "__main__":
    main()
