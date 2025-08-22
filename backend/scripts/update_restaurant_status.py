#!/usr/bin/env python3
"""
Update Restaurant Status Script
==============================

This script updates all restaurant entries in the database to have status='active'
so they will be displayed on the eatery page.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_database_connection():
    """Get database connection using environment variables"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not found")
        sys.exit(1)
    
    try:
        # Convert SQLAlchemy URL to psycopg2 format
        if database_url.startswith('postgresql+psycopg://'):
            # Remove the +psycopg part
            database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
        
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def update_restaurant_statuses():
    """Update all restaurant statuses to 'active'"""
    conn = get_database_connection()
    
    try:
        with conn.cursor() as cursor:
            # First, let's see what statuses currently exist
            cursor.execute("SELECT status, COUNT(*) FROM restaurants GROUP BY status")
            current_statuses = cursor.fetchall()
            
            print("Current restaurant statuses:")
            for status, count in current_statuses:
                print(f"  {status}: {count} restaurants")
            
            # Update all restaurants to have status='active'
            cursor.execute("""
                UPDATE restaurants 
                SET status = 'active', updated_at = %s 
                WHERE status != 'active' OR status IS NULL
            """, (datetime.now(),))
            
            updated_count = cursor.rowcount
            print(f"\nUpdated {updated_count} restaurants to status='active'")
            
            # Verify the update
            cursor.execute("SELECT status, COUNT(*) FROM restaurants GROUP BY status")
            new_statuses = cursor.fetchall()
            
            print("\nUpdated restaurant statuses:")
            for status, count in new_statuses:
                print(f"  {status}: {count} restaurants")
            
            # Commit the changes
            conn.commit()
            print(f"\nSuccessfully updated {updated_count} restaurants to active status")
            
    except Exception as e:
        print(f"Error updating restaurant statuses: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

def main():
    """Main function"""
    print("Restaurant Status Update Script")
    print("=" * 40)
    print("This script will update all restaurant statuses to 'active'")
    print("so they will be displayed on the eatery page.")
    print()
    
    # Ask for confirmation
    response = input("Do you want to proceed? (y/N): ")
    if response.lower() != 'y':
        print("Operation cancelled.")
        return
    
    update_restaurant_statuses()
    print("\nScript completed successfully!")

if __name__ == "__main__":
    main()
