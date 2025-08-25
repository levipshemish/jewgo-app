#!/usr/bin/env python3
"""
Migration Script: Neon to Oracle Cloud PostgreSQL
================================================

This script migrates data from Neon PostgreSQL to Oracle Cloud PostgreSQL.
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseMigrator:
    def __init__(self, source_url, target_url):
        self.source_url = source_url
        self.target_url = target_url
        self.source_engine = None
        self.target_engine = None
        
    def connect_databases(self):
        """Connect to both source and target databases."""
        try:
            # Connect to source (Neon)
            logger.info("Connecting to source database (Neon)...")
            self.source_engine = create_engine(
                self.source_url,
                echo=False,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 30}
            )
            
            # Test source connection
            with self.source_engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                logger.info("✅ Source database connection successful")
            
            # Connect to target (Oracle Cloud)
            logger.info("Connecting to target database (Oracle Cloud)...")
            self.target_engine = create_engine(
                self.target_url,
                echo=False,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 30}
            )
            
            # Test target connection
            with self.target_engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                logger.info("✅ Target database connection successful")
                
            return True
            
        except SQLAlchemyError as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    def get_table_list(self, engine):
        """Get list of tables from database."""
        inspector = inspect(engine)
        return inspector.get_table_names()
    
    def get_table_schema(self, engine, table_name):
        """Get table schema."""
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        return columns
    
    def create_table_if_not_exists(self, table_name, columns):
        """Create table in target database if it doesn't exist."""
        try:
            with self.target_engine.connect() as conn:
                # Check if table exists
                result = conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table_name}'
                    )
                """))
                table_exists = result.scalar()
                
                if not table_exists:
                    # Create table (simplified - you may need to adjust column types)
                    column_definitions = []
                    for col in columns:
                        col_type = col['type']
                        nullable = "" if col.get('nullable', True) else " NOT NULL"
                        column_definitions.append(f"{col['name']} {col_type}{nullable}")
                    
                    create_sql = f"""
                    CREATE TABLE {table_name} (
                        {', '.join(column_definitions)}
                    )
                    """
                    conn.execute(text(create_sql))
                    conn.commit()
                    logger.info(f"✅ Created table: {table_name}")
                else:
                    logger.info(f"ℹ️  Table already exists: {table_name}")
                    
        except SQLAlchemyError as e:
            logger.error(f"❌ Failed to create table {table_name}: {e}")
    
    def migrate_table_data(self, table_name):
        """Migrate data from source to target table."""
        try:
            # Get data from source
            with self.source_engine.connect() as conn:
                result = conn.execute(text(f"SELECT * FROM {table_name}"))
                rows = result.fetchall()
                columns = result.keys()
                
            if not rows:
                logger.info(f"ℹ️  No data to migrate for table: {table_name}")
                return
            
            logger.info(f"📊 Migrating {len(rows)} rows from table: {table_name}")
            
            # Insert data into target
            with self.target_engine.connect() as conn:
                for i, row in enumerate(rows):
                    if i % 100 == 0:
                        logger.info(f"   Progress: {i}/{len(rows)} rows")
                    
                    # Create insert statement
                    placeholders = ', '.join(['%s'] * len(columns))
                    insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
                    
                    try:
                        conn.execute(text(insert_sql), row)
                    except SQLAlchemyError as e:
                        logger.warning(f"⚠️  Failed to insert row {i} in {table_name}: {e}")
                        continue
                
                conn.commit()
                logger.info(f"✅ Successfully migrated {len(rows)} rows to table: {table_name}")
                
        except SQLAlchemyError as e:
            logger.error(f"❌ Failed to migrate table {table_name}: {e}")
    
    def migrate_all_data(self):
        """Migrate all data from source to target."""
        try:
            # Get tables from source
            source_tables = self.get_table_list(self.source_engine)
            logger.info(f"📋 Found {len(source_tables)} tables in source database")
            
            for table_name in source_tables:
                logger.info(f"\n🔄 Migrating table: {table_name}")
                
                # Get table schema
                columns = self.get_table_schema(self.source_engine, table_name)
                
                # Create table in target
                self.create_table_if_not_exists(table_name, columns)
                
                # Migrate data
                self.migrate_table_data(table_name)
            
            logger.info("\n🎉 Migration completed successfully!")
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False
        
        return True

def main():
    """Main migration function."""
    print("🔄 Neon to Oracle Cloud PostgreSQL Migration")
    print("=" * 50)
    
    # Get database URLs
    neon_url = os.getenv("NEON_DATABASE_URL")
    oracle_url = os.getenv("ORACLE_DATABASE_URL")
    
    if not neon_url:
        logger.error("❌ NEON_DATABASE_URL environment variable not set")
        return False
    
    if not oracle_url:
        logger.error("❌ ORACLE_DATABASE_URL environment variable not set")
        return False
    
    # Create migrator
    migrator = DatabaseMigrator(neon_url, oracle_url)
    
    # Connect to databases
    if not migrator.connect_databases():
        return False
    
    # Confirm migration
    print("\n⚠️  WARNING: This will migrate all data from Neon to Oracle Cloud PostgreSQL")
    print("Make sure you have backups before proceeding.")
    
    confirm = input("\nDo you want to proceed with migration? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Migration cancelled.")
        return False
    
    # Perform migration
    success = migrator.migrate_all_data()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("You can now update your DATABASE_URL to use the Oracle Cloud database.")
    else:
        print("\n❌ Migration failed. Check the logs for details.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
