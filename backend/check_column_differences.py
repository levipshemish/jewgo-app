#!/usr/bin/env python3
"""
Check Column Differences Between Source and Target Databases
==========================================================

This script compares the column structures of the restaurants table
between Neon (source) and Oracle Cloud (target) databases.
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def connect_to_neon_db():
    """Connect to Neon PostgreSQL database."""
    neon_url = os.getenv("NEON_DATABASE_URL")
    if not neon_url:
        print("❌ NEON_DATABASE_URL not found in environment")
        return None
    
    try:
        engine = create_engine(
            neon_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 30}
        )
        return engine
    except Exception as e:
        print(f"❌ Failed to connect to Neon: {e}")
        return None

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
        print(f"❌ Failed to connect to Oracle Cloud: {e}")
        return None

def get_table_columns(engine, table_name):
    """Get column information for a table."""
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        return columns
    except Exception as e:
        print(f"❌ Failed to get columns for {table_name}: {e}")
        return []

def compare_columns(source_columns, target_columns):
    """Compare columns between source and target."""
    source_col_names = {col['name'] for col in source_columns}
    target_col_names = {col['name'] for col in target_columns}
    
    print("🔍 Column Comparison Results:")
    print("=" * 50)
    
    # Columns in source but not in target
    missing_in_target = source_col_names - target_col_names
    if missing_in_target:
        print(f"❌ Columns in source but missing in target ({len(missing_in_target)}):")
        for col in sorted(missing_in_target):
            print(f"   - {col}")
    
    # Columns in target but not in source
    extra_in_target = target_col_names - source_col_names
    if extra_in_target:
        print(f"⚠️  Columns in target but not in source ({len(extra_in_target)}):")
        for col in sorted(extra_in_target):
            print(f"   - {col}")
    
    # Common columns
    common_cols = source_col_names & target_col_names
    print(f"✅ Common columns ({len(common_cols)}):")
    for col in sorted(common_cols):
        print(f"   - {col}")
    
    return {
        'missing_in_target': missing_in_target,
        'extra_in_target': extra_in_target,
        'common_cols': common_cols
    }

def main():
    """Main comparison function."""
    print("🔍 Restaurant Table Column Comparison")
    print("=" * 50)
    
    # Connect to databases
    neon_engine = connect_to_neon_db()
    oracle_engine = connect_to_oracle_db()
    
    if not neon_engine or not oracle_engine:
        print("❌ Failed to connect to one or both databases")
        return False
    
    # Get column information
    print("📊 Getting column information...")
    source_columns = get_table_columns(neon_engine, 'restaurants')
    target_columns = get_table_columns(oracle_engine, 'restaurants')
    
    if not source_columns:
        print("❌ Failed to get source columns")
        return False
    
    if not target_columns:
        print("❌ Failed to get target columns")
        return False
    
    print(f"📋 Source (Neon) has {len(source_columns)} columns")
    print(f"📋 Target (Oracle Cloud) has {len(target_columns)} columns")
    print()
    
    # Compare columns
    comparison = compare_columns(source_columns, target_columns)
    
    print()
    print("📝 Summary:")
    print("=" * 50)
    print(f"✅ Common columns: {len(comparison['common_cols'])}")
    print(f"❌ Missing in target: {len(comparison['missing_in_target'])}")
    print(f"⚠️  Extra in target: {len(comparison['extra_in_target'])}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
