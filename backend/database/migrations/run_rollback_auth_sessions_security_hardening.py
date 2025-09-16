#!/usr/bin/env python3
"""
Auth Sessions Security Hardening Migration Rollback Runner
This script safely rolls back the auth sessions security hardening migration
with proper error handling and verification.

WARNING: This will remove security features and may result in data loss.
Only use this if you need to revert the migration due to critical issues.
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
        logging.FileHandler(f'auth_sessions_rollback_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)

class AuthSessionsRollbackRunner:
    """Runner for rolling back the auth sessions security hardening migration."""
    
    def __init__(self):
        self.db_manager = DatabaseConnectionManager()
        self.rollback_file = Path(__file__).parent / "rollback_auth_sessions_security_hardening.sql"
        
    def check_rollback_prerequisites(self):
        """Check if the rollback can be safely applied."""
        logger.info("Checking rollback prerequisites...")
        
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
                        raise Exception("auth_sessions table does not exist. Nothing to rollback.")
                    
                    # Check if the migration columns exist
                    migration_columns = ['current_jti', 'reused_jti_of', 'device_hash', 'last_ip_cidr', 'auth_time']
                    
                    cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'auth_sessions'
                        AND column_name = ANY(%s)
                    """, (migration_columns,))
                    
                    existing_migration_columns = [row[0] for row in cursor.fetchall()]
                    
                    if not existing_migration_columns:
                        logger.warning("No migration columns found. Migration may not have been applied.")
                        return False
                    
                    logger.info(f"Found migration columns to rollback: {existing_migration_columns}")
                    
                    # Check for data that would be lost
                    for column in existing_migration_columns:
                        cursor.execute(f"""
                            SELECT COUNT(*) FROM auth_sessions 
                            WHERE {column} IS NOT NULL
                        """)
                        count = cursor.fetchone()[0]
                        if count > 0:
                            logger.warning(f"Column {column} has {count} non-null values that will be lost")
                    
                    # Check current session count
                    cursor.execute("SELECT COUNT(*) FROM auth_sessions")
                    session_count = cursor.fetchone()[0]
                    logger.info(f"Found {session_count} sessions in table")
                    
                    return True
                    
        except Exception as e:
            logger.error(f"Prerequisites check failed: {e}")
            return False
    
    def backup_current_state(self):
        """Create a backup of the current auth_sessions table before rollback."""
        logger.info("Creating backup of current auth_sessions state...")
        
        backup_table_name = f"auth_sessions_pre_rollback_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
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
                    
                    logger.info(f"Pre-rollback backup created: {backup_table_name} with {backup_count} rows")
                    return backup_table_name
                    
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            raise
    
    def apply_rollback(self):
        """Apply the rollback SQL file."""
        logger.info("Applying auth sessions security hardening rollback...")
        
        if not self.rollback_file.exists():
            raise FileNotFoundError(f"Rollback file not found: {self.rollback_file}")
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Read and execute the rollback SQL
                    with open(self.rollback_file, 'r') as f:
                        rollback_sql = f.read()
                    
                    cursor.execute(rollback_sql)
                    
                    logger.info("Rollback SQL executed successfully")
                    
        except Exception as e:
            logger.error(f"Rollback application failed: {e}")
            raise
    
    def verify_rollback(self):
        """Verify that the rollback was applied correctly."""
        logger.info("Verifying rollback results...")
        
        columns_to_remove = [
            'current_jti', 'reused_jti_of', 'device_hash', 
            'last_ip_cidr', 'auth_time'
        ]
        
        indexes_to_remove = [
            'idx_auth_sessions_current_jti',
            'idx_auth_sessions_device_hash',
            'idx_auth_sessions_last_ip_cidr',
            'idx_auth_sessions_auth_time',
            'idx_auth_sessions_reused_jti_of',
            'idx_auth_sessions_family_active',
            'idx_auth_sessions_unique_active_jti'
        ]
        
        functions_to_remove = [
            'revoke_session_family',
            'handle_token_replay',
            'rotate_session_token',
            'cleanup_expired_sessions'
        ]
        
        views_to_remove = [
            'active_sessions',
            'session_families'
        ]
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Check that columns were removed
                    cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'auth_sessions'
                        AND column_name = ANY(%s)
                    """, (columns_to_remove,))
                    
                    remaining_columns = [row[0] for row in cursor.fetchall()]
                    if remaining_columns:
                        raise Exception(f"Columns not removed: {remaining_columns}")
                    
                    logger.info("✓ All target columns removed")
                    
                    # Check that indexes were removed
                    cursor.execute("""
                        SELECT indexname 
                        FROM pg_indexes 
                        WHERE tablename = 'auth_sessions'
                        AND indexname = ANY(%s)
                    """, (indexes_to_remove,))
                    
                    remaining_indexes = [row[0] for row in cursor.fetchall()]
                    if remaining_indexes:
                        logger.warning(f"Indexes not removed: {remaining_indexes}")
                    else:
                        logger.info("✓ All target indexes removed")
                    
                    # Check that functions were removed
                    cursor.execute("""
                        SELECT routine_name 
                        FROM information_schema.routines 
                        WHERE routine_type = 'FUNCTION' 
                        AND routine_schema = 'public'
                        AND routine_name = ANY(%s)
                    """, (functions_to_remove,))
                    
                    remaining_functions = [row[0] for row in cursor.fetchall()]
                    if remaining_functions:
                        logger.warning(f"Functions not removed: {remaining_functions}")
                    else:
                        logger.info("✓ All target functions removed")
                    
                    # Check that views were removed
                    cursor.execute("""
                        SELECT table_name 
                        FROM information_schema.views 
                        WHERE table_schema = 'public'
                        AND table_name = ANY(%s)
                    """, (views_to_remove,))
                    
                    remaining_views = [row[0] for row in cursor.fetchall()]
                    if remaining_views:
                        logger.warning(f"Views not removed: {remaining_views}")
                    else:
                        logger.info("✓ All target views removed")
                    
                    # Check table still exists and has data
                    cursor.execute("SELECT COUNT(*) FROM auth_sessions")
                    session_count = cursor.fetchone()[0]
                    logger.info(f"auth_sessions table still has {session_count} sessions")
                    
                    # Check remaining columns
                    cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'auth_sessions'
                        ORDER BY ordinal_position
                    """)
                    
                    remaining_columns = [row[0] for row in cursor.fetchall()]
                    logger.info(f"Remaining columns: {remaining_columns}")
                    
                    logger.info("✓ Rollback verification completed")
                    
                    return True
                    
        except Exception as e:
            logger.error(f"Rollback verification failed: {e}")
            return False
    
    def run_rollback(self, create_backup=True, force=False):
        """Run the complete rollback process."""
        logger.info("Starting auth sessions security hardening rollback...")
        
        if not force:
            logger.warning("⚠️  WARNING: This rollback will remove security features and may cause data loss!")
            logger.warning("⚠️  Make sure you understand the implications before proceeding.")
            
            response = input("Are you sure you want to proceed with the rollback? (yes/no): ")
            if response.lower() != 'yes':
                logger.info("Rollback cancelled by user.")
                return False
        
        try:
            # Step 1: Check prerequisites
            if not self.check_rollback_prerequisites():
                logger.error("Prerequisites check failed. Aborting rollback.")
                return False
            
            # Step 2: Create backup
            backup_table = None
            if create_backup:
                backup_table = self.backup_current_state()
            
            # Step 3: Apply rollback
            self.apply_rollback()
            
            # Step 4: Verify rollback
            if not self.verify_rollback():
                logger.error("Rollback verification failed.")
                if backup_table:
                    logger.info(f"Pre-rollback backup available: {backup_table}")
                return False
            
            logger.info("✅ Auth sessions security hardening rollback completed successfully!")
            logger.warning("⚠️  Security features have been removed from the auth_sessions table.")
            logger.warning("⚠️  Update your application code to work without these features.")
            
            if backup_table:
                logger.info(f"Pre-rollback backup created: {backup_table}")
                logger.info("You can restore from this backup if needed.")
            
            return True
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            logger.error("Check the logs for details and consider manual intervention.")
            return False

def main():
    """Main entry point for the rollback script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Rollback auth sessions security hardening migration')
    parser.add_argument('--no-backup', action='store_true', help='Skip creating backup table')
    parser.add_argument('--force', action='store_true', help='Skip confirmation prompt')
    parser.add_argument('--verify-only', action='store_true', help='Only verify rollback, do not apply')
    
    args = parser.parse_args()
    
    runner = AuthSessionsRollbackRunner()
    
    if args.verify_only:
        logger.info("Running verification only...")
        success = runner.verify_rollback()
    else:
        success = runner.run_rollback(
            create_backup=not args.no_backup,
            force=args.force
        )
    
    if success:
        logger.info("Rollback completed successfully!")
        sys.exit(0)
    else:
        logger.error("Rollback failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()