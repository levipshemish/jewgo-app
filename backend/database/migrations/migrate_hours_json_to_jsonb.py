#!/usr/bin/env python3
"""
Database migration script to convert hours_json field from Text to JSONB.

This migration:
1. Validates existing hours_json data
2. Converts the field type from Text to JSONB
3. Validates the conversion was successful
4. Provides rollback capability

Usage:
    python migrate_hours_json_to_jsonb.py
"""

import os
import sys
import json
import logging
from typing import List, Dict, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from database.connection_manager import DatabaseConnectionManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HoursJsonMigration:
    """Handles the migration of hours_json field from Text to JSONB."""
    
    def __init__(self, database_url: str):
        """Initialize the migration with database connection."""
        self.database_url = database_url
        self.engine = create_engine(database_url)
        self.connection_manager = DatabaseConnectionManager(database_url)
        
    def validate_existing_data(self) -> Dict[str, Any]:
        """Validate existing hours_json data before migration."""
        logger.info("Validating existing hours_json data...")
        
        validation_results = {
            'total_records': 0,
            'records_with_hours': 0,
            'valid_json_records': 0,
            'invalid_json_records': 0,
            'invalid_records': []
        }
        
        try:
            with self.engine.connect() as conn:
                # Get total count
                result = conn.execute(text("SELECT COUNT(*) FROM restaurants"))
                validation_results['total_records'] = result.scalar()
                
                # Get records with hours_json data
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM restaurants 
                    WHERE hours_json IS NOT NULL AND hours_json != ''
                """))
                validation_results['records_with_hours'] = result.scalar()
                
                # Validate JSON format for each record
                result = conn.execute(text("""
                    SELECT id, hours_json FROM restaurants 
                    WHERE hours_json IS NOT NULL AND hours_json != ''
                """))
                
                for row in result:
                    try:
                        json.loads(row.hours_json)
                        validation_results['valid_json_records'] += 1
                    except (json.JSONDecodeError, TypeError) as e:
                        validation_results['invalid_json_records'] += 1
                        validation_results['invalid_records'].append({
                            'id': row.id,
                            'error': str(e),
                            'data': row.hours_json[:100] + '...' if len(row.hours_json) > 100 else row.hours_json
                        })
                        
        except SQLAlchemyError as e:
            logger.error(f"Error validating existing data: {e}")
            raise
            
        logger.info(f"Validation results: {validation_results}")
        return validation_results
    
    def create_backup(self) -> str:
        """Create a backup of the hours_json column before migration."""
        logger.info("Creating backup of hours_json column...")
        
        backup_table = "restaurants_hours_json_backup"
        
        try:
            with self.engine.connect() as conn:
                # Create backup table
                conn.execute(text(f"""
                    CREATE TABLE IF NOT EXISTS {backup_table} AS
                    SELECT id, hours_json, created_at, updated_at
                    FROM restaurants
                    WHERE hours_json IS NOT NULL AND hours_json != ''
                """))
                conn.commit()
                
                # Get backup count
                result = conn.execute(text(f"SELECT COUNT(*) FROM {backup_table}"))
                backup_count = result.scalar()
                
                logger.info(f"Backup created: {backup_count} records backed up to {backup_table}")
                return backup_table
                
        except SQLAlchemyError as e:
            logger.error(f"Error creating backup: {e}")
            raise
    
    def migrate_to_jsonb(self) -> bool:
        """Perform the migration from Text to JSONB."""
        logger.info("Starting migration from Text to JSONB...")
        
        try:
            with self.engine.connect() as conn:
                # Start transaction
                trans = conn.begin()
                
                try:
                    # Step 1: Add new JSONB column
                    logger.info("Adding new hours_jsonb column...")
                    conn.execute(text("""
                        ALTER TABLE restaurants 
                        ADD COLUMN hours_jsonb JSONB
                    """))
                    
                    # Step 2: Copy and convert data from Text to JSONB
                    logger.info("Converting data from Text to JSONB...")
                    conn.execute(text("""
                        UPDATE restaurants 
                        SET hours_jsonb = hours_json::JSONB
                        WHERE hours_json IS NOT NULL AND hours_json != ''
                    """))
                    
                    # Step 3: Drop the old Text column
                    logger.info("Dropping old hours_json column...")
                    conn.execute(text("""
                        ALTER TABLE restaurants 
                        DROP COLUMN hours_json
                    """))
                    
                    # Step 4: Rename the new column to the original name
                    logger.info("Renaming hours_jsonb to hours_json...")
                    conn.execute(text("""
                        ALTER TABLE restaurants 
                        RENAME COLUMN hours_jsonb TO hours_json
                    """))
                    
                    # Commit transaction
                    trans.commit()
                    logger.info("Migration completed successfully!")
                    return True
                    
                except Exception as e:
                    trans.rollback()
                    logger.error(f"Migration failed, rolling back: {e}")
                    raise
                    
        except SQLAlchemyError as e:
            logger.error(f"Error during migration: {e}")
            raise
    
    def validate_migration(self) -> bool:
        """Validate that the migration was successful."""
        logger.info("Validating migration results...")
        
        try:
            with self.engine.connect() as conn:
                # Check if the column is now JSONB
                inspector = inspect(self.engine)
                columns = inspector.get_columns('restaurants')
                
                hours_json_column = None
                for column in columns:
                    if column['name'] == 'hours_json':
                        hours_json_column = column
                        break
                
                if not hours_json_column:
                    logger.error("hours_json column not found after migration")
                    return False
                
                # Check column type (PostgreSQL JSONB shows as 'jsonb')
                column_type = str(hours_json_column['type']).lower()
                if 'jsonb' not in column_type:
                    logger.error(f"Column type is not JSONB: {column_type}")
                    return False
                
                # Test JSONB operations
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM restaurants 
                    WHERE hours_json IS NOT NULL
                """))
                count_with_data = result.scalar()
                
                # Test JSONB query
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM restaurants 
                    WHERE hours_json->>'open_now' = 'true'
                """))
                count_open_now = result.scalar()
                
                logger.info(f"Migration validation successful:")
                logger.info(f"  - Column type: {column_type}")
                logger.info(f"  - Records with hours data: {count_with_data}")
                logger.info(f"  - Records with open_now=true: {count_open_now}")
                
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Error validating migration: {e}")
            return False
    
    def rollback_migration(self, backup_table: str) -> bool:
        """Rollback the migration using the backup table."""
        logger.info("Rolling back migration...")
        
        try:
            with self.engine.connect() as conn:
                trans = conn.begin()
                
                try:
                    # Drop the JSONB column
                    conn.execute(text("""
                        ALTER TABLE restaurants 
                        DROP COLUMN IF EXISTS hours_json
                    """))
                    
                    # Add back the Text column
                    conn.execute(text("""
                        ALTER TABLE restaurants 
                        ADD COLUMN hours_json TEXT
                    """))
                    
                    # Restore data from backup
                    conn.execute(text(f"""
                        UPDATE restaurants 
                        SET hours_json = backup.hours_json
                        FROM {backup_table} backup
                        WHERE restaurants.id = backup.id
                    """))
                    
                    trans.commit()
                    logger.info("Rollback completed successfully!")
                    return True
                    
                except Exception as e:
                    trans.rollback()
                    logger.error(f"Rollback failed: {e}")
                    raise
                    
        except SQLAlchemyError as e:
            logger.error(f"Error during rollback: {e}")
            return False
    
    def run_migration(self) -> bool:
        """Run the complete migration process."""
        logger.info("Starting hours_json to JSONB migration...")
        
        try:
            # Step 1: Validate existing data
            validation_results = self.validate_existing_data()
            
            if validation_results['invalid_json_records'] > 0:
                logger.warning(f"Found {validation_results['invalid_json_records']} invalid JSON records:")
                for invalid_record in validation_results['invalid_records']:
                    logger.warning(f"  - ID {invalid_record['id']}: {invalid_record['error']}")
                
                response = input("Continue with migration? (y/N): ")
                if response.lower() != 'y':
                    logger.info("Migration cancelled by user")
                    return False
            
            # Step 2: Create backup
            backup_table = self.create_backup()
            
            # Step 3: Perform migration
            if not self.migrate_to_jsonb():
                logger.error("Migration failed")
                return False
            
            # Step 4: Validate migration
            if not self.validate_migration():
                logger.error("Migration validation failed")
                return False
            
            logger.info("Migration completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False

def main():
    """Main function to run the migration."""
    # Database configuration
    database_url = os.getenv('DATABASE_URL', 'postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db')
    
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)
    
    logger.info(f"Connecting to database: {database_url.split('@')[1] if '@' in database_url else 'localhost'}")
    
    # Create migration instance
    migration = HoursJsonMigration(database_url)
    
    # Run migration
    success = migration.run_migration()
    
    if success:
        logger.info("✅ Migration completed successfully!")
        logger.info("Next steps:")
        logger.info("1. Update the SQLAlchemy model to use JSONB type")
        logger.info("2. Re-enable hours filtering functionality")
        logger.info("3. Test the hours filter")
        sys.exit(0)
    else:
        logger.error("❌ Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
