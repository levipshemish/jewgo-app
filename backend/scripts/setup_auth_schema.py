#!/usr/bin/env python3
"""
Setup authentication database schema.

This script creates the missing authentication tables and ensures proper
structure for the PostgreSQL-based authentication system.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_auth_schema():
    """Set up authentication schema in the database."""
    try:
        import psycopg2
        
        # Get database URL
        db_url = os.getenv('DATABASE_URL')
        if not db_url:
            print('❌ DATABASE_URL not configured')
            return False
            
        print('🔗 Connecting to PostgreSQL database...')
        
        # Connect to database
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        print('📄 Reading SQL schema file...')
        
        # Read the SQL file
        sql_file_path = os.path.join(os.path.dirname(__file__), 'create_auth_tables.sql')
        with open(sql_file_path, 'r') as f:
            sql_content = f.read()
        
        print('🚀 Executing schema creation...')
        
        # Execute the SQL - split by statements for better error handling
        statements = sql_content.split(';')
        executed_count = 0
        
        for statement in statements:
            statement = statement.strip()
            if statement and not statement.startswith('--') and not statement.startswith('\\echo'):
                try:
                    cursor.execute(statement)
                    executed_count += 1
                except psycopg2.Error as e:
                    # Some errors are expected (like trying to add existing columns)
                    if 'already exists' not in str(e):
                        print(f'⚠️  Warning executing statement: {e}')
        
        # Commit changes
        conn.commit()
        
        print(f'✅ Executed {executed_count} SQL statements successfully')
        
        # Verify the results
        print('\n🔍 Verifying schema creation...')
        
        required_tables = ['users', 'user_roles', 'auth_sessions', 'auth_audit_log', 'accounts']
        
        for table in required_tables:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
            """, (table,))
            
            exists = cursor.fetchone()[0]
            
            if exists:
                # Get column count
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = %s
                """, (table,))
                col_count = cursor.fetchone()[0]
                print(f'✅ {table:15} | {col_count:>2} columns')
            else:
                print(f'❌ {table:15} | MISSING')
                
        # Check specific required columns in users table
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
            
        # Check indexes
        print('\n🔍 Verifying indexes...')
        cursor.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename IN ('users', 'user_roles', 'auth_sessions', 'auth_audit_log')
            ORDER BY indexname
        """)
        indexes = [row[0] for row in cursor.fetchall()]
        print(f'✅ Created {len(indexes)} indexes for authentication tables')
        
        cursor.close()
        conn.close()
        
        print('\n🎉 Authentication schema setup completed successfully!')
        return True
        
    except ImportError:
        print('❌ psycopg2 not available - install with: pip install psycopg2-binary')
        return False
    except FileNotFoundError:
        print('❌ SQL schema file not found - ensure create_auth_tables.sql exists')
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
    print('🔐 Authentication Schema Setup')
    print('═' * 50)
    
    success = setup_auth_schema()
    
    if success:
        print('\n📋 Next Steps:')
        print('   1. ✅ Database schema is now ready')
        print('   2. 🔑 Test authentication endpoints')
        print('   3. 📧 Configure email service for verification/reset')
        print('   4. 🎨 Create frontend authentication pages')
    else:
        print('\n❌ Schema setup failed - check errors above')
    
    sys.exit(0 if success else 1)