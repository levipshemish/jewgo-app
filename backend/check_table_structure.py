#!/usr/bin/env python3
"""
Check Oracle Cloud Database Table Structure
==========================================

This script checks the actual table structure and data in the Oracle Cloud database.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def connect_to_oracle_db():
    """Connect to Oracle Cloud PostgreSQL database."""
    oracle_url = "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"
    
    try:
        engine = create_engine(
            oracle_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 30}
        )
        return engine
    except Exception as e:
        print(f"Failed to connect to Oracle Cloud database: {e}")
        return None

def list_all_tables(engine):
    """List all tables in the database."""
    print("📋 All Tables in Oracle Cloud Database:")
    print("-" * 40)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            
            for i, table in enumerate(tables, 1):
                print(f"{i:2d}. {table}")
            
            return tables
    except SQLAlchemyError as e:
        print(f"Error listing tables: {e}")
        return []

def check_table_structure(engine, table_name):
    """Check the structure of a specific table."""
    print(f"\n🔍 Table Structure: {table_name}")
    print("-" * 50)
    
    try:
        with engine.connect() as conn:
            # Get column information
            result = conn.execute(text(f"""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = '{table_name}' 
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()
            
            print("Columns:")
            for col in columns:
                nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                default = f" DEFAULT {col[3]}" if col[3] else ""
                print(f"  - {col[0]}: {col[1]} {nullable}{default}")
            
            # Get row count
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            count = result.scalar()
            print(f"\nRow count: {count}")
            
            # Show sample data if any
            if count > 0:
                result = conn.execute(text(f"SELECT * FROM {table_name} LIMIT 3"))
                rows = result.fetchall()
                print(f"\nSample data (first 3 rows):")
                for i, row in enumerate(rows, 1):
                    print(f"  Row {i}: {row}")
            
            return count
            
    except SQLAlchemyError as e:
        print(f"Error checking table {table_name}: {e}")
        return 0

def check_specific_tables(engine):
    """Check specific important tables."""
    important_tables = [
        'restaurants',
        'restaurant_images',
        'florida_synagogues',
        'google_places_data',
        'marketplace',
        'reviews'
    ]
    
    print("\n" + "=" * 60)
    print("🔍 DETAILED TABLE ANALYSIS")
    print("=" * 60)
    
    total_rows = 0
    for table in important_tables:
        rows = check_table_structure(engine, table)
        total_rows += rows
    
    print(f"\n📊 Total rows across important tables: {total_rows}")
    return total_rows

def main():
    """Main function."""
    print("🔍 Oracle Cloud Database Structure Analysis")
    print("=" * 60)
    
    # Connect to Oracle Cloud database
    engine = connect_to_oracle_db()
    if not engine:
        print("❌ Failed to connect to Oracle Cloud database")
        return False
    
    print("✅ Connected to Oracle Cloud PostgreSQL database")
    
    # List all tables
    tables = list_all_tables(engine)
    
    # Check specific tables
    total_rows = check_specific_tables(engine)
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 ANALYSIS SUMMARY")
    print("=" * 60)
    
    if total_rows > 0:
        print(f"✅ Data found: {total_rows} total rows across important tables")
        print("✅ Migration appears to have transferred some data")
    else:
        print("❌ No data found in important tables")
        print("❌ Migration may have failed to transfer data properly")
    
    print(f"\n📊 Total tables in database: {len(tables)}")
    
    return total_rows > 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
