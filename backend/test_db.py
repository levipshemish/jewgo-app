#!/usr/bin/env python3
"""Test database connection with SQLite."""

import os
import sys
sys.path.append('.')

# Set environment variables
os.environ['SECRET_KEY'] = 'dev-secret-key-for-testing'
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['FLASK_ENV'] = 'development'

try:
    print("Testing database connection...")
    from database.connection_manager import DatabaseConnectionManager
    
    # Create connection manager
    db_manager = DatabaseConnectionManager()
    
    # Test connection
    if db_manager.connect():
        print("✅ Database connection successful!")
        
        # Test a simple query
        with db_manager.get_session() as session:
            from sqlalchemy import text
            result = session.execute(text("SELECT 1 as test")).fetchone()
            print(f"✅ Test query result: {result}")
        
        db_manager.disconnect()
        print("✅ Database test completed successfully!")
    else:
        print("❌ Database connection failed!")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
