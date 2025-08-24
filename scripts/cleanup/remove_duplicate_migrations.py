#!/usr/bin/env python3
"""
Remove Duplicate Marketplace Migration Files
===========================================

This script removes duplicate marketplace migration files after consolidating
them into the unified migration.
"""

import os
import sys
import shutil
from datetime import datetime
from typing import List, Dict

def get_duplicate_migration_files() -> List[str]:
    """Get list of duplicate marketplace migration files to remove."""
    return [
        "./backend/database/migrations/create_marketplace_schema.py",
        "./backend/database/migrations/create_marketplace_schema_simple.py",
        "./backend/database/migrations/create_marketplace_table_script.py",
        "./backend/database/migrations/create_marketplace_streamlined.py",
        "./scripts/database/simple_marketplace_migration.py",
        "./scripts/database/execute_marketplace_migration.py",
    ]

def backup_file(file_path: str, backup_dir: str) -> bool:
    """Backup a file before deletion."""
    try:
        if os.path.exists(file_path):
            # Create backup directory if it doesn't exist
            os.makedirs(backup_dir, exist_ok=True)
            
            # Create backup filename with timestamp
            filename = os.path.basename(file_path)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"{filename}.backup_{timestamp}"
            backup_path = os.path.join(backup_dir, backup_filename)
            
            # Copy file to backup location
            shutil.copy2(file_path, backup_path)
            print(f"✅ Backed up: {file_path} -> {backup_path}")
            return True
        else:
            print(f"⚠️ File not found: {file_path}")
            return False
    except Exception as e:
        print(f"❌ Failed to backup {file_path}: {e}")
        return False

def remove_file(file_path: str) -> bool:
    """Remove a file safely."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Removed: {file_path}")
            return True
        else:
            print(f"⚠️ File not found: {file_path}")
            return False
    except Exception as e:
        print(f"❌ Failed to remove {file_path}: {e}")
        return False

def main():
    """Main execution function."""
    print("🧹 Starting cleanup of duplicate marketplace migration files...")
    print("=" * 60)
    
    # Create backup directory
    backup_dir = "./archive/duplicate_migrations_backup"
    os.makedirs(backup_dir, exist_ok=True)
    
    # Get list of files to remove
    files_to_remove = get_duplicate_migration_files()
    
    print(f"📋 Found {len(files_to_remove)} duplicate migration files to remove:")
    for file_path in files_to_remove:
        print(f"   - {file_path}")
    
    print(f"\n💾 Backup directory: {backup_dir}")
    print("\n⚠️ This will remove the following files:")
    for file_path in files_to_remove:
        if os.path.exists(file_path):
            print(f"   - {file_path}")
    
    # Ask for confirmation
    response = input("\n❓ Do you want to proceed? (y/N): ").strip().lower()
    if response not in ['y', 'yes']:
        print("❌ Cleanup cancelled")
        return 1
    
    print("\n🔄 Starting cleanup process...")
    
    # Track results
    results = {
        'total': len(files_to_remove),
        'backed_up': 0,
        'removed': 0,
        'failed': 0,
        'errors': []
    }
    
    # Process each file
    for file_path in files_to_remove:
        print(f"\n📁 Processing: {file_path}")
        
        # Backup file first
        if backup_file(file_path, backup_dir):
            results['backed_up'] += 1
        
        # Remove file
        if remove_file(file_path):
            results['removed'] += 1
        else:
            results['failed'] += 1
            results['errors'].append(f"Failed to remove: {file_path}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 Cleanup Summary:")
    print(f"   Total files: {results['total']}")
    print(f"   Backed up: {results['backed_up']}")
    print(f"   Removed: {results['removed']}")
    print(f"   Failed: {results['failed']}")
    
    if results['errors']:
        print(f"\n❌ Errors:")
        for error in results['errors']:
            print(f"   - {error}")
    
    if results['removed'] > 0:
        print(f"\n✅ Successfully removed {results['removed']} duplicate migration files!")
        print(f"📁 Backups saved in: {backup_dir}")
        print(f"🏗️ Use the unified migration: ./backend/database/migrations/create_marketplace_unified.py")
    
    return 0 if results['failed'] == 0 else 1

if __name__ == "__main__":
    exit(main())
