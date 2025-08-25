#!/usr/bin/env python3
"""
Test Database Connection Script
==============================

Simple script to test database connectivity and verify the PostgreSQL driver is working.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

def test_database_connection():
    """Test database connection with the current configuration."""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable is not set")
        return False
    
    print(f"🔗 Testing connection to: {database_url[:50]}...")
    
    # Fix URL format if needed
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://")
        print("✅ Fixed database URL format from postgres:// to postgresql://")
    
    try:
        # Create engine
        engine = create_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={
                "connect_timeout": 30,
                "application_name": "jewgo-test",
            }
        )
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test_value"))
            row = result.fetchone()
            print(f"✅ Database connection successful! Test query returned: {row[0]}")
            
            # Test PostgreSQL-specific features
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"📊 PostgreSQL version: {version}")
            
        return True
        
    except SQLAlchemyError as e:
        print(f"❌ Database connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_database_connection()
    sys.exit(0 if success else 1)
