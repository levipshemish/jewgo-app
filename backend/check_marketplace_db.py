#!/usr/bin/env python3
"""Check marketplace database tables and data."""

import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

def convert_sqlalchemy_url_to_psycopg2(sqlalchemy_url):
    """Convert SQLAlchemy URL to psycopg2 format."""
    if sqlalchemy_url.startswith('postgresql+psycopg://'):
        # Remove the +psycopg part
        psycopg2_url = sqlalchemy_url.replace('postgresql+psycopg://', 'postgresql://')
        return psycopg2_url
    return sqlalchemy_url

def check_marketplace_database():
    """Check marketplace database tables and data."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print('❌ DATABASE_URL not found in environment')
        return False

    # Convert SQLAlchemy URL to psycopg2 format
    database_url = convert_sqlalchemy_url_to_psycopg2(database_url)
    print(f"🔗 Using database URL: {database_url[:50]}...")

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("🔍 Checking marketplace database...")
        
        # Check if listings table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'listings'
            );
        """)
        listings_exists = cursor.fetchone()['exists']
        
        if not listings_exists:
            print('❌ listings table does not exist')
        else:
            print('✅ listings table exists')
            
            # Check if table has data
            cursor.execute('SELECT COUNT(*) as count FROM listings')
            count = cursor.fetchone()['count']
            print(f'📊 Total listings: {count}')
            
            if count > 0:
                # Show sample data
                cursor.execute('SELECT id, title, type, price_cents, status, created_at FROM listings LIMIT 5')
                sample_data = cursor.fetchall()
                print('📝 Sample listings:')
                for item in sample_data:
                    print(f'  ID: {item["id"]}')
                    print(f'  Title: {item["title"]}')
                    print(f'  Type: {item["type"]}')
                    print(f'  Price: ${item["price_cents"]/100:.2f}')
                    print(f'  Status: {item["status"]}')
                    print(f'  Created: {item["created_at"]}')
                    print('  ---')
            else:
                print('⚠️  No marketplace listings found in database')
        
        # Check if marketplace table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'marketplace'
            );
        """)
        marketplace_exists = cursor.fetchone()['exists']
        
        if not marketplace_exists:
            print('\n❌ marketplace table does not exist')
        else:
            print('\n✅ marketplace table exists')
            
            # Check if table has data
            cursor.execute('SELECT COUNT(*) as count FROM marketplace')
            count = cursor.fetchone()['count']
            print(f'📊 Total marketplace items: {count}')
            
            if count > 0:
                # Show sample data
                cursor.execute('SELECT id, name, title, price, category, status, created_at FROM marketplace LIMIT 5')
                sample_data = cursor.fetchall()
                print('📝 Sample marketplace items:')
                for item in sample_data:
                    print(f'  ID: {item["id"]}')
                    print(f'  Name: {item["name"]}')
                    print(f'  Title: {item["title"]}')
                    print(f'  Price: ${item["price"]}')
                    print(f'  Category: {item["category"]}')
                    print(f'  Status: {item["status"]}')
                    print(f'  Created: {item["created_at"]}')
                    print('  ---')
            else:
                print('⚠️  No marketplace items found in database')
        
        # Check categories table
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'categories'
            );
        """)
        categories_exists = cursor.fetchone()['exists']
        
        if categories_exists:
            cursor.execute('SELECT COUNT(*) as count FROM categories')
            cat_count = cursor.fetchone()['count']
            print(f'\n📊 Total categories: {cat_count}')
            
            if cat_count > 0:
                cursor.execute('SELECT id, name, slug FROM categories LIMIT 5')
                categories = cursor.fetchall()
                print('📝 Sample categories:')
                for cat in categories:
                    print(f'  {cat["id"]}: {cat["name"]} ({cat["slug"]})')
        else:
            print('\n⚠️  categories table does not exist')
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f'❌ Database error: {e}')
        return False

if __name__ == "__main__":
    check_marketplace_database()
