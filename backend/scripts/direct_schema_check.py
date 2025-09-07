#!/usr/bin/env python3
"""
Direct database schema check using psycopg2.
This bypasses the application layer to directly check table existence.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_schema_direct():
    """Check database schema directly using psycopg2."""
    try:
        import psycopg2
        from psycopg2 import sql
        
        # Get database URL
        db_url = os.getenv('DATABASE_URL')
        if not db_url:
            print('❌ DATABASE_URL not configured')
            return False
            
        print('🔗 Connecting to PostgreSQL database...')
        
        # Connect to database
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Required auth tables
        required_tables = [
            'users',
            'user_roles', 
            'auth_sessions',
            'auth_audit_log',
            'accounts'
        ]
        
        print('🗄️  Database Schema Analysis')
        print('═' * 50)
        
        # Check if tables exist
        missing_tables = []
        existing_auth_tables = []
        
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
                existing_auth_tables.append(table)
                # Get row count
                cursor.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table)))
                count = cursor.fetchone()[0]
                
                # Get column count
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = %s
                """, (table,))
                col_count = cursor.fetchone()[0]
                
                print(f'✅ {table:15} | {count:>6} records | {col_count:>2} columns')
            else:
                missing_tables.append(table)
                print(f'❌ {table:15} | MISSING TABLE')
        
        # Check for additional useful information
        print('\n' + '═' * 50)
        print('🔍 Additional Database Info:')
        
        # Check database version
        cursor.execute('SELECT version();')
        db_version = cursor.fetchone()[0]
        print(f'   PostgreSQL Version: {db_version.split(",")[0]}')
        
        # Get total table count
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        total_tables = cursor.fetchone()[0]
        print(f'   Total tables in database: {total_tables}')
        
        print(f'\n📊 Summary:')
        print(f'   • Authentication tables: {len(existing_auth_tables)}/{len(required_tables)}')
        
        if missing_tables:
            print(f'\n⚠️  Missing Tables: {", ".join(missing_tables)}')
            print('\n🔧 Next Steps:')
            print('   1. Create missing authentication tables')
            print('   2. Run database migrations')
            print('   3. Set up proper foreign key relationships')
            
            # Check if any tables exist at all
            if len(existing_auth_tables) == 0:
                print('\n💡 It appears no authentication tables exist.')
                print('   You may need to run initial database setup/migrations.')
            else:
                print(f'\n💡 {len(existing_auth_tables)} tables exist, {len(missing_tables)} are missing.')
                print('   This suggests partial setup - check migration scripts.')
        else:
            print('\n🎉 All required authentication tables exist!')
            
            # Additional validation for existing tables
            print('\n🔍 Table Structure Validation:')
            
            # Check users table has required columns
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'users'
                ORDER BY ordinal_position
            """)
            user_columns = [row[0] for row in cursor.fetchall()]
            
            required_user_cols = ['id', 'email', 'password_hash', 'email_verified']
            missing_user_cols = [col for col in required_user_cols if col not in user_columns]
            
            if missing_user_cols:
                print(f'   ⚠️  users table missing columns: {missing_user_cols}')
                print(f'   📋 users table has: {user_columns}')
            else:
                print('   ✅ users table structure looks good')
                
        cursor.close()
        conn.close()
        
        return len(missing_tables) == 0
        
    except ImportError:
        print('❌ psycopg2 not available - install with: pip install psycopg2-binary')
        return False
    except psycopg2.OperationalError as e:
        print(f'❌ Database connection failed: {e}')
        print('   Check DATABASE_URL and ensure PostgreSQL is accessible')
        return False
    except Exception as e:
        print(f'❌ Unexpected error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print('🔐 Direct Database Schema Checker')
    print('═' * 50)
    
    success = check_schema_direct()
    sys.exit(0 if success else 1)