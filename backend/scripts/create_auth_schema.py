#!/usr/bin/env python3
"""
Create authentication database schema using individual SQL statements.

This script creates the missing authentication tables and ensures proper
structure for the PostgreSQL-based authentication system.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_auth_schema():
    """Create authentication schema in the database."""
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
        
        # Get database URL
        db_url = os.getenv('DATABASE_URL')
        if not db_url:
            print('❌ DATABASE_URL not configured')
            return False
            
        print('🔗 Connecting to PostgreSQL database...')
        
        # Connect to database
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print('🚀 Creating authentication tables...')
        
        # 1. Create auth_sessions table
        print('   Creating auth_sessions table...')
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                refresh_token_hash VARCHAR(255) NOT NULL,
                family_id VARCHAR(255) NOT NULL,
                rotated_from VARCHAR(255),
                user_agent TEXT,
                ip VARCHAR(45),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                revoked_at TIMESTAMP WITH TIME ZONE
            )
        """)
        
        # Add indexes for auth_sessions
        index_queries = [
            "CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_auth_sessions_family_id ON auth_sessions(family_id)",
            "CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_auth_sessions_revoked_at ON auth_sessions(revoked_at)"
        ]
        
        for query in index_queries:
            cursor.execute(query)
        
        # 2. Create auth_audit_log table
        print('   Creating auth_audit_log table...')
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_audit_log (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255),
                action VARCHAR(100) NOT NULL,
                ip_address VARCHAR(45),
                success BOOLEAN NOT NULL DEFAULT FALSE,
                details JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        
        # Add indexes for auth_audit_log
        audit_index_queries = [
            "CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_auth_audit_log_action ON auth_audit_log(action)",
            "CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_auth_audit_log_success ON auth_audit_log(success)",
            "CREATE INDEX IF NOT EXISTS idx_auth_audit_log_ip_address ON auth_audit_log(ip_address)"
        ]
        
        for query in audit_index_queries:
            cursor.execute(query)
        
        # 3. Add missing columns to users table
        print('   Enhancing users table...')
        
        user_column_updates = [
            ("password_hash", "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"),
            ("email_verified", "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE"),
            ("verification_token", "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)"),
            ("verification_expires", "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP WITH TIME ZONE"),
            ("reset_token", "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)"),
            ("reset_expires", "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP WITH TIME ZONE"),
            ("failed_login_attempts", "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0"),
            ("locked_until", "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE"),
            ("last_login", "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE"),
            ("is_guest", "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE")
        ]
        
        for col_name, query in user_column_updates:
            try:
                cursor.execute(query)
                print(f'   ✅ Added/verified {col_name} column')
            except psycopg2.Error as e:
                if 'already exists' not in str(e):
                    print(f'   ⚠️  Warning with {col_name}: {e}')
        
        # 4. Add missing columns to user_roles table  
        print('   Enhancing user_roles table...')
        
        role_column_updates = [
            ("level", "ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1"),
            ("granted_at", "ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("granted_by", "ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS granted_by VARCHAR(255)"),
            ("expires_at", "ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE"),
            ("is_active", "ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE")
        ]
        
        for col_name, query in role_column_updates:
            try:
                cursor.execute(query)
                print(f'   ✅ Added/verified {col_name} column')
            except psycopg2.Error as e:
                if 'already exists' not in str(e):
                    print(f'   ⚠️  Warning with {col_name}: {e}')
        
        # 5. Create additional indexes
        print('   Creating additional indexes...')
        
        additional_indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)",
            "CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest)",
            "CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)",
            "CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)",
            "CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role)",
            "CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON user_roles(expires_at)"
        ]
        
        for query in additional_indexes:
            cursor.execute(query)
        
        # 6. Add foreign key constraints (if they don't exist)
        print('   Adding foreign key constraints...')
        
        try:
            cursor.execute("""
                ALTER TABLE auth_sessions 
                ADD CONSTRAINT fk_auth_sessions_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            """)
            print('   ✅ Added auth_sessions foreign key')
        except psycopg2.Error as e:
            if 'already exists' not in str(e):
                print(f'   ⚠️  Auth sessions FK warning: {e}')
        
        try:
            cursor.execute("""
                ALTER TABLE auth_audit_log 
                ADD CONSTRAINT fk_auth_audit_log_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            """)
            print('   ✅ Added auth_audit_log foreign key')
        except psycopg2.Error as e:
            if 'already exists' not in str(e):
                print(f'   ⚠️  Audit log FK warning: {e}')
        
        # 7. Verify the results
        print('\n🔍 Verifying schema creation...')
        
        required_tables = ['users', 'user_roles', 'auth_sessions', 'auth_audit_log', 'accounts']
        
        for table in required_tables:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                )
            """, (table,))
            
            exists = cursor.fetchone()[0]
            
            if exists:
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = %s
                """, (table,))
                col_count = cursor.fetchone()[0]
                print(f'✅ {table:15} | {col_count:>2} columns')
            else:
                print(f'❌ {table:15} | MISSING')
        
        # Check users table columns specifically
        print('\n🔍 Verifying users table structure...')
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users'
            ORDER BY ordinal_position
        """)
        user_columns = [row[0] for row in cursor.fetchall()]
        
        required_user_cols = [
            'id', 'email', 'password_hash', 'email_verified', 
            'verification_token', 'reset_token', 'failed_login_attempts',
            'locked_until', 'last_login', 'is_guest'
        ]
        
        missing_cols = [col for col in required_user_cols if col not in user_columns]
        if missing_cols:
            print(f'⚠️  Missing user columns: {missing_cols}')
        else:
            print('✅ Users table has all required authentication columns')
        
        print(f'📋 Users table columns: {", ".join(user_columns)}')
        
        cursor.close()
        conn.close()
        
        print('\n🎉 Authentication schema creation completed successfully!')
        return True
        
    except ImportError:
        print('❌ psycopg2 not available - install with: pip install psycopg2-binary')
        return False
    except psycopg2.OperationalError as e:
        print(f'❌ Database connection failed: {e}')
        return False
    except Exception as e:
        print(f'❌ Unexpected error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print('🔐 Authentication Schema Creator')
    print('═' * 50)
    
    success = create_auth_schema()
    
    if success:
        print('\n📋 Schema setup completed! Next steps:')
        print('   1. ✅ Database schema is ready for authentication')
        print('   2. 🧪 Test authentication endpoints')
        print('   3. 📧 Set up email service integration')  
        print('   4. 🎨 Create frontend authentication UI')
        print('   5. 🔒 Configure production security settings')
    else:
        print('\n❌ Schema creation failed - check errors above')
    
    sys.exit(0 if success else 1)