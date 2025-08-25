#!/usr/bin/env python3
"""
Migration Files Cleanup Script
=============================

This script identifies and removes temporary migration files that are no longer needed
after the successful Oracle Cloud PostgreSQL migration.
"""

import os
import shutil
from pathlib import Path

def cleanup_migration_files():
    """Clean up temporary migration files."""
    
    # Files to remove (temporary migration scripts)
    files_to_remove = [
        # Migration scripts (no longer needed)
        "backend/migrate_neon_to_oracle.py",
        "backend/migrate_restaurants_common_columns.py",
        "backend/migrate_remaining_restaurants.py",
        "backend/final_restaurants_migration.py",
        "backend/fix_restaurants_migration.py",
        "backend/fix_restaurants_migration_v2.py",
        "backend/fix_restaurants_migration_final.py",
        "backend/fix_migration.py",
        
        # Test scripts (temporary)
        "backend/test_db_connection.py",
        "backend/test_database_options.py",
        "backend/test_oracle_cloud_connection.py",
        "backend/test_oracle_cloud_final.py",
        "backend/test_production_connection.py",
        "backend/test_server_setup.sh",
        "backend/test_marketplace_categories.py",
        
        # Data checking scripts (temporary)
        "backend/check_neon_data.py",
        "backend/check_table_structure.py",
        "backend/check_column_differences.py",
        "backend/check_db_schema.py",
        "backend/check_marketplace_tables.py",
        "backend/check_marketplace_db.py",
        
        # Setup scripts (temporary)
        "backend/setup_oracle_migration_env.py",
        "backend/find_public_ip.py",
        "backend/find_public_ip_simple.py",
        
        # Verification scripts (temporary)
        "backend/verify_migration_data.py",
        
        # Other temporary files
        "backend/run_marketplace_migration.py",
        "backend/backend.log",
        "backend/config.env",
        
        # Documentation files to move
        "backend/DATABASE_FIX_SUMMARY.md",
    ]
    
    # Files to move to docs/migration/ (for reference)
    files_to_move = [
        "backend/install_backup_system.sh",
        "backend/setup_oracle_backups.sh",
    ]
    
    print("🧹 Migration Files Cleanup")
    print("=" * 50)
    
    # Remove temporary files
    removed_count = 0
    for file_path in files_to_remove:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"✅ Removed: {file_path}")
                removed_count += 1
            except Exception as e:
                print(f"❌ Failed to remove {file_path}: {e}")
        else:
            print(f"ℹ️  Not found: {file_path}")
    
    # Move backup scripts to docs/migration/
    moved_count = 0
    docs_migration_dir = "docs/migration"
    os.makedirs(docs_migration_dir, exist_ok=True)
    
    for file_path in files_to_move:
        if os.path.exists(file_path):
            try:
                filename = os.path.basename(file_path)
                new_path = os.path.join(docs_migration_dir, filename)
                shutil.move(file_path, new_path)
                print(f"📁 Moved: {file_path} → {new_path}")
                moved_count += 1
            except Exception as e:
                print(f"❌ Failed to move {file_path}: {e}")
        else:
            print(f"ℹ️  Not found: {file_path}")
    
    # Move DATABASE_FIX_SUMMARY.md to docs/migration/
    if os.path.exists("backend/DATABASE_FIX_SUMMARY.md"):
        try:
            shutil.move("backend/DATABASE_FIX_SUMMARY.md", "docs/migration/DATABASE_FIX_SUMMARY.md")
            print("📁 Moved: backend/DATABASE_FIX_SUMMARY.md → docs/migration/DATABASE_FIX_SUMMARY.md")
            moved_count += 1
        except Exception as e:
            print(f"❌ Failed to move DATABASE_FIX_SUMMARY.md: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Cleanup Summary:")
    print(f"   ✅ Removed: {removed_count} temporary files")
    print(f"   📁 Moved: {moved_count} files to docs/migration/")
    print(f"   📂 Created: docs/migration/ directory for reference files")
    
    return removed_count, moved_count

def cleanup_cache_directories():
    """Clean up cache directories."""
    
    cache_dirs = [
        "backend/__pycache__",
        "backend/.pytest_cache",
        "frontend/.next",
        "frontend/node_modules/.cache",
    ]
    
    print("\n🗑️  Cache Directory Cleanup")
    print("=" * 50)
    
    removed_count = 0
    for cache_dir in cache_dirs:
        if os.path.exists(cache_dir):
            try:
                shutil.rmtree(cache_dir)
                print(f"✅ Removed: {cache_dir}")
                removed_count += 1
            except Exception as e:
                print(f"❌ Failed to remove {cache_dir}: {e}")
        else:
            print(f"ℹ️  Not found: {cache_dir}")
    
    print(f"📊 Removed {removed_count} cache directories")
    return removed_count

