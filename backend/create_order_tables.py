#!/usr/bin/env python3
"""Create Order Tables Script.

This script creates the orders and order_items tables in the database.
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.models import Base, Order, OrderItem
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def create_order_tables():
    """Create the order tables in the database."""
    try:
        # Get database URL from environment
        database_url = os.environ.get("DATABASE_URL", "sqlite:///restaurants.db")
        
        print(f"Connecting to database: {database_url}")
        
        # Create engine
        engine = create_engine(database_url)
        
        # Create tables
        print("Creating order tables...")
        Base.metadata.create_all(engine, tables=[Order.__table__, OrderItem.__table__])
        
        print("✅ Order tables created successfully!")
        
        # Verify tables exist
        with engine.connect() as conn:
            # Check if orders table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'orders'
                )
            """))
            orders_exists = result.scalar()
            
            # Check if order_items table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'order_items'
                )
            """))
            items_exists = result.scalar()
            
            print(f"Orders table exists: {orders_exists}")
            print(f"Order items table exists: {items_exists}")
            
            if orders_exists and items_exists:
                print("✅ All order tables verified successfully!")
                return True
            else:
                print("❌ Some tables were not created properly")
                return False
                
    except Exception as e:
        print(f"❌ Error creating order tables: {e}")
        return False


if __name__ == "__main__":
    success = create_order_tables()
    if success:
        print("🎉 Order tables setup completed successfully!")
    else:
        print("💥 Order tables setup failed!")
        sys.exit(1)
