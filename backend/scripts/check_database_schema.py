#!/usr/bin/env python3
"""
Database schema validation script for authentication system.

This script checks that all required database tables exist and reports
on their structure and contents.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def check_database_schema():
    """Check database schema for authentication tables."""
    try:
        from app_factory import create_app
        
        # Create Flask app to get database context
        app = create_app()
        
        with app.app_context():
            from utils.app_factory_postgres_auth import get_db_manager
            from sqlalchemy import text, inspect
            
            # Get database connection
            db_manager = get_db_manager()
            
            with db_manager.connection_manager.session_scope() as session:
                # Get inspector to check table existence
                inspector = inspect(session.bind)
                existing_tables = inspector.get_table_names()
                
                # Required auth tables
                required_tables = [
                    'users',
                    'user_roles', 
                    'auth_sessions',
                    'auth_audit_log',
                    'accounts'
                ]
                
                print('🗄️ Database Schema Analysis')
                print('═' * 50)
                
                missing_tables = []
                existing_auth_tables = []
                
                for table in required_tables:
                    if table in existing_tables:
                        existing_auth_tables.append(table)
                        # Get row count and basic info
                        try:
                            count_result = session.execute(text(f'SELECT COUNT(*) FROM {table}'))
                            count = count_result.scalar()
                            
                            # Get column info
                            columns = inspector.get_columns(table)
                            col_count = len(columns)
                            
                            print(f'✅ {table:15} | {count:>6} records | {col_count:>2} columns')
                        except Exception as e:
                            print(f'✅ {table:15} | exists but error reading: {str(e)[:30]}...')
                    else:
                        missing_tables.append(table)
                        print(f'❌ {table:15} | MISSING TABLE')
                
                print('\n' + '═' * 50)
                print(f'📊 Summary:')
                print(f'   • Authentication tables: {len(existing_auth_tables)}/{len(required_tables)}')
                print(f'   • Total database tables: {len(existing_tables)}')
                
                if missing_tables:
                    print(f'\n⚠️  Missing Tables: {", ".join(missing_tables)}')
                    print('\n🔧 Required Actions:')
                    print('   1. Run database migrations to create missing tables')
                    print('   2. Ensure proper foreign key relationships')
                    print('   3. Verify table permissions for application user')
                    return False
                else:
                    print('\n🎉 All required authentication tables exist!')
                    
                    # Additional checks for table structure
                    print('\n🔍 Table Structure Validation:')
                    
                    # Check users table structure
                    try:
                        user_columns = [col['name'] for col in inspector.get_columns('users')]
                        required_user_cols = ['id', 'email', 'password_hash', 'email_verified']
                        missing_cols = [col for col in required_user_cols if col not in user_columns]
                        
                        if missing_cols:
                            print(f'   ⚠️  users table missing columns: {missing_cols}')
                        else:
                            print('   ✅ users table structure looks good')
                    except Exception as e:
                        print(f'   ❌ Error checking users table: {e}')
                    
                    return True
                    
    except ImportError as e:
        print(f'❌ Import error - missing dependencies: {e}')
        print('   Run: pip install -r requirements.txt')
        return False
    except Exception as e:
        print(f'❌ Database connection error: {e}')
        print('   Check DATABASE_URL in .env file')
        print('   Ensure PostgreSQL is running and accessible')
        return False

if __name__ == '__main__':
    print('🔐 Authentication Database Schema Checker')
    print('═' * 50)
    
    success = check_database_schema()
    sys.exit(0 if success else 1)