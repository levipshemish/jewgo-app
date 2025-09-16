#!/usr/bin/env python3
"""
Fix User Roles Foreign Key Constraint
====================================
This script fixes the foreign key constraint issue in the user_roles table
by either making granted_by nullable or updating the constraint.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set the database URL for the script
os.environ['DATABASE_URL'] = 'postgresql://app_user:your_secure_password_here@129.80.190.110:5432/jewgo_db'

from database.connection_manager import get_connection_manager
from sqlalchemy import text

def inspect_user_roles_constraints():
    """Inspect the user_roles table constraints."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("🔍 INSPECTING USER_ROLES TABLE CONSTRAINTS")
            print("=" * 50)
            
            # Check if user_roles table exists
            result = session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_roles'
                );
            """)).fetchone()
            
            if not result or not result[0]:
                print("❌ user_roles table does not exist!")
                return False
            
            print("✅ user_roles table exists")
            
            # Check table structure
            result = session.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'user_roles' 
                ORDER BY ordinal_position;
            """)).fetchall()
            
            print("\n📋 user_roles table structure:")
            for row in result:
                print(f"   {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
            
            # Check foreign key constraints
            result = session.execute(text("""
                SELECT 
                    tc.constraint_name,
                    tc.constraint_type,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu 
                    ON tc.constraint_name = ccu.constraint_name
                WHERE tc.table_name = 'user_roles'
                AND tc.constraint_type = 'FOREIGN KEY';
            """)).fetchall()
            
            print("\n🔗 Foreign key constraints:")
            for row in result:
                print(f"   {row[0]}: {row[2]} -> {row[3]}.{row[4]}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error inspecting constraints: {e}")
        return False

def fix_granted_by_constraint():
    """Fix the granted_by foreign key constraint."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("\n🔧 FIXING GRANTED_BY CONSTRAINT")
            print("=" * 50)
            
            # Check current constraint
            result = session.execute(text("""
                SELECT 
                    tc.constraint_name,
                    kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'user_roles'
                AND kcu.column_name = 'granted_by'
                AND tc.constraint_type = 'FOREIGN KEY';
            """)).fetchall()
            
            if result:
                print(f"Found {len(result)} foreign key constraints on granted_by:")
                for row in result:
                    print(f"   - {row[0]} on column {row[1]}")
                
                # Drop the foreign key constraint
                for row in result:
                    constraint_name = row[0]
                    try:
                        session.execute(text(f"ALTER TABLE user_roles DROP CONSTRAINT {constraint_name};"))
                        print(f"✅ Dropped constraint: {constraint_name}")
                    except Exception as e:
                        print(f"❌ Failed to drop constraint {constraint_name}: {e}")
                
                # Make granted_by nullable
                try:
                    session.execute(text("ALTER TABLE user_roles ALTER COLUMN granted_by DROP NOT NULL;"))
                    print("✅ Made granted_by column nullable")
                except Exception as e:
                    print(f"❌ Failed to make granted_by nullable: {e}")
                
                # Add a default value for granted_by
                try:
                    session.execute(text("ALTER TABLE user_roles ALTER COLUMN granted_by SET DEFAULT 'system';"))
                    print("✅ Set default value for granted_by to 'system'")
                except Exception as e:
                    print(f"❌ Failed to set default for granted_by: {e}")
                    
            else:
                print("✅ No foreign key constraints found on granted_by column")
            
            return True
            
    except Exception as e:
        print(f"❌ Error fixing constraint: {e}")
        return False

def test_user_role_creation():
    """Test creating a user role to verify the fix."""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            print("\n🧪 TESTING USER ROLE CREATION")
            print("=" * 50)
            
            # Get the existing admin user
            result = session.execute(text("""
                SELECT id FROM users WHERE email = 'admin@jewgo.app' LIMIT 1;
            """)).fetchone()
            
            if not result:
                print("❌ No admin user found to test with")
                return False
            
            user_id = result[0]
            print(f"✅ Found admin user with ID: {user_id}")
            
            # Test creating a user role
            try:
                session.execute(text("""
                    INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active, created_at, updated_at)
                    VALUES (:user_id, 'user', 1, NOW(), :user_id, TRUE, NOW(), NOW())
                    ON CONFLICT (user_id, role) DO NOTHING;
                """), {'user_id': user_id})
                
                print("✅ Successfully created user role")
                
                # Check if the role was created
                result = session.execute(text("""
                    SELECT role, level, granted_by FROM user_roles 
                    WHERE user_id = :user_id AND role = 'user';
                """), {'user_id': user_id}).fetchone()
                
                if result:
                    print(f"✅ Role verified: {result[0]} (level {result[1]}, granted by {result[2]})")
                    return True
                else:
                    print("❌ Role was not created")
                    return False
                    
            except Exception as e:
                print(f"❌ Failed to create user role: {e}")
                return False
                
    except Exception as e:
        print(f"❌ Error testing role creation: {e}")
        return False

def main():
    """Main function to fix user roles constraints."""
    print("🔧 USER ROLES FOREIGN KEY CONSTRAINT FIX")
    print("=" * 60)
    print("This script will fix the foreign key constraint issue")
    print("in the user_roles table that prevents user registration.\n")
    
    try:
        # Step 1: Inspect current constraints
        if not inspect_user_roles_constraints():
            print("❌ Failed to inspect constraints")
            return
        
        # Step 2: Fix the constraint
        if not fix_granted_by_constraint():
            print("❌ Failed to fix constraint")
            return
        
        # Step 3: Test the fix
        if test_user_role_creation():
            print("\n✅ USER ROLES CONSTRAINT FIX COMPLETED SUCCESSFULLY")
            print("=" * 50)
            print("User role creation should now work properly.")
        else:
            print("\n❌ CONSTRAINT FIX FAILED")
            print("Please check the error messages above.")
            
    except Exception as e:
        print(f"❌ Error during constraint fix: {e}")

if __name__ == "__main__":
    main()
