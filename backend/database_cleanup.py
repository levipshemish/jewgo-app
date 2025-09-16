#!/usr/bin/env python3
"""
Database Cleanup Script
=====================
This script safely cleans up test users and removes unwanted constraints
from the database to resolve email uniqueness issues.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection_manager import get_connection_manager
from sqlalchemy import text

def confirm_action(message):
    """Ask for user confirmation before performing destructive actions."""
    response = input(f"\n{message} (yes/no): ").lower().strip()
    return response in ['yes', 'y']

def backup_users_table():
    """Create a backup of the users table before cleanup."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("📦 Creating backup of users table...")
            
            # Create backup table
            session.execute(text("""
                CREATE TABLE IF NOT EXISTS users_backup_$(date +%Y%m%d_%H%M%S) AS 
                SELECT * FROM users;
            """))
            
            print("✅ Backup created successfully")
            
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return False
    
    return True

def cleanup_test_users():
    """Clean up test users from the database."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("\n🧹 CLEANING UP TEST USERS")
            print("=" * 50)
            
            # Define test email patterns to clean up
            test_emails = [
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
            
            # Also clean up any emails containing test patterns
            test_patterns = [
                '%test%',
                '%debug%',
                '%example.com'
            ]
            
            print("Looking for test users to clean up...")
            
            # Get all test users
            test_users = []
            
            # Check specific test emails
            for email in test_emails:
                result = session.execute(text("""
                    SELECT id, email, name, "createdAt"
                    FROM users 
                    WHERE email = :email;
                """), {'email': email}).fetchone()
                
                if result:
                    test_users.append(result)
            
            # Check pattern-based test emails
            for pattern in test_patterns:
                result = session.execute(text("""
                    SELECT id, email, name, "createdAt"
                    FROM users 
                    WHERE email ILIKE :pattern
                    AND email NOT IN (
                        SELECT email FROM users 
                        WHERE email IN :specific_emails
                    );
                """), {'pattern': pattern, 'specific_emails': tuple(test_emails)}).fetchall()
                
                test_users.extend(result)
            
            if not test_users:
                print("✅ No test users found to clean up")
                return True
            
            print(f"\nFound {len(test_users)} test users:")
            for user in test_users:
                print(f"   - {user[1]} ({user[2]}) - Created: {user[3]}")
            
            if not confirm_action("Do you want to delete these test users?"):
                print("❌ Cleanup cancelled by user")
                return False
            
            # Delete associated data first (foreign key constraints)
            deleted_count = 0
            for user in test_users:
                user_id = user[0]
                
                # Delete user roles
                session.execute(text("""
                    DELETE FROM user_roles WHERE user_id = :user_id;
                """), {'user_id': user_id})
                
                # Delete auth sessions
                session.execute(text("""
                    DELETE FROM auth_sessions WHERE user_id = :user_id;
                """), {'user_id': user_id})
                
                # Delete audit log entries
                session.execute(text("""
                    DELETE FROM auth_audit_log WHERE user_id = :user_id;
                """), {'user_id': user_id})
                
                # Delete accounts (OAuth)
                session.execute(text("""
                    DELETE FROM accounts WHERE userId = :user_id;
                """), {'user_id': user_id})
                
                # Delete the user
                session.execute(text("""
                    DELETE FROM users WHERE id = :user_id;
                """), {'user_id': user_id})
                
                deleted_count += 1
                print(f"   ✅ Deleted user: {user[1]}")
            
            print(f"\n✅ Successfully deleted {deleted_count} test users and their associated data")
            return True
            
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        return False

def remove_email_unique_constraint():
    """Remove unique constraint from email column if it exists."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("\n🔧 REMOVING EMAIL UNIQUE CONSTRAINT")
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
                return True
            
            print("⚠️  Found unique constraints on email column:")
            constraints_to_remove = []
            for row in result:
                print(f"   - {row[0]} ({row[1]})")
                constraints_to_remove.append(row[0])
            
            print("\n⚠️  WARNING: This will allow duplicate email addresses!")
            print("This should only be done if you're certain it's what you want.")
            
            if not confirm_action("Do you want to remove these unique constraints?"):
                print("❌ Constraint removal cancelled by user")
                return False
            
            # Remove constraints
            for constraint_name in constraints_to_remove:
                try:
                    session.execute(text(f"""
                        ALTER TABLE users DROP CONSTRAINT {constraint_name};
                    """))
                    print(f"   ✅ Removed constraint: {constraint_name}")
                except Exception as e:
                    print(f"   ❌ Failed to remove constraint {constraint_name}: {e}")
            
            print("\n✅ Unique constraints removed successfully")
            return True
            
    except Exception as e:
        print(f"❌ Error removing constraints: {e}")
        return False