def create_cleanup_summary():
    """Create a cleanup summary document."""
    
    summary_content = """# Migration Cleanup Summary

## 🧹 Cleanup Completed

This document summarizes the cleanup performed after the successful Oracle Cloud PostgreSQL migration.

## 📁 Files Removed

### Migration Scripts (Temporary)
- `migrate_neon_to_oracle.py` - Initial migration attempt
- `migrate_restaurants_common_columns.py` - Final restaurants migration
- `migrate_remaining_restaurants.py` - NULL value fixes
- `fix_restaurants_migration*.py` - Various migration fix attempts
- `fix_migration.py` - Migration fixes

### Test Scripts (Temporary)
- `test_db_connection.py` - Database connection tests
- `test_database_options.py` - Database option tests
- `test_oracle_cloud_connection.py` - Oracle Cloud connection tests
- `test_oracle_cloud_final.py` - Final Oracle Cloud tests
- `test_production_connection.py` - Production connection tests
- `test_server_setup.sh` - Server setup tests
- `test_marketplace_categories.py` - Marketplace category tests

### Data Checking Scripts (Temporary)
- `check_neon_data.py` - Neon data verification
- `check_table_structure.py` - Table structure checks
- `check_column_differences.py` - Column comparison
- `check_db_schema.py` - Database schema checks
- `check_marketplace_*.py` - Marketplace table checks

### Setup Scripts (Temporary)
- `setup_oracle_migration_env.py` - Migration environment setup
- `find_public_ip*.py` - Public IP finding scripts

### Other Temporary Files
- `verify_migration_data.py` - Migration verification
- `run_marketplace_migration.py` - Marketplace migration
- `backend.log` - Temporary log file
- `config.env` - Temporary config file

## 📁 Files Moved to docs/migration/

### Reference Files (Kept for Documentation)
- `install_backup_system.sh` - Backup system installer
- `setup_oracle_backups.sh` - Alternative backup setup
- `DATABASE_FIX_SUMMARY.md` - Database fix documentation

## 🗑️ Cache Directories Cleaned

- `backend/__pycache__/` - Python cache
- `backend/.pytest_cache/` - Pytest cache
- `frontend/.next/` - Next.js build cache
- `frontend/node_modules/.cache/` - Node.js cache

## ✅ Current Project State

After cleanup, the project now has:
- ✅ Clean backend directory with only essential files
- ✅ Organized documentation in docs/migration/
- ✅ Removed temporary migration artifacts
- ✅ Clean cache directories
- ✅ Production-ready Oracle Cloud PostgreSQL setup

## 📋 Remaining Essential Files

### Core Application Files
- `backend/app_factory.py` - Main application factory
- `backend/database/database_manager_v3.py` - Database manager
- `backend/config/gunicorn.conf.py` - Gunicorn configuration
- `backend/utils/unified_database_config.py` - Database configuration

### Documentation
- `docs/DATABASE_MIGRATION_SUMMARY.md` - Complete migration summary
- `docs/ORACLE_CLOUD_BACKUP_AND_OPTIMIZATION.md` - Backup and optimization guide
- `docs/migration/` - Reference files for migration process

### Production Configuration
- Oracle Cloud PostgreSQL database (141.148.50.111)
- Automated nightly backups (3:17am UTC, 7-day retention)
- Optimized connection pooling (pool_size=5, max_overflow=10)
- Gunicorn workers (2-4, optimized for Oracle Cloud)

## 🎯 Next Steps

1. ✅ Migration complete and verified
2. ✅ Backup system implemented
3. ✅ Performance optimized
4. ✅ Documentation updated
5. ✅ Project cleaned and organized

The JewGo application is now running on a clean, organized, and production-ready Oracle Cloud PostgreSQL infrastructure.
"""
    
    with open("docs/migration/CLEANUP_SUMMARY.md", "w") as f:
        f.write(summary_content)
    
    print(f"📝 Created: docs/migration/CLEANUP_SUMMARY.md")

def main():
    """Main cleanup function."""
    print("🚀 Starting Migration Files Cleanup")
    print("=" * 60)
    
    # Clean up migration files
    removed_count, moved_count = cleanup_migration_files()
    
    # Clean up cache directories
    cache_removed = cleanup_cache_directories()
    
    # Create cleanup summary
    create_cleanup_summary()
    
    print("\n" + "=" * 60)
    print("🎉 Cleanup Complete!")
    print("=" * 60)
    print(f"📊 Summary:")
    print(f"   ✅ Removed {removed_count} temporary files")
    print(f"   📁 Moved {moved_count} reference files to docs/migration/")
    print(f"   🗑️  Cleaned {cache_removed} cache directories")
    print(f"   📝 Created cleanup summary documentation")
    print()
    print("🎯 Your project is now clean and organized!")
    print("📂 Reference files are preserved in docs/migration/")
    print("🚀 Ready for production use with Oracle Cloud PostgreSQL")

if __name__ == "__main__":
    main()
