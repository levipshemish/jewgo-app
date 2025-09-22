#!/usr/bin/env python3
"""
Debug script for consolidated database manager
"""

import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from database.consolidated_db_manager import get_consolidated_db_manager

# Set up environment
os.environ['DATABASE_URL'] = 'postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db'

def debug_query():
    manager = get_consolidated_db_manager()
    
    print("Testing simple query...")
    result = manager.execute_query("SELECT 1 as test_value")
    print(f"Result type: {type(result)}")
    print(f"Result: {result}")
    print(f"Result length: {len(result) if hasattr(result, '__len__') else 'N/A'}")
    
    if result and len(result) > 0:
        print(f"First item: {result[0]}")
        print(f"First item type: {type(result[0])}")
    
    print("\nTesting parameterized query...")
    result2 = manager.execute_query("SELECT :value as test_param", {'value': 'hello'})
    print(f"Result2 type: {type(result2)}")
    print(f"Result2: {result2}")
    
    print("\nTesting NOW() query...")
    result3 = manager.execute_query("SELECT NOW() as current_time")
    print(f"Result3 type: {type(result3)}")
    print(f"Result3: {result3}")
    print(f"Result3 length: {len(result3) if hasattr(result3, '__len__') else 'N/A'}")

if __name__ == "__main__":
    debug_query()