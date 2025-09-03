#!/usr/bin/env python3
"""
Migration script to set up PostgreSQL authentication system.

This script applies the database schema changes and initializes the
PostgreSQL authentication system to replace Supabase.
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database.database_manager_v4 import DatabaseManager
from utils.logging_config import get_logger

logger = get_logger(__name__)

def run_migration():
    """Run the PostgreSQL authentication migration."""
    try:
        logger.info("Starting PostgreSQL authentication migration...")
        
        # Initialize database manager
        db_manager = DatabaseManager()
        
        # Connect to database
        if not db_manager.connect():
            raise Exception("Failed to connect to database")
        
        # Read migration SQL file
        migration_file = backend_dir / "migrations" / "postgres_auth_migration.sql"
        if not migration_file.exists():
            raise FileNotFoundError(f"Migration file not found: {migration_file}")
        
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        from sqlalchemy import text
        with db_manager.connection_manager.session_scope() as session:
            logger.info("Executing database migration...")
            
            # Split the SQL into individual statements
            statements = []
            current_statement = []
            in_function = False
            
            for line in migration_sql.split('\n'):
                line = line.strip()
                
                # Skip comments and empty lines
                if not line or line.startswith('--'):
                    continue
                
                # Track if we're inside a function definition
                if 'CREATE OR REPLACE FUNCTION' in line.upper():
                    in_function = True
                elif line.upper().startswith('END;') and in_function:
                    in_function = False
                    current_statement.append(line)
                    statements.append('\n'.join(current_statement))
                    current_statement = []
                    continue
                elif line.endswith(';') and not in_function:
                    current_statement.append(line)
                    statements.append('\n'.join(current_statement))
                    current_statement = []
                    continue
                
                current_statement.append(line)
            
            # Add any remaining statement
            if current_statement:
                statements.append('\n'.join(current_statement))
            
            # Execute each statement
            for i, statement in enumerate(statements):
                if statement.strip():
                    try:
                        logger.debug(f"Executing statement {i+1}/{len(statements)}")
                        session.execute(text(statement))
                        session.commit()
                    except Exception as e:
                        logger.error(f"Error in statement {i+1}: {e}")
                        logger.error(f"Statement: {statement[:200]}...")
                        session.rollback()
                        raise
        
        logger.info("Database migration completed successfully!")
        
        # Verify migration
        verify_migration(db_manager)
        
        logger.info("Migration verification completed!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


def verify_migration(db_manager: DatabaseManager):
    """Verify that the migration was successful."""
    logger.info("Verifying migration...")
    
    from sqlalchemy import text
    with db_manager.connection_manager.session_scope() as session:
        # Check if new columns exist in users table
        result = session.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name IN (
                'password_hash', 'email_verified', 'verification_token',
                'failed_login_attempts', 'locked_until'
            )
        """)).fetchall()
        
        expected_columns = {
            'password_hash', 'email_verified', 'verification_token',
            'failed_login_attempts', 'locked_until'
        }
        found_columns = {row[0] for row in result}
        
        missing_columns = expected_columns - found_columns
        if missing_columns:
            raise Exception(f"Missing columns in users table: {missing_columns}")
        
        logger.info("✓ Users table columns added successfully")
        
        # Check if user_roles table exists
        result = session.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name = 'user_roles'
        """)).fetchone()
        
        if not result:
            raise Exception("user_roles table not found")
        
        logger.info("✓ User roles table created successfully")
        
        # Check if auth_audit_log table exists
        result = session.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name = 'auth_audit_log'
        """)).fetchone()
        
        if not result:
            raise Exception("auth_audit_log table not found")
        
        logger.info("✓ Auth audit log table created successfully")
        
        # Check if functions exist
        result = session.execute(text("""
            SELECT routine_name FROM information_schema.routines 
            WHERE routine_name IN ('user_has_permission', 'get_user_max_role_level')
            AND routine_type = 'FUNCTION'
        """)).fetchall()
        
        if len(result) < 2:
            raise Exception("Required functions not created")
        
        logger.info("✓ Database functions created successfully")
        
        # Check if default user roles were assigned
        result = session.execute(text("""
            SELECT COUNT(*) FROM user_roles WHERE role = 'user'
        """)).scalar()
        
        logger.info(f"✓ Default user roles assigned: {result} users")
        
        # Check if super admin roles were migrated
        result = session.execute(text("""
            SELECT COUNT(*) FROM user_roles WHERE role = 'super_admin'
        """)).scalar()
        
        logger.info(f"✓ Super admin roles migrated: {result} admins")


def create_test_user():
    """Create a test user for verification."""
    try:
        logger.info("Creating test user...")
        
        from utils.postgres_auth import initialize_postgres_auth
        
        # Initialize auth system
        db_manager = DatabaseManager()
        if not db_manager.connect():
            raise Exception("Failed to connect to database for test user creation")
        auth_manager = initialize_postgres_auth(db_manager)
        
        # Create test user
        test_email = "test@example.com"
        test_password = "TestPassword123!"
        test_name = "Test User"
        
        try:
            user_info = auth_manager.create_user(test_email, test_password, test_name)
            logger.info(f"✓ Test user created: {user_info['email']}")
            
            # Test authentication
            auth_result = auth_manager.authenticate_user(test_email, test_password)
            if auth_result:
                logger.info("✓ Test user authentication successful")
                
                # Generate tokens
                tokens = auth_manager.generate_tokens(auth_result)
                logger.info("✓ Token generation successful")
                
                # Verify token
                user_from_token = auth_manager.verify_access_token(tokens['access_token'])
                if user_from_token:
                    logger.info("✓ Token verification successful")
                else:
                    logger.warning("✗ Token verification failed")
            else:
                logger.warning("✗ Test user authentication failed")
                
        except Exception as e:
            if "already registered" in str(e):
                logger.info("Test user already exists, testing authentication...")
                auth_result = auth_manager.authenticate_user(test_email, test_password)
                if auth_result:
                    logger.info("✓ Existing test user authentication successful")
                else:
                    logger.warning("✗ Existing test user authentication failed")
            else:
                logger.error(f"Test user creation failed: {e}")
                raise
        
    except Exception as e:
        logger.error(f"Test user creation failed: {e}")
        # Don't fail the migration for test user issues
        logger.warning("Continuing migration despite test user issues...")


def main():
    """Main migration function."""
    print("=" * 60)
    print("PostgreSQL Authentication Migration")
    print("=" * 60)
    
    try:
        # Check environment variables
        required_vars = ['DATABASE_URL', 'JWT_SECRET']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {missing_vars}")
            sys.exit(1)
        
        # Run migration
        run_migration()
        
        # Create test user
        create_test_user()
        
        print("\n" + "=" * 60)
        print("✓ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Update your Flask app to use PostgreSQL auth")
        print("2. Update frontend to use new auth endpoints")
        print("3. Test the authentication flows")
        print("4. Remove Supabase dependencies when ready")
        print("=" * 60)
        
    except KeyboardInterrupt:
        logger.info("Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        print(f"\n✗ Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()