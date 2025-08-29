#!/usr/bin/env python3
"""
Environment Configuration Migration Script
=========================================

This script helps migrate environment variables from backend/config.env
to the root .env file, following the project's new configuration structure.

Usage:
    python scripts/migrate-env-config.py

Author: JewGo Development Team
Version: 1.0
"""

import os
import shutil
from pathlib import Path


def load_env_file(file_path):
    """Load environment variables from a file."""
    env_vars = {}
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()
                        
                        # Remove quotes if present
                        if (value.startswith('"') and value.endswith('"')) or \
                           (value.startswith("'") and value.endswith("'")):
                            value = value[1:-1]
                        
                        env_vars[key] = value
            print(f"✅ Loaded {len(env_vars)} variables from {file_path}")
        except Exception as e:
            print(f"❌ Failed to load {file_path}: {e}")
    else:
        print(f"⚠️  File not found: {file_path}")
    
    return env_vars


def save_env_file(file_path, env_vars):
    """Save environment variables to a file."""
    try:
        with open(file_path, 'w') as f:
            for key, value in sorted(env_vars.items()):
                f.write(f"{key}={value}\n")
        print(f"✅ Saved {len(env_vars)} variables to {file_path}")
        return True
    except Exception as e:
        print(f"❌ Failed to save {file_path}: {e}")
        return False


def merge_env_vars(existing_vars, new_vars):
    """Merge environment variables, preferring existing ones."""
    merged = existing_vars.copy()
    
    for key, value in new_vars.items():
        if key not in merged:
            merged[key] = value
            print(f"➕ Added: {key}")
        else:
            print(f"⏭️  Skipped: {key} (already exists)")
    
    return merged


def main():
    """Main migration function."""
    print("🔄 Environment Configuration Migration")
    print("=" * 50)
    
    # Define file paths
    project_root = Path(__file__).parent.parent
    backend_config_env = project_root / "backend" / "config.env"
    root_env = project_root / ".env"
    
    print(f"Project root: {project_root}")
    print(f"Backend config.env: {backend_config_env}")
    print(f"Root .env: {root_env}")
    print()
    
    # Load existing root .env if it exists
    existing_vars = load_env_file(root_env)
    
    # Load backend config.env
    backend_vars = load_env_file(backend_config_env)
    
    if not backend_vars:
        print("❌ No variables found in backend/config.env")
        return
    
    # Merge variables
    print("\n🔄 Merging environment variables...")
    merged_vars = merge_env_vars(existing_vars, backend_vars)
    
    # Save to root .env
    print(f"\n💾 Saving to {root_env}...")
    if save_env_file(root_env, merged_vars):
        print("\n✅ Migration completed successfully!")
        print("\n📋 Next steps:")
        print("1. Verify the root .env file contains all necessary variables")
        print("2. Test your application to ensure it works with the new configuration")
        print("3. Once confirmed working, you can optionally remove backend/config.env")
        print("4. Update any scripts that reference backend/config.env")
        
        # Ask if user wants to backup the old file
        response = input("\n🤔 Would you like to backup backend/config.env as backend/config.env.backup? (y/N): ")
        if response.lower() in ['y', 'yes']:
            backup_path = backend_config_env.with_suffix('.env.backup')
            try:
                shutil.copy2(backend_config_env, backup_path)
                print(f"✅ Backed up to {backup_path}")
            except Exception as e:
                print(f"❌ Failed to create backup: {e}")
    else:
        print("❌ Migration failed!")


if __name__ == "__main__":
    main()
