#!/usr/bin/env python3
"""Simple database test script for debugging synagogues API issues."""

import os
import psycopg2
from dotenv import load_dotenv

def test_database_connection():
    """Test basic database connectivity."""
    try:
        # Load environment variables
        load_dotenv('../.env')
        
        # Get database URL
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("ERROR: DATABASE_URL not found in environment")
            return False
            
        print(f"Database URL: {database_url[:50]}...")
        
        # Test connection
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # Test basic query
        cur.execute("SELECT version()")
        version = cur.fetchone()
        print(f"PostgreSQL version: {version[0]}")
        
        # Test shuls table
        cur.execute("SELECT COUNT(*) FROM shuls")
        count = cur.fetchone()
        print(f"Shuls count: {count[0]}")
        
        # Test sample data
        cur.execute("SELECT id, name, city, state FROM shuls LIMIT 3")
        sample = cur.fetchall()
        print("Sample shuls:")
        for row in sample:
            print(f"  ID: {row[0]}, Name: {row[1]}, City: {row[2]}, State: {row[3]}")
        
        cur.close()
        conn.close()
        print("Database connection test successful!")
        return True
        
    except Exception as e:
        print(f"Database connection test failed: {e}")
        return False

def test_synagogues_query():
    """Test the exact query used in the synagogues API."""
    try:
        # Load environment variables
        load_dotenv('../.env')
        
        # Get database URL
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("ERROR: DATABASE_URL not found in environment")
            return False
            
        # Test connection
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # Test the exact query from the API
        query = """
        SELECT 
            id, name, description, address, city, state, zip_code, country,
            phone_number, website, email, shul_type, shul_category, denomination,
            business_hours, has_daily_minyan, has_shabbat_services, has_holiday_services,
            has_women_section, has_mechitza, has_separate_entrance, rabbi_name,
            religious_authority, community_affiliation, kosher_certification,
            has_parking, has_disabled_access, has_kiddush_facilities, has_social_hall,
            has_library, has_hebrew_school, has_adult_education, has_youth_programs,
            has_senior_programs, membership_required, membership_fee, fee_currency,
            accepts_visitors, visitor_policy, is_active, is_verified, created_at,
            updated_at, tags, rating, review_count, star_rating, google_rating,
            image_url, logo_url, latitude, longitude
        FROM shuls 
        WHERE is_active = true
        ORDER BY name ASC
        LIMIT 5 OFFSET 0
        """
        
        cur.execute(query)
        results = cur.fetchall()
        print(f"Query returned {len(results)} results")
        
        if results:
            print("First result:")
            print(f"  ID: {results[0][0]}")
            print(f"  Name: {results[0][1]}")
            print(f"  City: {results[0][4]}")
        
        cur.close()
        conn.close()
        print("Synagogues query test successful!")
        return True
        
    except Exception as e:
        print(f"Synagogues query test failed: {e}")
        return False

if __name__ == "__main__":
    print("=== Database Connection Test ===")
    test_database_connection()
    
    print("\n=== Synagogues Query Test ===")
    test_synagogues_query()
