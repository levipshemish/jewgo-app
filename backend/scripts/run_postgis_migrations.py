#!/usr/bin/env python3
"""
PostGIS Migration Runner for JewGo Production Database
====================================================
This script runs the PostGIS migrations to enable efficient spatial queries.
It includes:
1. PostGIS and pg_trgm extensions
2. Geometry columns for spatial data
3. Spatial indexes for KNN queries
4. Trigram indexes for text search

Author: JewGo Development Team
Version: 1.0
Date: 2025-01-15
"""
import os
import sys
from typing import Optional, Dict, Any
from sqlalchemy import create_engine, text

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.logging_config import get_logger

logger = get_logger(__name__)


class PostGISMigrationRunner:
    """PostGIS migration runner for production database."""
    
    def __init__(self, database_url: Optional[str] = None):
        """Initialize the migration runner."""
        self.database_url = database_url or os.getenv("DATABASE_URL")
        self.engine = None
        
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Fix database URL format if needed
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://")
            logger.info("Fixed database URL format from postgres:// to postgresql://")
    
    def connect(self) -> bool:
        """Connect to the database."""
        try:
            logger.info("🔗 Connecting to production database...")
            self.engine = create_engine(
                self.database_url,
                pool_pre_ping=True,
                pool_recycle=300,
                connect_args={
                    "sslmode": "prefer",
                    "application_name": "postgis_migration"
                }
            )
            
            # Test connection
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
            
            logger.info("✅ Database connection established successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    def check_postgis_status(self) -> Dict[str, Any]:
        """Check current PostGIS and extension status."""
        try:
            with self.engine.connect() as conn:
                # Check PostGIS extension
                postgis_result = conn.execute(text("""
                    SELECT EXISTS(
                        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
                    ) as postgis_enabled
                """)).fetchone()
                
                # Check pg_trgm extension
                trigram_result = conn.execute(text("""
                    SELECT EXISTS(
                        SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
                    ) as trigram_enabled
                """)).fetchone()
                
                # Check geometry columns
                geom_columns = conn.execute(text("""
                    SELECT 
                        table_name,
                        column_name,
                        data_type
                    FROM information_schema.columns 
                    WHERE column_name = 'geom' 
                    AND table_schema = 'public'
                    ORDER BY table_name
                """)).fetchall()
                
                # Check spatial indexes
                spatial_indexes = conn.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        indexname,
                        indexdef
                    FROM pg_indexes 
                    WHERE indexdef LIKE '%GIST%' 
                    AND schemaname = 'public'
                    ORDER BY tablename, indexname
                """)).fetchall()
                
                return {
                    "postgis_enabled": postgis_result[0] if postgis_result else False,
                    "trigram_enabled": trigram_result[0] if trigram_result else False,
                    "geometry_columns": [dict(row._mapping) for row in geom_columns],
                    "spatial_indexes": [dict(row._mapping) for row in spatial_indexes]
                }
                
        except Exception as e:
            logger.error(f"Error checking PostGIS status: {e}")
            return {}
    
    def run_postgis_extensions(self) -> bool:
        """Enable PostGIS and pg_trgm extensions."""
        try:
            logger.info("🔧 Enabling PostGIS and pg_trgm extensions...")
            
            with self.engine.connect() as conn:
                # Enable PostGIS extension
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
                conn.commit()
                logger.info("✅ PostGIS extension enabled")
                
                # Enable pg_trgm extension
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                conn.commit()
                logger.info("✅ pg_trgm extension enabled")
                
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to enable extensions: {e}")
            return False
    
    def run_geometry_migration(self) -> bool:
        """Run the geometry column migration."""
        try:
            logger.info("🔧 Running geometry column migration...")
            
            # Read the migration file
            migration_file = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "database", "migrations", "add_postgis_geometry_column.sql"
            )
            
            if not os.path.exists(migration_file):
                logger.error(f"Migration file not found: {migration_file}")
                return False
            
            with open(migration_file, 'r') as f:
                migration_sql = f.read()
            
            with self.engine.connect() as conn:
                # Execute the migration
                conn.execute(text(migration_sql))
                conn.commit()
                logger.info("✅ Geometry column migration completed")
                
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to run geometry migration: {e}")
            return False
    
    def run_postgis_indexes(self) -> bool:
        """Run the PostGIS indexes migration."""
        try:
            logger.info("🔧 Running PostGIS indexes migration...")
            
            # Read the indexes file
            indexes_file = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "database", "postgis_indexes.sql"
            )
            
            if not os.path.exists(indexes_file):
                logger.error(f"Indexes file not found: {indexes_file}")
                return False
            
            with open(indexes_file, 'r') as f:
                indexes_sql = f.read()
            
            with self.engine.connect() as conn:
                # Execute the indexes
                conn.execute(text(indexes_sql))
                conn.commit()
                logger.info("✅ PostGIS indexes migration completed")
                
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to run indexes migration: {e}")
            return False
    
    def verify_migration(self) -> bool:
        """Verify that the migration was successful."""
        try:
            logger.info("🔍 Verifying PostGIS migration...")
            
            status = self.check_postgis_status()
            
            if not status.get("postgis_enabled"):
                logger.error("❌ PostGIS extension not enabled")
                return False
            
            if not status.get("trigram_enabled"):
                logger.error("❌ pg_trgm extension not enabled")
                return False
            
            # Check for geometry columns
            geom_columns = status.get("geometry_columns", [])
            if not geom_columns:
                logger.warning("⚠️  No geometry columns found")
            else:
                logger.info(f"✅ Found {len(geom_columns)} geometry columns")
                for col in geom_columns:
                    logger.info(f"   - {col['table_name']}.{col['column_name']}")
            
            # Check for spatial indexes
            spatial_indexes = status.get("spatial_indexes", [])
            if not spatial_indexes:
                logger.warning("⚠️  No spatial indexes found")
            else:
                logger.info(f"✅ Found {len(spatial_indexes)} spatial indexes")
                for idx in spatial_indexes:
                    logger.info(f"   - {idx['tablename']}.{idx['indexname']}")
            
            # Test a simple spatial query
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT 
                        'PostGIS test' as test_name,
                        ST_Distance(
                            ST_Point(-80.1918, 25.7617),  -- Miami coordinates
                            ST_Point(-80.1918, 25.7617)
                        ) as distance_test
                """)).fetchone()
                
                if result and result[1] == 0:
                    logger.info("✅ PostGIS spatial functions working correctly")
                else:
                    logger.error("❌ PostGIS spatial functions not working")
                    return False
            
            logger.info("✅ PostGIS migration verification completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration verification failed: {e}")
            return False
    
    def run_complete_migration(self) -> bool:
        """Run the complete PostGIS migration process."""
        logger.info("🚀 Starting PostGIS Migration for Production Database")
        logger.info("=" * 60)
        
        # Step 1: Connect to database
        if not self.connect():
            return False
        
        # Step 2: Check current status
        logger.info("📊 Checking current PostGIS status...")
        status = self.check_postgis_status()
        logger.info(f"PostGIS enabled: {status.get('postgis_enabled', False)}")
        logger.info(f"pg_trgm enabled: {status.get('trigram_enabled', False)}")
        logger.info(f"Geometry columns: {len(status.get('geometry_columns', []))}")
        logger.info(f"Spatial indexes: {len(status.get('spatial_indexes', []))}")
        
        # Step 3: Enable extensions
        if not self.run_postgis_extensions():
            return False
        
        # Step 4: Run geometry migration
        if not self.run_geometry_migration():
            return False
        
        # Step 5: Run indexes migration
        if not self.run_postgis_indexes():
            return False
        
        # Step 6: Verify migration
        if not self.verify_migration():
            return False
        
        logger.info("=" * 60)
        logger.info("✅ PostGIS Migration Completed Successfully!")
        logger.info("📊 Summary:")
        logger.info("   - PostGIS extension enabled")
        logger.info("   - pg_trgm extension enabled")
        logger.info("   - Geometry columns added to tables")
        logger.info("   - Spatial indexes created for efficient queries")
        logger.info("   - All verifications passed")
        
        return True


def main():
    """Main execution function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="PostGIS Migration Runner")
    parser.add_argument("--database-url", help="Database URL (optional)")
    parser.add_argument("--check-only", action="store_true", help="Only check status, don't run migrations")
    parser.add_argument("--verify-only", action="store_true", help="Only verify current setup")
    
    args = parser.parse_args()
    
    try:
        runner = PostGISMigrationRunner(database_url=args.database_url)
        
        if args.check_only:
            if runner.connect():
                status = runner.check_postgis_status()
                print("\n📊 Current PostGIS Status:")
                print(f"PostGIS enabled: {status.get('postgis_enabled', False)}")
                print(f"pg_trgm enabled: {status.get('trigram_enabled', False)}")
                print(f"Geometry columns: {len(status.get('geometry_columns', []))}")
                print(f"Spatial indexes: {len(status.get('spatial_indexes', []))}")
                return 0
            else:
                return 1
        
        if args.verify_only:
            if runner.connect():
                success = runner.verify_migration()
                return 0 if success else 1
            else:
                return 1
        
        # Run complete migration
        success = runner.run_complete_migration()
        return 0 if success else 1
        
    except Exception as e:
        logger.error(f"Migration failed with error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
