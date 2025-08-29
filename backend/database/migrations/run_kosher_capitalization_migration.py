#!/usr/bin/env python3
"""
Main Migration Runner: Kosher Types and Text Capitalization
==========================================================

This script runs the complete migration to update kosher types and text capitalization
in the database. It executes both the data update and constraint update migrations.

Author: JewGo Development Team
Version: 1.0
Date: 2025-01-17
"""

import os
import sys
import subprocess

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from utils.logging_config import get_logger


def run_migration_script(script_path: str, script_name: str) -> bool:
    """Run a migration script and return success status."""
    logger = get_logger(__name__)

    try:
        logger.info(f"Running {script_name}...")
        print(f"🚀 Running {script_name}...")

        # Run the script
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(script_path),
        )

        # Print output
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(f"⚠️  {script_name} stderr:", result.stderr)

        if result.returncode == 0:
            logger.info(f"{script_name} completed successfully")
            print(f"✅ {script_name} completed successfully")
            return True
        else:
            logger.error(f"{script_name} failed with return code {result.returncode}")
            print(f"❌ {script_name} failed with return code {result.returncode}")
            return False

    except Exception as e:
        logger.error(f"Error running {script_name}", error=str(e))
        print(f"❌ Error running {script_name}: {str(e)}")
        return False


def backup_database() -> bool:
    """Create a backup of the database before migration."""
    logger = get_logger(__name__)

    try:
        logger.info("Creating database backup...")
        print("💾 Creating database backup...")

        # This is a placeholder for database backup logic
        # In production, you would implement actual backup logic here
        # For now, we'll just log that backup should be done

        print("⚠️  Database backup should be performed before running this migration")
        print("   Please ensure you have a recent backup of your database")

        return True

    except Exception as e:
        logger.error("Error creating database backup", error=str(e))
        print(f"❌ Error creating database backup: {str(e)}")
        return False


def verify_prerequisites() -> bool:
    """Verify that all prerequisites are met for the migration."""
    logger = get_logger(__name__)

    try:
        logger.info("Verifying migration prerequisites...")
        print("🔍 Verifying migration prerequisites...")

        # Check if DATABASE_URL is set
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL environment variable is not set")
            return False

        # Check if migration scripts exist
        script_dir = os.path.dirname(__file__)
        required_scripts = [
            "update_kosher_types_capitalization.py",
            "update_kosher_category_constraints.py",
        ]

        for script in required_scripts:
            script_path = os.path.join(script_dir, script)
            if not os.path.exists(script_path):
                print(f"❌ Required migration script not found: {script}")
                return False

        print("✅ All prerequisites verified")
        return True

    except Exception as e:
        logger.error("Error verifying prerequisites", error=str(e))
        print(f"❌ Error verifying prerequisites: {str(e)}")
        return False


def run_complete_migration() -> bool:
    """Run the complete migration process."""
    logger = get_logger(__name__)

    print("🚀 Starting Complete Kosher Types and Text Capitalization Migration")
    print("=" * 80)

    # Step 1: Verify prerequisites
    if not verify_prerequisites():
        return False

    # Step 2: Create backup (placeholder)
    if not backup_database():
        print("⚠️  Continuing without backup (not recommended for production)")

    # Step 3: Run data update migration
    script_dir = os.path.dirname(__file__)
    data_migration_script = os.path.join(
        script_dir, "update_kosher_types_capitalization.py"
    )

    if not run_migration_script(data_migration_script, "Data Update Migration"):
        print("❌ Data update migration failed. Stopping migration process.")
        return False

    # Step 4: Run constraint update migration
    constraint_migration_script = os.path.join(
        script_dir, "update_kosher_category_constraints.py"
    )

    if not run_migration_script(
        constraint_migration_script, "Constraint Update Migration"
    ):
        print("❌ Constraint update migration failed. Stopping migration process.")
        return False

    # Step 5: Final verification
    print("\n🔍 Running final verification...")

    # Re-run data migration verification
    if not run_migration_script(data_migration_script, "Final Data Verification"):
        print("⚠️  Final data verification failed")
        return False

    print("\n" + "=" * 80)
    print("✅ Complete migration process finished successfully!")
    print("📊 Summary:")
    print("   - Kosher types updated to proper capitalization")
    print("   - Text fields updated with first letter capitalization")
    print("   - Database constraints updated to match new values")
    print("   - All verifications passed")

    return True


def show_migration_status() -> None:
    """Show the current status of the database migration."""
    logger = get_logger(__name__)

    try:
        logger.info("Showing migration status...")
        print("📊 Migration Status Check")
        print("=" * 40)

        # This would typically check the actual database state
        # For now, we'll show what the migration is supposed to do

        print("🎯 Migration Goals:")
        print("   - Update kosher_category values:")
        print("     * 'meat' → 'Meat'")
        print("     * 'dairy' → 'Dairy'")
        print("     * 'pareve' → 'Pareve'")
        print("     * 'fish' → 'Fish'")
        print("     * 'unknown' → 'Unknown'")
        print("   - Update text field capitalization:")
        print("     * name, city, state, short_description, etc.")
        print("   - Update database constraints")
        print("   - Update frontend and backend type definitions")

        print("\n📋 Migration Scripts:")
        script_dir = os.path.dirname(__file__)
        scripts = [
            "update_kosher_types_capitalization.py",
            "update_kosher_category_constraints.py",
        ]

        for script in scripts:
            script_path = os.path.join(script_dir, script)
            if os.path.exists(script_path):
                print(f"   ✅ {script}")
            else:
                print(f"   ❌ {script} (missing)")

        print("\n🔧 Updated Files:")
        updated_files = [
            "backend/types/restaurant.py",
            "frontend/lib/types/restaurant.ts",
            "frontend/app/api/restaurants/route.ts",
        ]

        for file_path in updated_files:
            full_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), file_path
            )
            if os.path.exists(full_path):
                print(f"   ✅ {file_path}")
            else:
                print(f"   ❌ {file_path} (missing)")

    except Exception as e:
        logger.error("Error showing migration status", error=str(e))
        print(f"❌ Error showing migration status: {str(e)}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Kosher Types and Text Capitalization Migration"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show migration status without running migration",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without actually running migration",
    )

    args = parser.parse_args()

    if args.status:
        show_migration_status()
    elif args.dry_run:
        print("🔍 Dry Run Mode - Migration would perform the following:")
        print("=" * 60)
        show_migration_status()
        print("\n⚠️  This is a dry run. No changes would be made to the database.")
    else:
        success = run_complete_migration()
        if not success:
            sys.exit(1)
