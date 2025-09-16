#!/usr/bin/env python3
"""
Auth Sessions Security Hardening Migration Runner
This script safely applies the auth sessions security hardening migration
with proper error handling and rollback capabilities.

Requirements implemented: 2.1, 2.2, 2.3, 2.4, 2.5
"""

import sys
import logging
from datetime import datetime
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from database.connection_manager_v5 import DatabaseConnectionManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'auth_sessions_migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)

class AuthSessionsMigrationRunner:
    """Runner for the auth sessions security hardening migration."""
    
    def __init__(self):
        self.db_manager = DatabaseConnectionManager()
        self.migration_file = Path(__file__).parent / "20250914_auth_sessions_security_hardening.sql"
        
    def check_prerequisites(self):
        """Check if the migration can be safely applied."""
        logger.info("Checking migration prerequisites...")
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Check if auth_sessions table exists
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_name = 'auth_sessions'
                        )
                    """)
                    
                    if not cursor.fetchone()[0]:
                        raise Exception("auth_sessions table does not exist. Run consolidate_auth_schema.sql first.")
                    
                    # Check if required extensions are available
                    cursor.execute("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp')")
                    if not cursor.fetchone()[0]:
                        logger.warning("uuid-ossp extension not found. Attempting to create...")
                        cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
                    
                    # Check current table structure
                    cursor.execute("""
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns 
                        WHERE table_name = 'auth_sessions'
                        ORDER BY ordinal_position
                    """)
                    
                    existing_columns = {row[0]: {'type': row[1], 'nullable': row[2]} for row in cursor.fetchall()}
                    logger.info(f"Current auth_sessions columns: {list(existing_columns.keys())}")
                    
                    # Check for existing data
                    cursor.execute("SELECT COUNT(*) FROM auth_sessions")
                    session_count = cursor.fetchone()[0]
                    logger.info(f"Found {session_count} existing sessions")
                    
                    return True
                    
        except Exception as e:
            logger.error(f"Prerequisites check failed: {e}")
            return False
    
    def backup_table(self):
        """Create a backup of the auth_sessions table before migration."""
        logger.info("Creating backup of auth_sessions table...")
        
        backup_table_name = f"auth_sessions_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Create backup table
                    cursor.execute(f"""
                        CREATE TABLE {backup_table_name} AS 
                        SELECT * FROM auth_sessions
                    """)
                    
                    # Get backup row count
                    cursor.execute(f"SELECT COUNT(*) FROM {backup_table_name}")
                    backup_count = cursor.fetchone()[0]
                    
                    logger.info(f"Backup created: {backup_table_name} with {backup_count} rows")
                    return backup_table_name
                    
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            raise
    
    def apply_migration(self):
        """Apply the migration SQL file."""
        logger.info("Applying auth sessions security hardening migration...")
        
        if not self.migration_file.exists():
            raise FileNotFoundError(f"Migration file not found: {self.migration_file}")
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Read and execute the migration SQL
                    with open(self.migration_file, 'r') as f:
                        migration_sql = f.read()
                    
                    cursor.execute(migration_sql)
                    
                    logger.info("Migration SQL executed successfully")
                    
        except Exception as e:
            logger.error(f"Migration application failed: {e}")
            raise
    
    def verify_migration(self):
        """Verify that the migration was applied correctly."""
        logger.info("Verifying migration results...")
        
        expected_columns = [
            'current_jti', 'reused_jti_of', 'device_hash', 
            'last_ip_cidr', 'auth_time', 'family_id', 'revoked_at'
        ]
        
        expected_indexes = [
            'idx_auth_sessions_current_jti',
            'idx_auth_sessions_device_hash',
            'idx_auth_sessions_last_ip_cidr',
            'idx_auth_sessions_auth_time',
            'idx_auth_sessions_reused_jti_of',
            'idx_auth_sessions_family_active',
            'idx_auth_sessions_unique_active_jti'
        ]
        
        expected_functions = [
            'revoke_session_family',
            'handle_token_replay',
            'rotate_session_token',
            'cleanup_expired_sessions'
        ]
        
        expected_views = [
            'active_sessions',
            'session_families'
        ]
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Check columns
                    cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'auth_sessions'
                    """)
                    actual_columns = [row[0] for row in cursor.fetchall()]
                    
                    missing_columns = [col for col in expected_columns if col not in actual_columns]
                    if missing_columns:
                        raise Exception(f"Missing columns: {missing_columns}")
                    
                    logger.info("✓ All required columns present")
                    
                    # Check indexes
                    cursor.execute("""
                        SELECT indexname 
                        FROM pg_indexes 
                        WHERE tablename = 'auth_sessions'
                    """)
                    actual_indexes = [row[0] for row in cursor.fetchall()]
                    
                    missing_indexes = [idx for idx in expected_indexes if idx not in actual_indexes]
                    if missing_indexes:
                        logger.warning(f"Missing indexes: {missing_indexes}")
                    else:
                        logger.info("✓ All required indexes present")
                    
                    # Check functions
                    cursor.execute("""
                        SELECT routine_name 
                        FROM information_schema.routines 
                        WHERE routine_type = 'FUNCTION' 
                        AND routine_schema = 'public'
                    """)
                    actual_functions = [row[0] for row in cursor.fetchall()]
                    
                    missing_functions = [func for func in expected_functions if func not in actual_functions]
                    if missing_functions:
                        logger.warning(f"Missing functions: {missing_functions}")
                    else:
                        logger.info("✓ All required functions present")
                    
                    # Check views
                    cursor.execute("""
                        SELECT table_name 
                        FROM information_schema.views 
                        WHERE table_schema = 'public'
                    """)
                    actual_views = [row[0] for row in cursor.fetchall()]
                    
                    missing_views = [view for view in expected_views if view not in actual_views]
                    if missing_views:
                        logger.warning(f"Missing views: {missing_views}")
                    else:
                        logger.info("✓ All required views present")
                    
                    # Check data integrity
                    cursor.execute("""
                        SELECT 
                            COUNT(*) as total_sessions,
                            COUNT(*) FILTER (WHERE family_id IS NOT NULL) as sessions_with_family,
                            COUNT(*) FILTER (WHERE auth_time IS NOT NULL) as sessions_with_auth_time,
                            COUNT(*) FILTER (WHERE current_jti IS NOT NULL) as sessions_with_jti
                        FROM auth_sessions
                    """)
                    
                    stats = cursor.fetchone()
                    logger.info("Data integrity check:")
                    logger.info(f"  Total sessions: {stats[0]}")
                    logger.info(f"  Sessions with family_id: {stats[1]}")
                    logger.info(f"  Sessions with auth_time: {stats[2]}")
                    logger.info(f"  Sessions with current_jti: {stats[3]}")
                    
                    if stats[0] > 0 and stats[1] != stats[0]:
                        raise Exception("Not all sessions have family_id")
                    
                    if stats[0] > 0 and stats[2] != stats[0]:
                        raise Exception("Not all sessions have auth_time")
                    
                    logger.info("✓ Data integrity verified")
                    
                    return True
                    
        except Exception as e:
            logger.error(f"Migration verification failed: {e}")
            return False
    
    def run_migration(self, create_backup=True):
        """Run the complete migration process."""
        logger.info("Starting auth sessions security hardening migration...")
        
        try:
            # Step 1: Check prerequisites
            if not self.check_prerequisites():
                logger.error("Prerequisites check failed. Aborting migration.")
                return False
            
            # Step 2: Create backup
            backup_table = None
            if create_backup:
                backup_table = self.backup_table()
            
            # Step 3: Apply migration
            self.apply_migration()
            
            # Step 4: Verify migration
            if not self.verify_migration():
                logger.error("Migration verification failed.")
                if backup_table:
                    logger.info(f"Backup table available for rollback: {backup_table}")
                return False
            
            logger.info("✅ Auth sessions security hardening migration completed successfully!")
            logger.info("Requirements implemented: 2.1, 2.2, 2.3, 2.4, 2.5")
            
            if backup_table:
                logger.info(f"Backup table created: {backup_table}")
                logger.info("You can drop the backup table after verifying the migration works correctly.")
            
            return True
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            logger.error("Check the logs for details and consider rolling back if necessary.")
            return False

def main():
    """Main entry point for the migration script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Run auth sessions security hardening migration')
    parser.add_argument('--no-backup', action='store_true', help='Skip creating backup table')
    parser.add_argument('--verify-only', action='store_true', help='Only verify migration, do not apply')
    
    args = parser.parse_args()
    
    runner = AuthSessionsMigrationRunner()
    
    if args.verify_only:
        logger.info("Running verification only...")
        success = runner.verify_migration()
    else:
        success = runner.run_migration(create_backup=not args.no_backup)
    
    if success:
        logger.info("Migration completed successfully!")
        sys.exit(0)
    else:
        logger.error("Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()