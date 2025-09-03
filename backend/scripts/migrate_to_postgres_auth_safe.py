#!/usr/bin/env python3
"""
Safe PostgreSQL authentication migration script.

This script safely applies the authentication migration by checking for 
existing database objects before creating them.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database.database_manager_v4 import DatabaseManager
from utils.logging_config import get_logger
from sqlalchemy import text

logger = get_logger(__name__)

def safe_execute(session, sql, description, ignore_errors=None):
    """Safely execute SQL with error handling."""
    if ignore_errors is None:
        ignore_errors = []
    
    try:
        logger.info(f"Executing: {description}")
        session.execute(text(sql))
        session.commit()
        logger.info(f"✓ {description}")
        return True
    except Exception as e:
        error_msg = str(e)
        if any(ignore_error in error_msg for ignore_error in ignore_errors):
            logger.info(f"⚠ {description} (already exists)")
            return True
        else:
            logger.error(f"✗ {description}: {error_msg}")
            session.rollback()
            return False

def run_safe_migration():
    """Run the safe PostgreSQL authentication migration."""
    try:
        logger.info("Starting safe PostgreSQL authentication migration...")
        
        # Initialize database manager
        db_manager = DatabaseManager()
        
        # Connect to database
        if not db_manager.connect():
            raise Exception("Failed to connect to database")
        
        with db_manager.connection_manager.session_scope() as session:
            logger.info("Executing safe database migration...")
            
            # 1. Add authentication columns to users table
            columns_to_add = [
                ("password_hash", "VARCHAR(255)"),
                ("email_verified", "BOOLEAN DEFAULT FALSE"),
                ("verification_token", "VARCHAR(255)"),
                ("verification_expires", "TIMESTAMP"),
                ("reset_token", "VARCHAR(255)"),
                ("reset_expires", "TIMESTAMP"),
                ("failed_login_attempts", "INTEGER DEFAULT 0"),
                ("locked_until", "TIMESTAMP"),
                ("last_login", "TIMESTAMP"),
                ("two_factor_secret", "VARCHAR(100)"),
                ("two_factor_enabled", "BOOLEAN DEFAULT FALSE")
            ]
            
            for column_name, column_type in columns_to_add:
                safe_execute(
                    session,
                    f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {column_type}",
                    f"Add {column_name} column to users table",
                    ignore_errors=["already exists"]
                )
            
            # 2. Create user_roles table
            safe_execute(
                session,
                """
                CREATE TABLE IF NOT EXISTS user_roles (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(50) NOT NULL,
                    role VARCHAR(50) NOT NULL,
                    level INTEGER DEFAULT 0,
                    granted_by VARCHAR(50),
                    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, role)
                )
                """,
                "Create user_roles table"
            )
            
            # 3. Create auth_audit_log table
            safe_execute(
                session,
                """
                CREATE TABLE IF NOT EXISTS auth_audit_log (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(50),
                    action VARCHAR(50) NOT NULL,
                    ip_address INET,
                    user_agent TEXT,
                    success BOOLEAN NOT NULL,
                    details JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """,
                "Create auth_audit_log table"
            )
            
            # 4. Add foreign key constraints (with error handling for existing constraints)
            safe_execute(
                session,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_user_id') THEN
                        ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user_id 
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
                    END IF;
                END $$
                """,
                "Add user_roles foreign key constraint"
            )
            
            safe_execute(
                session,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_granted_by') THEN
                        ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_granted_by 
                        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;
                    END IF;
                END $$
                """,
                "Add user_roles granted_by foreign key constraint"
            )
            
            safe_execute(
                session,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_auth_audit_user_id') THEN
                        ALTER TABLE auth_audit_log ADD CONSTRAINT fk_auth_audit_user_id 
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
                    END IF;
                END $$
                """,
                "Add auth_audit_log foreign key constraint"
            )
            
            # 5. Create indexes
            indexes = [
                ("idx_users_email", "users", "email"),
                ("idx_users_verification_token", "users", "verification_token WHERE verification_token IS NOT NULL"),
                ("idx_users_reset_token", "users", "reset_token WHERE reset_token IS NOT NULL"),
                ("idx_users_locked_until", "users", "locked_until WHERE locked_until IS NOT NULL"),
                ("idx_user_roles_user_id", "user_roles", "user_id"),
                ("idx_user_roles_active", "user_roles", "user_id, is_active, expires_at"),
                ("idx_user_roles_role", "user_roles", "role"),
                ("idx_sessions_user_id", "sessions", '"userId"'),
                ("idx_sessions_token", "sessions", '"sessionToken"'),
                ("idx_sessions_expires", "sessions", "expires"),
                ("idx_auth_audit_user_id", "auth_audit_log", "user_id"),
                ("idx_auth_audit_action", "auth_audit_log", "action"),
                ("idx_auth_audit_created", "auth_audit_log", "created_at"),
                ("idx_auth_audit_success", "auth_audit_log", "success"),
            ]
            
            for index_name, table_name, columns in indexes:
                safe_execute(
                    session,
                    f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name}({columns})",
                    f"Create index {index_name}",
                    ignore_errors=["already exists"]
                )
            
            # 6. Create database functions
            safe_execute(
                session,
                """
                CREATE OR REPLACE FUNCTION user_has_permission(p_user_id VARCHAR(50), p_permission VARCHAR(50))
                RETURNS BOOLEAN AS $$
                DECLARE
                    has_perm BOOLEAN DEFAULT FALSE;
                BEGIN
                    -- Check if user has 'all' permission (super admin)
                    SELECT TRUE INTO has_perm
                    FROM user_roles ur
                    WHERE ur.user_id = p_user_id 
                    AND ur.is_active = TRUE
                    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
                    AND ur.role = 'super_admin'
                    LIMIT 1;
                    
                    IF has_perm THEN
                        RETURN TRUE;
                    END IF;
                    
                    -- Admin permissions
                    IF p_permission IN ('manage_users', 'manage_restaurants', 'access_admin_panel', 'view_analytics', 'system_configuration') THEN
                        SELECT TRUE INTO has_perm
                        FROM user_roles ur
                        WHERE ur.user_id = p_user_id 
                        AND ur.is_active = TRUE
                        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
                        AND ur.role IN ('admin', 'super_admin')
                        LIMIT 1;
                    END IF;
                    
                    -- Moderator permissions
                    IF p_permission IN ('moderate_reviews', 'edit_restaurant_hours', 'view_reported_content', 'manage_user_reports') THEN
                        SELECT TRUE INTO has_perm
                        FROM user_roles ur
                        WHERE ur.user_id = p_user_id 
                        AND ur.is_active = TRUE
                        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
                        AND ur.role IN ('moderator', 'admin', 'super_admin')
                        LIMIT 1;
                    END IF;
                    
                    -- Basic user permissions
                    IF p_permission IN ('read_restaurants', 'create_reviews', 'manage_own_profile', 'view_public_content') THEN
                        SELECT TRUE INTO has_perm
                        FROM user_roles ur
                        WHERE ur.user_id = p_user_id 
                        AND ur.is_active = TRUE
                        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
                        LIMIT 1;
                    END IF;
                    
                    RETURN COALESCE(has_perm, FALSE);
                END;
                $$ LANGUAGE plpgsql
                """,
                "Create user_has_permission function"
            )
            
            safe_execute(
                session,
                """
                CREATE OR REPLACE FUNCTION get_user_max_role_level(p_user_id VARCHAR(50))
                RETURNS INTEGER AS $$
                DECLARE
                    max_level INTEGER DEFAULT 0;
                BEGIN
                    SELECT COALESCE(MAX(ur.level), 0) INTO max_level
                    FROM user_roles ur
                    WHERE ur.user_id = p_user_id 
                    AND ur.is_active = TRUE
                    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
                    
                    RETURN max_level;
                END;
                $$ LANGUAGE plpgsql
                """,
                "Create get_user_max_role_level function"
            )
            
            # 7. Update existing users to have email verified (migration safety)
            safe_execute(
                session,
                "UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL",
                "Set existing users as email verified"
            )
            
            # 8. Insert default roles for existing users
            safe_execute(
                session,
                """
                INSERT INTO user_roles (user_id, role, level, granted_at, is_active)
                SELECT 
                    id,
                    'user',
                    1,
                    CURRENT_TIMESTAMP,
                    TRUE
                FROM users
                WHERE id NOT IN (SELECT DISTINCT user_id FROM user_roles WHERE role = 'user')
                """,
                "Assign default user roles to existing users"
            )
            
            # 9. Migrate super admin status from isSuperAdmin column
            result = safe_execute(
                session,
                """
                INSERT INTO user_roles (user_id, role, level, granted_at, is_active)
                SELECT 
                    id,
                    'super_admin',
                    99,
                    CURRENT_TIMESTAMP,
                    TRUE
                FROM users
                WHERE "isSuperAdmin" = TRUE
                AND id NOT IN (SELECT DISTINCT user_id FROM user_roles WHERE role = 'super_admin')
                """,
                "Migrate super admin roles from isSuperAdmin column"
            )
            
            # 10. Create trigger for updated_at timestamp
            safe_execute(
                session,
                """
                CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql'
                """,
                "Create updated_at trigger function"
            )
            
            safe_execute(
                session,
                """
                DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
                CREATE TRIGGER update_user_roles_updated_at
                    BEFORE UPDATE ON user_roles
                    FOR EACH ROW
                    EXECUTE FUNCTION update_user_roles_updated_at()
                """,
                "Create updated_at trigger"
            )
            
        logger.info("Safe database migration completed successfully!")
        
        # Verify migration
        verify_migration(db_manager)
        logger.info("Migration verification completed!")
        
        return True
        
    except Exception as e:
        logger.error(f"Safe migration failed: {e}")
        return False

def verify_migration(db_manager):
    """Verify that the migration was successful."""
    logger.info("Verifying migration...")
    
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

def main():
    """Main migration function."""
    print("=" * 60)
    print("Safe PostgreSQL Authentication Migration")
    print("=" * 60)
    
    try:
        # Check environment variables
        required_vars = ['DATABASE_URL', 'JWT_SECRET']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {missing_vars}")
            sys.exit(1)
        
        # Run migration
        success = run_safe_migration()
        
        if success:
            print("\n" + "=" * 60)
            print("✓ Safe migration completed successfully!")
            print("\nNext steps:")
            print("1. Update your Flask app to use PostgreSQL auth")
            print("2. Update frontend to use new auth endpoints")
            print("3. Test the authentication flows")
            print("=" * 60)
        else:
            print("\n✗ Safe migration failed")
            sys.exit(1)
        
    except KeyboardInterrupt:
        logger.info("Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        print(f"\n✗ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()