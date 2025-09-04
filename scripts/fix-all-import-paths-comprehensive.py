#!/usr/bin/env python3
"""
Comprehensive Import Path Fixer for JewGo App
============================================

This script fixes ALL import paths with correct depth calculation for all API route files.
"""

import os
import re
from pathlib import Path

def calculate_correct_relative_path(api_file_path):
    """Calculate the correct relative path from an API file to the lib directory."""
    # The lib directory is at the same level as the app directory
    # So we need to go up from the API file to reach the same level as app, then into lib
    
    parts = api_file_path.parts
    
    # Find the index of 'api' in the path (api is the parent of all API routes)
    try:
        api_index = parts.index('api')
        # Count levels from the API file to the lib directory
        # lib is at the same level as api, so we go up from the file level
        levels_to_lib = len(parts) - api_index - 1  # -1 because we're going up from the file level
        
        # Build the relative path
        if levels_to_lib == 0:
            return '../lib'
        else:
            return '../' * levels_to_lib + 'lib'
    except ValueError:
        # Fallback if 'api' not found
        return '../../../lib'

def fix_all_import_paths_comprehensive():
    """Fix all import paths with comprehensive pattern matching."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    files_updated = 0
    total_imports_fixed = 0
    
    # Scan for files with the patterns
    for ts_file in api_dir.rglob("*.ts"):
        if ts_file.is_file():
            try:
                content = ts_file.read_text(encoding='utf-8')
                original_content = content
                
                # Calculate the correct relative path for this file
                correct_path = calculate_correct_relative_path(ts_file)
                
                # Fix various import path patterns
                patterns_fixed = 0
                
                # Fix ALL overly long relative paths to use the correct calculated path
                # Look for any pattern that ends with /lib and has more than 2 levels
                long_path_patterns = [
                    r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib',
                    r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib',
                    r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib',
                    r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib',
                    r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib',
                    r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib',
                    r'\.\.\/\.\.\/\.\.\/\.\.\/lib',
                    r'\.\.\/\.\.\/\.\.\/lib',
                    r'\.\.\/\.\.\/lib',
                    r'\.\.\/lib',
                ]
                
                for pattern in long_path_patterns:
                    if re.search(pattern, content):
                        content = re.sub(pattern, correct_path, content)
                        patterns_fixed += 1
                
                # Write updated content if changed
                if content != original_content:
                    ts_file.write_text(content, encoding='utf-8')
                    relative_file_path = ts_file.relative_to(frontend_dir)
                    print(f"✅ {relative_file_path} - Fixed to {correct_path} ({patterns_fixed} patterns)")
                    files_updated += 1
                    total_imports_fixed += patterns_fixed
                    
            except Exception as e:
                print(f"❌ Error updating {ts_file}: {e}")
    
    print(f"\nUpdated {files_updated} files with {total_imports_fixed} total patterns fixed")
    
    # Test a few files to verify the paths are correct
    print("\nTesting import path resolution...")
    test_files = [
        "app/api/admin/audit/export/route.ts",
        "app/api/admin/audit/stream/route.ts",
        "app/api/admin/auth/refresh/route.ts",
        "app/api/admin/dashboard/metrics/route.ts",
        "app/api/admin/images/[id]/route.ts"
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
    fix_all_import_paths_comprehensive()
