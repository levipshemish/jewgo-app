#!/usr/bin/env python3
"""
Fix Malformed Import Paths Script for JewGo App
==============================================

This script fixes import paths that were incorrectly modified by the frontend URL consolidation.
"""

import os
import re
from pathlib import Path

def fix_malformed_imports():
    """Fix all malformed import paths in API route files."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    files_updated = 0
    total_imports_fixed = 0
    
    # Scan for files with malformed import paths
    for ts_file in api_dir.rglob("*.ts"):
        if ts_file.is_file():
            try:
                content = ts_file.read_text(encoding='utf-8')
                original_content = content
                
                # Calculate the correct relative path for this file
                parts = ts_file.parts
                try:
                    api_index = parts.index('api')
                    levels_to_lib = len(parts) - api_index - 1
                    correct_path = '../' * levels_to_lib + 'lib'
                except ValueError:
                    correct_path = '../../../lib'
                
                # Fix overly long import paths
                patterns_fixed = 0
                
                # Look for patterns like ../../../../../../../../../../lib and replace with correct path
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                    patterns_fixed += 1
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                    patterns_fixed += 1
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                    patterns_fixed += 1
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                    patterns_fixed += 1
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                    patterns_fixed += 1
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                    patterns_fixed += 1
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                    patterns_fixed += 1
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                    patterns_fixed += 1
                
                long_path_pattern = r'\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
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
        "app/api/admin/audit/stream/route.ts",
        "app/api/admin/auth/refresh/route.ts",
        "app/api/account/link/route.ts"
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
    fix_malformed_imports()
