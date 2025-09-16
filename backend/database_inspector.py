#!/usr/bin/env python3
"""
Database Inspector Script
========================
This script inspects the database schema and existing data to identify
issues with user registration and email uniqueness constraints.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection_manager import get_connection_manager
from sqlalchemy import text

def inspect_database_schema():
    """Inspect the database schema for constraints and indexes."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("🔍 DATABASE SCHEMA INSPECTION")
            print("=" * 50)
            
            # 1. Check if users table exists
            print("\n1. Checking if users table exists...")
            result = session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users'
                );
            """)).fetchone()
            
            if result and result[0]:
                print("✅ Users table exists")
            else:
                print("❌ Users table does not exist!")
                return
            
            # 2. Check users table structure
            print("\n2. Users table structure:")
            result = session.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position;
            """)).fetchall()
            
            for row in result:
                print(f"   {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
            
            # 3. Check for unique constraints on email column
            print("\n3. Checking for unique constraints on email column:")
            result = session.execute(text("""
                SELECT 
                    tc.constraint_name,
                    tc.constraint_type,
                    kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'users' 
                AND kcu.column_name = 'email'
                AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');
            """)).fetchall()
            
            if result:
                for row in result:
                    print(f"   ⚠️  Found {row[1]} constraint: {row[0]} on column {row[2]}")
            else:
                print("   ✅ No unique constraints found on email column")
            
            # 4. Check for indexes on email column
            print("\n4. Checking for indexes on email column:")
            result = session.execute(text("""
                SELECT 
                    indexname,
                    indexdef
                FROM pg_indexes 
                WHERE tablename = 'users' 
                AND indexdef LIKE '%email%';
            """)).fetchall()
            
            if result:
                for row in result:
                    print(f"   📋 Index: {row[0]}")
                    print(f"      Definition: {row[1]}")
            else:
                print("   ✅ No indexes found on email column")
            
            # 5. Check for check constraints
            print("\n5. Checking for check constraints on users table:")
            result = session.execute(text("""
                SELECT 
                    constraint_name,
                    check_clause
                FROM information_schema.check_constraints
                WHERE constraint_name IN (
                    SELECT constraint_name 
                    FROM information_schema.table_constraints 
                    WHERE table_name = 'users'
                );
            """)).fetchall()
            
            if result:
                for row in result:
                    print(f"   🔍 Check constraint: {row[0]}")
                    print(f"      Clause: {row[1]}")
            else:
                print("   ✅ No check constraints found")
            
            # 6. Check for triggers on users table
            print("\n6. Checking for triggers on users table:")
            result = session.execute(text("""
                SELECT 
                    trigger_name,
                    event_manipulation,
                    action_timing,
                    action_statement
                FROM information_schema.triggers 
                WHERE event_object_table = 'users';
            """)).fetchall()
            
            if result:
                for row in result:
                    print(f"   ⚡ Trigger: {row[0]} ({row[1]} {row[2]})")
                    print(f"      Statement: {row[3]}")
            else:
                print("   ✅ No triggers found on users table")
                
    except Exception as e:
        print(f"❌ Error inspecting database schema: {e}")

def inspect_existing_users():
    """Inspect existing users in the database."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("\n\n👥 EXISTING USERS INSPECTION")
            print("=" * 50)
            
            # 1. Count total users
            result = session.execute(text("SELECT COUNT(*) FROM users")).fetchone()
            total_users = result[0] if result else 0
            print(f"\n1. Total users in database: {total_users}")
            
            if total_users == 0:
                print("✅ No users found in database")
                return
            
            # 2. List all users with their details
            print("\n2. All users in database:")
            result = session.execute(text("""
                SELECT 
                    id, 
                    email, 
                    name, 
                    email_verified,
                    is_guest,
                    "createdAt",
                    "isSuperAdmin"
                FROM users 
                ORDER BY "createdAt" DESC;
            """)).fetchall()
            
            for i, row in enumerate(result, 1):
                print(f"   {i}. ID: {row[0]}")
                print(f"      Email: '{row[1]}'")
                print(f"      Name: '{row[2]}'")
                print(f"      Email Verified: {row[3]}")
                print(f"      Is Guest: {row[4]}")
                print(f"      Created: {row[5]}")
                print(f"      Is Super Admin: {row[6]}")
                print()
            
            # 3. Check for duplicate emails
            print("\n3. Checking for duplicate emails:")
            result = session.execute(text("""
                SELECT email, COUNT(*) as count
                FROM users 
                GROUP BY email 
                HAVING COUNT(*) > 1;
            """)).fetchall()
            
            if result:
                print("   ⚠️  Found duplicate emails:")
                for row in result:
                    print(f"      '{row[0]}': {row[1]} occurrences")
            else:
                print("   ✅ No duplicate emails found")
            
            # 4. Check for guest users
            print("\n4. Checking for guest users:")
            result = session.execute(text("""
                SELECT COUNT(*) 
                FROM users 
                WHERE is_guest = TRUE OR email LIKE '%@guest.local';
            """)).fetchone()
            
            guest_count = result[0] if result else 0
            print(f"   Guest users: {guest_count}")
            
            # 5. Check for test users
            print("\n5. Checking for potential test users:")
            test_patterns = ['test', 'debug', 'admin', 'example.com', 'jewgo.app']
            for pattern in test_patterns:
                result = session.execute(text("""
                    SELECT COUNT(*) 
                    FROM users 
                    WHERE email ILIKE :pattern OR name ILIKE :pattern;
                """), {'pattern': f'%{pattern}%'}).fetchone()
                
                count = result[0] if result else 0
                if count > 0:
                    print(f"   Users with '{pattern}': {count}")
                    
                    # Show details of test users
                    result = session.execute(text("""
                        SELECT id, email, name 
                        FROM users 
                        WHERE email ILIKE :pattern OR name ILIKE :pattern;
                    """), {'pattern': f'%{pattern}%'}).fetchall()
                    
                    for row in result:
                        print(f"      - {row[1]} ({row[2]}) - ID: {row[0]}")
                        
    except Exception as e:
        print(f"❌ Error inspecting existing users: {e}")

def cleanup_test_users():
    """Clean up test users from the database."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("\n\n🧹 CLEANUP TEST USERS")
            print("=" * 50)
            
            # Define test patterns
            test_patterns = [
                'test@example.com',
                'debugtest@example.com', 
                'admin@jewgo.app',
                'admin2@jewgo.app',
                'testadmin@jewgo.app',
                'investigation123@test.com',
                'uniqueuser12345@example.com',
                'finaltest@example.com',
                'bypasstest@example.com',
                'integritytest@example.com',
                'debugtest123@example.com'
            ]
            
            print("\nLooking for test users with these emails:")
            for pattern in test_patterns:
                print(f"   - {pattern}")
            
            # Check which test users exist
            existing_test_users = []
            for pattern in test_patterns:
                result = session.execute(text("""
                    SELECT id, email, name 
                    FROM users 
                    WHERE email = :email;
                """), {'email': pattern}).fetchone()
                
                if result:
                    existing_test_users.append(result)
                    print(f"   Found: {result[1]} ({result[2]}) - ID: {result[0]}")
            
            if not existing_test_users:
                print("   ✅ No test users found to clean up")
                return
            
            print(f"\nFound {len(existing_test_users)} test users to clean up")
            
            # Ask for confirmation (in a real scenario, you'd want user input)
            print("\n⚠️  WARNING: This will delete test users and their associated data!")
            print("In a real scenario, you should get user confirmation before proceeding.")
            
            # For now, let's just show what would be deleted without actually deleting
            print("\nWould delete the following users and their associated data:")
            for user in existing_test_users:
                print(f"   - {user[1]} (ID: {user[0]})")
                
                # Check for associated data
                # User roles
                roles_result = session.execute(text("""
                    SELECT COUNT(*) FROM user_roles WHERE user_id = :user_id;
                """), {'user_id': user[0]}).fetchone()
                roles_count = roles_result[0] if roles_result else 0
                
                # Auth sessions
                sessions_result = session.execute(text("""
                    SELECT COUNT(*) FROM auth_sessions WHERE user_id = :user_id;
                """), {'user_id': user[0]}).fetchone()
                sessions_count = sessions_result[0] if sessions_result else 0
                
                print(f"     Associated data: {roles_count} roles, {sessions_count} sessions")
            
            print("\nTo actually perform the cleanup, uncomment the cleanup code in the script.")
            
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")

def remove_email_constraint():
    """Remove unique constraint from email column if it exists."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("\n\n🔧 CONSTRAINT REMOVAL")
            print("=" * 50)
            
            # Check for unique constraints on email
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
            
            if not result:
                print("✅ No unique constraints found on email column")
                return
            
            print("⚠️  Found unique constraints on email column:")
            for row in result:
                print(f"   - {row[0]} ({row[1]})")
            
            print("\nTo remove these constraints, you would run:")
            for row in result:
                print(f"   ALTER TABLE users DROP CONSTRAINT {row[0]};")
            
            print("\n⚠️  WARNING: Removing unique constraints will allow duplicate emails!")
            print("Only do this if you're sure it's what you want.")
            
    except Exception as e:
        print(f"❌ Error checking constraints: {e}")

def main():
    """Main function to run all inspections."""
    print("🔍 JEWGO DATABASE INSPECTOR")
    print("=" * 60)
    print("This script will inspect your database schema and existing data")
    print("to help identify issues with user registration.\n")
    
    try:
        # Run all inspections
        inspect_database_schema()
        inspect_existing_users()
        cleanup_test_users()
        remove_email_constraint()
        
        print("\n\n✅ INSPECTION COMPLETE")
        print("=" * 50)
        print("Review the output above to identify any issues.")
        print("Common issues and solutions:")
        print("1. Unique constraint on email - Remove if not needed")
        print("2. Test users exist - Clean up test data")
        print("3. Duplicate emails - Investigate data integrity")
        
    except Exception as e:
        print(f"❌ Error during inspection: {e}")

if __name__ == "__main__":
    main()
