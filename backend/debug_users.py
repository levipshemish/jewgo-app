#!/usr/bin/env python3
"""
Debug script to check users in the database
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection_manager import get_connection_manager
from sqlalchemy import text

def check_users():
    """Check what users exist in the database"""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            # Get all users
            result = session.execute(
                text("SELECT id, email, name FROM users ORDER BY email")
            ).fetchall()
            
            print(f"Found {len(result)} users in database:")
            for row in result:
                print(f"  ID: {row[0]}, Email: '{row[1]}', Name: '{row[2]}'")
            
            # Check for specific email
            test_email = "investigation123@test.com"
            result = session.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {'email': test_email}
            ).fetchone()
            
            print(f"\nChecking for email '{test_email}': {result}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_users()
