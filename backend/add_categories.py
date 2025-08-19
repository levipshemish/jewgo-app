#!/usr/bin/env python3
"""Add basic categories to the marketplace."""

import os
from database.database_manager_v4 import DatabaseManager

def add_categories():
    """Add basic categories to the database."""
    print("🗂️ Adding basic categories to marketplace...")
    
    # Set up database connection
    db_manager = DatabaseManager()
    db_manager.connect()
    
    try:
        with db_manager.connection_manager.get_session_context() as session:
            from sqlalchemy import text
            
            # Check existing categories
            result = session.execute(text('SELECT id, name, slug FROM categories ORDER BY id'))
            categories = result.fetchall()
            print(f'Categories found: {len(categories)}')
            
            # Check if we need to add some basic categories
            if len(categories) == 0:
                print('Adding basic categories...')
                basic_categories = [
                    ('General', 'general'),
                    ('Electronics', 'electronics'),
                    ('Home & Garden', 'home-garden'),
                    ('Vehicles', 'vehicles'),
                    ('Books & Media', 'books-media'),
                    ('Clothing', 'clothing'),
                    ('Kitchen', 'kitchen'),
                    ('Judaica', 'judaica')
                ]
                
                for name, slug in basic_categories:
                    session.execute(
                        text('INSERT INTO categories (name, slug, sort_order, active) VALUES (:name, :slug, :sort_order, :active)'),
                        {'name': name, 'slug': slug, 'sort_order': 100, 'active': True}
                    )
                
                print(f'✅ Added {len(basic_categories)} categories')
            else:
                print('✅ Categories already exist')
            
            # Show final list
            result = session.execute(text('SELECT id, name, slug FROM categories ORDER BY id'))
            categories = result.fetchall()
            print(f'📊 Total categories: {len(categories)}')
            for cat in categories:
                print(f'  - ID: {cat[0]}, Name: {cat[1]}, Slug: {cat[2]}')
                
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        db_manager.connection_manager.close()

if __name__ == "__main__":
    add_categories()
