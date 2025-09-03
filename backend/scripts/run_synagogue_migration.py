#!/usr/bin/env python3
"""Run synagogue migration and data import.
This script runs the shuls table creation migration and then imports
the synagogue data from the CSV file.
"""
import os
import sys
import subprocess
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_migration():
    """Run the shuls table creation migration."""
    try:
        logger.info("Running shuls table migration...")
        
        # Get the script directory and look for migration in database/migrations
        script_dir = Path(__file__).parent
        migration_script = script_dir.parent / "database" / "migrations" / "create_shuls_table.py"
        
        if not migration_script.exists():
            logger.error(f"Migration script not found: {migration_script}")
            return False
        
        # Run the migration
        result = subprocess.run([
            sys.executable, str(migration_script)
        ], capture_output=True, text=True, cwd=script_dir.parent.parent)
        
        if result.returncode == 0:
            logger.info("Migration completed successfully!")
            return True
        else:
            logger.error(f"Migration failed with return code {result.returncode}")
            logger.error(f"stdout: {result.stdout}")
            logger.error(f"stderr: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"Error running migration: {e}")
        return False

def run_import():
    """Run the synagogue data import."""
    try:
        logger.info("Running synagogue data import...")
        
        # Get the script directory and look for import script
        script_dir = Path(__file__).parent
        import_script = script_dir / "import_synagogues.py"
        
        if not import_script.exists():
            logger.error(f"Import script not found: {import_script}")
            return False
        
        # Run the import
        result = subprocess.run([
            sys.executable, str(import_script)
        ], capture_output=True, text=True, cwd=script_dir.parent)
        
        if result.returncode == 0:
            logger.info("Import completed successfully!")
            return True
        else:
            logger.error(f"Import failed with return code {result.returncode}")
            logger.error(f"stdout: {result.stdout}")
            logger.error(f"stderr: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"Error running import: {e}")
        return False

def check_requirements():
    """Check if required dependencies are available."""
    try:
        import psycopg2
        logger.info("psycopg2 is available")
    except ImportError:
        logger.error("psycopg2 is not installed. Please install it first:")
        logger.error("pip install psycopg2-binary")
        return False
    
    # Check if DATABASE_URL is set
    if not os.environ.get('DATABASE_URL'):
        logger.error("DATABASE_URL environment variable is not set")
        return False
    
    logger.info("All requirements are met")
    return True

def main():
    """Main function to run the complete migration process."""
    logger.info("Starting synagogue migration process...")
    
    # Check requirements
    if not check_requirements():
        logger.error("Requirements check failed. Exiting.")
        sys.exit(1)
    
    # Step 1: Run migration
    logger.info("Step 1: Creating shuls table...")
    if not run_migration():
        logger.error("Migration failed. Exiting.")
        sys.exit(1)
    
    # Step 2: Run import
    logger.info("Step 2: Importing synagogue data...")
    if not run_import():
        logger.error("Import failed. Exiting.")
        sys.exit(1)
    
    logger.info("Synagogue migration process completed successfully!")
    logger.info("Next steps:")
    logger.info("1. Run 'npx prisma generate' to update Prisma client")
    logger.info("2. Test the /api/synagogues endpoint")
    logger.info("3. Verify the shuls page is working with real data")
    
    sys.exit(0)

if __name__ == "__main__":
    main()
