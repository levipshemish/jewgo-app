#!/usr/bin/env python3
"""
Database Schema Inspector
========================

This script connects to the database and shows the current table structure.
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

def get_database_url():
    """Get database URL from environment variables."""
    # Try different environment variable names
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        db_url = os.getenv('POSTGRES_URL')
    if not db_url:
        db_url = os.getenv('SUPABASE_DATABASE_URL')
    
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
        print("❌ No database URL found in environment variables")
        print("Available environment variables:")
        for key, value in os.environ.items():
            if 'DATABASE' in key or 'POSTGRES' in key or 'SUPABASE' in key:
                print(f"  {key}: {value[:50]}..." if len(str(value)) > 50 else f"  {key}: {value}")
        return None
    
    # Convert psycopg:// to postgresql:// for SQLAlchemy
    if db_url.startswith('postgresql+psycopg://'):
        db_url = db_url.replace('postgresql+psycopg://', 'postgresql://')
    
    return db_url

def inspect_database():
    """Inspect the database schema."""
    db_url = get_database_url()
    if not db_url:
        return
    
    try:
        print(f"🔗 Connecting to database...")
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            print("✅ Connected successfully!")
            
            # Get all tables
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            print(f"\n📋 Found {len(tables)} tables:")
            for table in sorted(tables):
                print(f"  - {table}")
            
            # Check for marketplace-related tables
            marketplace_tables = [t for t in tables if 'marketplace' in t.lower()]
            if marketplace_tables:
                print(f"\n🛒 Marketplace tables found:")
                for table in marketplace_tables:
                    print(f"  - {table}")
                    
                    # Get table structure
                    columns = inspector.get_columns(table)
                    print(f"    Columns:")
                    for col in columns:
                        print(f"      - {col['name']}: {col['type']}")
                    
                    # Get row count
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    print(f"    Rows: {count}")
            else:
                print(f"\n❌ No marketplace tables found")
            
            # Check for any tables with 'listings' in the name
            listings_tables = [t for t in tables if 'listing' in t.lower()]
            if listings_tables:
                print(f"\n📝 Tables with 'listing' in name:")
                for table in listings_tables:
                    print(f"  - {table}")
            
            # Show recent tables (created in last 30 days)
            print(f"\n🕒 Recent tables (last 30 days):")
            result = conn.execute(text("""
                SELECT table_name, created_at 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND created_at > NOW() - INTERVAL '30 days'
                ORDER BY created_at DESC
            """))
            recent_tables = result.fetchall()
            if recent_tables:
                for table in recent_tables:
                    print(f"  - {table[0]} (created: {table[1]})")
            else:
                print("  No recent tables found")
                
    except SQLAlchemyError as e:
        print(f"❌ Database connection error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    inspect_database()
