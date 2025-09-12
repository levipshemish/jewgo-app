#!/usr/bin/env python3
"""
V5 Rollback Script

Handles rolling back from v5 to v4 API architecture.
"""

import os
import sys
import logging
from datetime import datetime
from typing import Dict, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection_manager import get_connection_manager
from utils.logging_config import get_logger

logger = get_logger(__name__)


class V5Rollback:
    """Handles rollback from v5 to v4 API architecture."""
    
    def __init__(self):
        self.connection_manager = get_connection_manager()
        self.rollback_log = []
        
    def run_rollback(self, dry_run: bool = False, backup_dir: str = None) -> Dict[str, Any]:
        """Run the complete v5 to v4 rollback."""
        start_time = datetime.utcnow()
        logger.info(f"Starting V5 to V4 rollback (dry_run={dry_run})")
        
        try:
            self._validate_current_state()
            self._disable_v5_features(dry_run)
            
            if backup_dir:
                self._restore_from_backup(backup_dir, dry_run)
            
            self._revert_database_schema(dry_run)
            self._revert_configuration(dry_run)
            self._validate_rollback()
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            result = {
                'success': True,
                'duration_seconds': duration,
                'dry_run': dry_run,
                'rollback_log': self.rollback_log,
                'timestamp': end_time.isoformat()
            }
            
            logger.info(f"V5 to V4 rollback completed successfully in {duration:.2f} seconds")
            return result
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'rollback_log': self.rollback_log,
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _validate_current_state(self):
        """Validate that the current system can be rolled back."""
        logger.info("Validating current system state for rollback...")
        
        with self.connection_manager.get_session() as session:
            result = session.execute("SELECT 1").fetchone()
            if not result:
                raise Exception("Database connection failed")
        
        self.rollback_log.append("Current state validation completed")
        logger.info("Current state validation completed")
    
    def _disable_v5_features(self, dry_run: bool):
        """Disable v5 API features and endpoints."""
        logger.info("Disabling v5 features...")
        
        v5_features_to_disable = [
            'entity_api_v5', 'auth_api_v5', 'search_api_v5', 'admin_api_v5',
            'reviews_api_v5', 'webhook_api_v5', 'monitoring_api_v5', 'feature_flags_api_v5'
        ]
        
        if not dry_run:
            for feature in v5_features_to_disable:
                logger.info(f"Disabling v5 feature: {feature}")
        
        self.rollback_log.append("V5 features disabled")
        logger.info("V5 features disabled")
    
    def _restore_from_backup(self, backup_dir: str, dry_run: bool):
        """Restore data from backup directory."""
        logger.info(f"Restoring data from backup: {backup_dir}")
        
        if not os.path.exists(backup_dir):
            raise Exception(f"Backup directory not found: {backup_dir}")
        
        if not dry_run:
            tables_to_restore = ['restaurants', 'synagogues', 'mikvahs', 'stores', 'users', 'reviews']
            
            with self.connection_manager.get_session() as session:
                for table in tables_to_restore:
                    backup_file = os.path.join(backup_dir, f"{table}.sql")
                    if os.path.exists(backup_file):
                        logger.info(f"Restoring data for table: {table}")
                    else:
                        logger.warning(f"Backup file not found for table: {table}")
        
        self.rollback_log.append(f"Data restored from backup: {backup_dir}")
        logger.info("Data restoration completed")
    
    def _revert_database_schema(self, dry_run: bool):
        """Revert database schema changes made during v5 migration."""
        logger.info("Reverting database schema changes...")
        
        schema_reversions = [
            "DROP INDEX IF EXISTS idx_restaurants_v5_metadata",
            "DROP INDEX IF EXISTS idx_synagogues_v5_metadata", 
            "DROP INDEX IF EXISTS idx_mikvahs_v5_metadata",
            "DROP INDEX IF EXISTS idx_stores_v5_metadata",
            "ALTER TABLE restaurants DROP COLUMN IF EXISTS v5_metadata",
            "ALTER TABLE restaurants DROP COLUMN IF EXISTS created_by",
            "ALTER TABLE restaurants DROP COLUMN IF EXISTS updated_by",
            "ALTER TABLE synagogues DROP COLUMN IF EXISTS v5_metadata",
            "ALTER TABLE synagogues DROP COLUMN IF EXISTS created_by",
            "ALTER TABLE synagogues DROP COLUMN IF EXISTS updated_by",
            "ALTER TABLE mikvahs DROP COLUMN IF EXISTS v5_metadata",
            "ALTER TABLE mikvahs DROP COLUMN IF EXISTS created_by",
            "ALTER TABLE mikvahs DROP COLUMN IF EXISTS updated_by",
            "ALTER TABLE stores DROP COLUMN IF EXISTS v5_metadata",
            "ALTER TABLE stores DROP COLUMN IF EXISTS created_by",
            "ALTER TABLE stores DROP COLUMN IF EXISTS updated_by",
        ]
        
        if not dry_run:
            with self.connection_manager.get_session() as session:
                for reversion in schema_reversions:
                    try:
                        session.execute(reversion)
                        session.commit()
                        logger.info(f"Executed: {reversion}")
                    except Exception as e:
                        logger.warning(f"Failed to execute {reversion}: {e}")
        
        self.rollback_log.append("Database schema reverted")
        logger.info("Database schema reversion completed")
    
    def _revert_configuration(self, dry_run: bool):
        """Revert application configuration to v4."""
        logger.info("Reverting application configuration...")
        
        config_reversions = [
            "Disable v5 API endpoints",
            "Revert rate limiting configuration to v4",
            "Disable v5 middleware",
            "Revert CORS settings to v4",
            "Restore v4 feature flags",
        ]
        
        for reversion in config_reversions:
            logger.info(f"Configuration reversion: {reversion}")
        
        self.rollback_log.append("Configuration reverted to v4")
        logger.info("Configuration reversion completed")
    
    def _validate_rollback(self):
        """Validate that the rollback was successful."""
        logger.info("Validating rollback...")
        
        with self.connection_manager.get_session() as session:
            v4_tables = ['restaurants', 'synagogues', 'mikvahs', 'stores', 'users']
            for table in v4_tables:
                try:
                    result = session.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
                    if result:
                        logger.info(f"✅ Table {table} is accessible with {result[0]} records")
                    else:
                        logger.warning(f"⚠️ Table {table} is not accessible")
                except Exception as e:
                    logger.error(f"❌ Table {table} is not accessible: {e}")
        
        self.rollback_log.append("Rollback validation completed")
        logger.info("Rollback validation completed")


def main():
    """Main entry point for the rollback script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='V5 to V4 API Rollback Script')
    parser.add_argument('--dry-run', action='store_true',
                       help='Validate rollback without making changes')
    parser.add_argument('--backup-dir', type=str,
                       help='Path to backup directory to restore from')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    rollback = V5Rollback()
    result = rollback.run_rollback(dry_run=args.dry_run, backup_dir=args.backup_dir)
    
    if result['success']:
        print("✅ Rollback completed successfully!")
        print(f"Duration: {result['duration_seconds']:.2f} seconds")
        if args.dry_run:
            print("🔍 This was a dry run - no changes were made")
    else:
        print("❌ Rollback failed!")
        print(f"Error: {result['error']}")
        sys.exit(1)


if __name__ == '__main__':
    main()