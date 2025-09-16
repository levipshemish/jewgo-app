#!/usr/bin/env python3
"""
Quick Database Check Script
==========================
Simple script to quickly check database state for email uniqueness issues.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set a test database URL for local inspection
os.environ['DATABASE_URL'] = 'postgresql://app_user:your_secure_password_here@129.80.190.110:5432/jewgo_db'

from database.connection_manager import get_connection_manager
from sqlalchemy import text

def quick_check():
    """Quick check of database state."""
    try:
        print("🔍 Quick Database Check")
        print("=" * 30)
        
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            # 1. Check total users
            result = session.execute(text("SELECT COUNT(*) FROM users")).fetchone()
            total_users = result[0] if result else 0
            print(f"Total users: {total_users}")
            
            if total_users == 0:
                print("✅ No users in database - registration should work")
                return
            
            # 2. List all emails
            result = session.execute(text("SELECT email FROM users ORDER BY email")).fetchall()
            emails = [row[0] for row in result]
            print(f"\nAll emails in database ({len(emails)}):")
            for email in emails:
                print(f"  - {email}")
            
            # 3. Check for unique constraints
            result = session.execute(text("""
                SELECT 
                    tc.constraint_name,
                    tc.constraint_type
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'users' 
                AND kcu.column_name = 'email'
                AND tc.constraint_type = 'UNIQUE';
            """)).fetchall()
            
            if result:
                print(f"\n⚠️  Found {len(result)} unique constraints on email:")
                for row in result:
                    print(f"  - {row[0]} ({row[1]})")
            else:
                print("\n✅ No unique constraints on email column")
            
            # 4. Test specific emails
            test_emails = [
                'admin@jewgo.app',
                'test@example.com',
                'newadmin@jewgo.app'
            ]
            
            print(f"\nTesting specific emails:")
            for email in test_emails:
                result = session.execute(text("SELECT id FROM users WHERE email = :email"), {'email': email}).fetchone()
                exists = result is not None
                print(f"  - {email}: {'EXISTS' if exists else 'AVAILABLE'}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    quick_check()