def add_email_unique_constraint():
    """Add a unique constraint to the email column (optional)."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("\n🔧 ADDING EMAIL UNIQUE CONSTRAINT")
            print("=" * 50)
            
            # Check if constraint already exists
            result = session.execute(text("""
                SELECT 
                    tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'users' 
                AND kcu.column_name = 'email'
                AND tc.constraint_type = 'UNIQUE';
            """)).fetchone()
            
            if result:
                print("✅ Unique constraint already exists on email column")
                return True
            
            # Check for duplicate emails first
            duplicate_result = session.execute(text("""
                SELECT email, COUNT(*) as count
                FROM users 
                GROUP BY email 
                HAVING COUNT(*) > 1;
            """)).fetchall()
            
            if duplicate_result:
                print("❌ Cannot add unique constraint - duplicate emails found:")
                for row in duplicate_result:
                    print(f"   - '{row[0]}': {row[1]} occurrences")
                print("Please clean up duplicate emails first.")
                return False
            
            if not confirm_action("Do you want to add a unique constraint to the email column?"):
                print("❌ Constraint addition cancelled by user")
                return False
            
            # Add unique constraint
            try:
                session.execute(text("""
                    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
                """))
                print("✅ Added unique constraint to email column")
                return True
            except Exception as e:
                print(f"❌ Failed to add unique constraint: {e}")
                return False
                
    except Exception as e:
        print(f"❌ Error adding constraint: {e}")
        return False

def verify_cleanup():
    """Verify that the cleanup was successful."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("\n✅ VERIFYING CLEANUP")
            print("=" * 50)
            
            # Check user count
            result = session.execute(text("SELECT COUNT(*) FROM users")).fetchone()
            user_count = result[0] if result else 0
            print(f"Total users remaining: {user_count}")
            
            # Check for test users
            test_patterns = ['test@example.com', 'debugtest@example.com', 'admin@jewgo.app']
            test_users_found = 0
            for pattern in test_patterns:
                result = session.execute(text("""
                    SELECT COUNT(*) FROM users WHERE email = :email;
                """), {'email': pattern}).fetchone()
                if result and result[0] > 0:
                    test_users_found += result[0]
            
            if test_users_found == 0:
                print("✅ No test users found")
            else:
                print(f"⚠️  Found {test_users_found} test users still in database")
            
            # Check for unique constraints
            result = session.execute(text("""
                SELECT COUNT(*)
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'users' 
                AND kcu.column_name = 'email'
                AND tc.constraint_type = 'UNIQUE';
            """)).fetchone()
            
            constraint_count = result[0] if result else 0
            print(f"Unique constraints on email: {constraint_count}")
            
            # Test registration capability
            print("\n🧪 Testing registration capability...")
            test_email = "test_registration_capability@example.com"
            
            # Check if this email exists
            result = session.execute(text("""
                SELECT id FROM users WHERE email = :email;
            """), {'email': test_email}).fetchone()
            
            if result:
                print(f"⚠️  Test email {test_email} already exists")
            else:
                print(f"✅ Test email {test_email} is available")
                
    except Exception as e:
        print(f"❌ Error during verification: {e}")

def main():
    """Main function to run database cleanup."""
    print("🧹 JEWGO DATABASE CLEANUP TOOL")
    print("=" * 60)
    print("This script will help clean up your database to resolve")
    print("email uniqueness issues with user registration.\n")
    
    # Check if running in production
    if os.getenv('FLASK_ENV') == 'production':
        print("⚠️  WARNING: You are running this in production environment!")
        if not confirm_action("Are you sure you want to proceed?"):
            print("❌ Cleanup cancelled")
            return
    
    try:
        print("Choose an action:")
        print("1. Clean up test users only")
        print("2. Remove unique constraints on email only")
        print("3. Full cleanup (test users + constraints)")
        print("4. Add unique constraint to email")
        print("5. Verify current state")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        success = True
        
        if choice == '1':
            success = cleanup_test_users()
        elif choice == '2':
            success = remove_email_unique_constraint()
        elif choice == '3':
            success = cleanup_test_users() and remove_email_unique_constraint()
        elif choice == '4':
            success = add_email_unique_constraint()
        elif choice == '5':
            verify_cleanup()
            return
        else:
            print("❌ Invalid choice")
            return
        
        if success:
            print("\n✅ CLEANUP COMPLETED SUCCESSFULLY")
            print("=" * 50)
            print("You can now try registering a new admin account.")
            verify_cleanup()
        else:
            print("\n❌ CLEANUP FAILED")
            print("Please check the error messages above.")
            
    except KeyboardInterrupt:
        print("\n❌ Cleanup cancelled by user")
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")

if __name__ == "__main__":
    main()
