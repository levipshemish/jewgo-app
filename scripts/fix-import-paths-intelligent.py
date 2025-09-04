#!/usr/bin/env python3
"""
Intelligent Import Path Fixer for JewGo App
===========================================

This script fixes import paths in API route files based on their actual depth
from the lib directory.
"""

import os
import re
from pathlib import Path

def calculate_relative_path_to_lib(api_file_path):
    """Calculate the correct relative path from an API file to the lib directory."""
    # Count the number of directory levels from the API file to the lib directory
    parts = api_file_path.parts
    
    # Find the index of 'app' in the path
    try:
        app_index = parts.index('app')
        # Count levels from the API file to the lib directory
        # lib is at the same level as app
        levels_to_lib = len(parts) - app_index - 1  # -1 because we're going up from the file level
        
        # Build the relative path
        if levels_to_lib == 0:
            return '../lib'
        else:
            return '../' * levels_to_lib + 'lib'
    except ValueError:
        # Fallback if 'app' not found
        return '../../../lib'

def fix_import_paths():
    """Fix import paths in API route files based on their actual depth."""
    frontend_dir = Path(".")
    api_dir = frontend_dir / "app" / "api"
    
    files_updated = 0
    
    # Scan for files with the patterns
    for ts_file in api_dir.rglob("*.ts"):
        if ts_file.is_file():
            try:
                content = ts_file.read_text(encoding='utf-8')
                original_content = content
                
                # Calculate the correct relative path for this file
                relative_path = calculate_relative_path_to_lib(ts_file)
                
                # Fix the import path
                if '../../../lib' in content:
                    content = content.replace('../../../lib', relative_path)
                    print(f"✅ {ts_file.relative_to(frontend_dir)} - Updated to {relative_path}")
                    files_updated += 1
                elif '../../../../lib' in content:
                    content = content.replace('../../../../lib', relative_path)
                    print(f"✅ {ts_file.relative_to(frontend_dir)} - Updated to {relative_path}")
                    files_updated += 1
                
                # Write updated content if changed
                if content != original_content:
                    ts_file.write_text(content, encoding='utf-8')
                    
            except Exception as e:
                print(f"❌ Error updating {ts_file}: {e}")
    
    print(f"\nUpdated {files_updated} files with correct import paths")
    
    # Test a few files to verify the paths are correct
    print("\nTesting import path resolution...")
    test_files = [
        "app/api/account/link/route.ts",
        "app/api/admin/audit/route.ts",
        "app/api/health-check/route.ts"
    ]
    
    for test_file in test_files:
        test_path = frontend_dir / test_file
        if test_path.exists():
            try:
                content = test_path.read_text(encoding='utf-8')
                if 'import' in content and 'lib' in content:
                    # Extract the import path
                    import_match = re.search(r'from\s+[\'"]([^\'"]*lib[^\'"]*)[\'"]', content)
                    if import_match:
                        import_path = import_match.group(1)
                        print(f"✅ {test_file} - Import path: {import_path}")
                    else:
                        print(f"⚠️  {test_file} - No lib import found")
                else:
                    print(f"⚠️  {test_file} - No imports found")
            except Exception as e:
                print(f"❌ {test_file} - Error reading file: {e}")

if __name__ == "__main__":
    fix_import_paths()
