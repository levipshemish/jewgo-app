#!/usr/bin/env python3
"""
Check Filter Options
===================

This script checks what certifying agencies the backend filter-options endpoint returns
and compares it with the database state.

Author: JewGo Development Team
Version: 1.0
Updated: 2025
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_backend_filter_options():
    """Check what the backend filter-options endpoint returns."""
    
    backend_url = os.environ.get("NEXT_PUBLIC_BACKEND_URL", "https://jewgo-app-oyoh.onrender.com")
    api_key = os.environ.get("BACKEND_API_KEY")
    
    print("🔍 Checking backend filter-options endpoint...")
    print(f"Backend URL: {backend_url}")
    
    try:
        # Make request to backend filter-options endpoint
        headers = {}
        if api_key:
            headers['Authorization'] = f'Bearer {api_key}'
        
        response = requests.get(
            f"{backend_url}/api/v4/restaurants/filter-options",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend filter-options response:")
            print(f"Status: {response.status_code}")
            
            if 'data' in data:
                agencies = data['data'].get('agencies', [])
                print(f"Certifying Agencies: {agencies}")
                print(f"Count: {len(agencies)}")
                
                # Check for unexpected agencies
                expected_agencies = {"ORB", "Kosher Miami"}
                unexpected_agencies = [agency for agency in agencies if agency not in expected_agencies]
                
                if unexpected_agencies:
                    print(f"⚠️  Unexpected agencies found: {unexpected_agencies}")
                else:
                    print("✅ All agencies are expected")
                    
            else:
                print("❌ No 'data' field in response")
                print(f"Response: {data}")
                
        else:
            print(f"❌ Backend request failed: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error checking backend: {e}")


def check_frontend_filter_options():
    """Check what the frontend filter-options endpoint returns."""
    
    print("\n🔍 Checking frontend filter-options endpoint...")
    
    try:
        # Make request to frontend filter-options endpoint
        response = requests.get(
            "http://localhost:3000/api/restaurants/filter-options",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Frontend filter-options response:")
            print(f"Status: {response.status_code}")
            
            if 'data' in data:
                agencies = data['data'].get('agencies', [])
                print(f"Certifying Agencies: {agencies}")
                print(f"Count: {len(agencies)}")
                
                # Check for unexpected agencies
                expected_agencies = {"ORB", "Kosher Miami"}
                unexpected_agencies = [agency for agency in agencies if agency not in expected_agencies]
                
                if unexpected_agencies:
                    print(f"⚠️  Unexpected agencies found: {unexpected_agencies}")
                else:
                    print("✅ All agencies are expected")
                    
            else:
                print("❌ No 'data' field in response")
                print(f"Response: {data}")
                
        else:
            print(f"❌ Frontend request failed: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error checking frontend: {e}")


def check_database_agencies():
    """Check what agencies exist in the database."""
    
    print("\n🔍 Checking database agencies...")
    
    try:
        # Change to backend directory and use its environment
        backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
        original_cwd = os.getcwd()
        os.chdir(backend_dir)
        
        # Add backend to path for imports
        sys.path.insert(0, backend_dir)
        
        from utils.database_connection_manager import get_db_manager
        from sqlalchemy import text
        
        # Get database connection
        db_manager = get_db_manager()
        
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return
        
        with db_manager.session_scope() as session:
            # Get all unique certifying agencies from database
            result = session.execute(
                text("""
                    SELECT DISTINCT certifying_agency, COUNT(*) as count
                    FROM restaurants 
                    WHERE certifying_agency IS NOT NULL 
                    AND certifying_agency != ''
                    GROUP BY certifying_agency
                    ORDER BY certifying_agency
                """)
            )
            
            agencies = result.fetchall()
            
            print("✅ Database agencies:")
            for agency, count in agencies:
                print(f"  - {agency}: {count} restaurants")
            
            # Check for unexpected agencies
            expected_agencies = {"ORB", "Kosher Miami"}
            db_agencies = {agency for agency, _ in agencies}
            unexpected_agencies = db_agencies - expected_agencies
            
            if unexpected_agencies:
                print(f"⚠️  Unexpected agencies in database: {unexpected_agencies}")
            else:
                print("✅ All database agencies are expected")
        
        # Restore original working directory
        os.chdir(original_cwd)
                
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        # Restore original working directory even on error
        try:
            os.chdir(original_cwd)
        except:
            pass


if __name__ == "__main__":
    print("🔍 Checking filter options across all layers...")
    print("=" * 60)
    
    check_backend_filter_options()
    check_frontend_filter_options()
    check_database_agencies()
    
    print("\n" + "=" * 60)
    print("✅ Check completed!")
