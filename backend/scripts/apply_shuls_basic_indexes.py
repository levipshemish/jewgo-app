#!/usr/bin/env python3
"""Script to apply basic performance indexes for the shuls table.
This script will add the necessary indexes to improve query performance
for the synagogues API, without requiring the cube extension.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def apply_basic_performance_indexes():
    """Apply basic performance indexes to the shuls table."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False
    
    try:
        # Create engine with proper URL handling
        engine = create_engine(database_url)
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            try:
                logger.info("Starting basic performance index creation for shuls table")
                
                # Read and execute the SQL file
                sql_file_path = os.path.join(
                    os.path.dirname(__file__), 
                    '..', 
                    'database', 
                    'migrations', 
                    'add_shuls_basic_performance_indexes.sql'
                )
                
                with open(sql_file_path, 'r') as f:
                    sql_content = f.read()
                
                # Split SQL into individual statements
                statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                
                for i, statement in enumerate(statements):
                    if statement.startswith('--') or not statement:
                        continue
                    
                    try:
                        logger.info(f"Executing statement {i+1}/{len(statements)}")
                        conn.execute(text(statement))
                        logger.info(f"Successfully executed: {statement[:50]}...")
                    except Exception as e:
                        if "already exists" in str(e).lower():
                            logger.info(f"Index already exists, skipping: {statement[:50]}...")
                        else:
                            logger.warning(f"Warning executing statement: {e}")
                            # Continue with other statements
                
                # Commit transaction
                trans.commit()
                logger.info("Successfully applied all basic performance indexes")
                return True
                
            except SQLAlchemyError as e:
                # Rollback transaction on error
                trans.rollback()
                logger.error(f"Error applying basic performance indexes: {e}")
                return False
                
    except Exception as e:
        logger.error(f"Failed to apply basic performance indexes: {e}")
        return False


def verify_basic_indexes():
    """Verify that the basic performance indexes were created successfully."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False
    
    try:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            # Check if key indexes exist
            check_query = """
                SELECT indexname, tablename 
                FROM pg_indexes 
                WHERE tablename = 'shuls' 
                AND indexname LIKE 'idx_shuls_%'
                ORDER BY indexname
            """
            
            result = conn.execute(text(check_query))
            indexes = result.fetchall()
            
            logger.info(f"Found {len(indexes)} performance indexes:")
            for index in indexes:
                logger.info(f"  - {index[0]}")
            
            # Check for specific critical indexes (basic ones)
            critical_indexes = [
                'idx_shuls_location_status',
                'idx_shuls_denomination_location',
                'idx_shuls_type_location',
                'idx_shuls_city_denomination'
            ]
            
            existing_indexes = [idx[0] for idx in indexes]
            missing_indexes = [idx for idx in critical_indexes if idx not in existing_indexes]
            
            if missing_indexes:
                logger.warning(f"Missing critical indexes: {missing_indexes}")
                return False
            else:
                logger.info("All critical basic performance indexes are present")
                return True
                
    except Exception as e:
        logger.error(f"Failed to verify indexes: {e}")
        return False


if __name__ == "__main__":
    logger.info("Starting shuls basic performance index application...")
    
    # Apply the basic indexes
    if apply_basic_performance_indexes():
        logger.info("Basic performance indexes applied successfully")
        
        # Verify the indexes
        if verify_basic_indexes():
            logger.info("All basic performance indexes verified successfully")
            sys.exit(0)
        else:
            logger.error("Basic index verification failed")
            sys.exit(1)
    else:
        logger.error("Failed to apply basic performance indexes")
        sys.exit(1)
