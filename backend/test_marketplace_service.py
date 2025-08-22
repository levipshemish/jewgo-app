#!/usr/bin/env python3
"""
Test Marketplace Service
========================

This script tests the marketplace service to debug the issue.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

def get_database_url():
    """Get database URL from environment variables."""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        # Try reading from .env file
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        db_url = line.split('=', 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    
    if not db_url:
        print("❌ No database URL found")
        return None
    
    # Convert psycopg:// to postgresql:// for SQLAlchemy
    if db_url.startswith('postgresql+psycopg://'):
        db_url = db_url.replace('postgresql+psycopg://', 'postgresql://')
    
    return db_url

def test_marketplace_query():
    """Test the marketplace query directly."""
    db_url = get_database_url()
    if not db_url:
        return
    
    try:
        print(f"🔗 Connecting to database...")
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            print("✅ Connected successfully!")
            
            # Test the exact query from the service
            query = """
                SELECT m.id, m.title, m.description, m.price, m.currency, m.city, m.state as region, m.zip_code as zip, 
                       m.latitude as lat, m.longitude as lng, m.vendor_id as seller_user_id, m.category as type, m.status as condition,
                       m.category, m.subcategory, m.status, m.created_at, m.updated_at
                FROM marketplace m
                WHERE m.status = :status
                ORDER BY m.created_at DESC LIMIT :limit OFFSET :offset
            """
            params = {"status": "active", "limit": 5, "offset": 0}
            
            print(f"🔍 Executing query with params: {params}")
            result = conn.execute(text(query), params)
            listings = result.fetchall()
            
            print(f"📊 Found {len(listings)} listings:")
            for listing in listings:
                print(f"  - {listing[1]} (ID: {listing[0]}, Price: {listing[3]})")
            
            # Test count query
            count_query = """
                SELECT COUNT(*) as total FROM marketplace m
                WHERE m.status = :status
            """
            count_result = conn.execute(text(count_query), {"status": "active"})
            total = count_result.scalar()
            print(f"📈 Total count: {total}")
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_marketplace_query()
