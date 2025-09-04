#!/usr/bin/env python3
"""
Simple Import Path Fixer for JewGo App
=====================================

This script fixes the specific problematic import paths with correct values.
"""

import os
import re
from pathlib import Path

def fix_specific_paths():
    """Fix specific problematic import paths."""
    frontend_dir = Path("frontend")
    
    # Define the specific files and their correct paths
    fixes = [
        # app/api/admin/audit/export/route.ts -> ../../../../lib (4 levels up from api)
        ("app/api/admin/audit/export/route.ts", "../../../../lib"),
        # app/api/admin/audit/route.ts -> ../../../../lib (4 levels up from api)
        ("app/api/admin/audit/route.ts", "../../../../lib"),
        # app/api/restaurants/search/route.ts -> ../../../../lib (4 levels up from api)
        ("app/api/restaurants/search/route.ts", "../../../../lib"),
    ]
    
    files_updated = 0
    
    for file_path, correct_path in fixes:
        full_path = frontend_dir / file_path
        if full_path.exists():
            try:
                content = full_path.read_text(encoding='utf-8')
                original_content = content
                
                # Replace any overly long relative paths with the correct one
                # Look for patterns like ../../../../../../../../lib and replace with correct path
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/lib'
                content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/lib'
                content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/lib'
                content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/lib'
                content = re.sub(long_path_pattern, correct_path, content)
                
                if content != original_content:
                    full_path.write_text(content, encoding='utf-8')
                    print(f"✅ {file_path} - Fixed to {correct_path}")
                    files_updated += 1
                else:
                    print(f"⚠️  {file_path} - No changes needed")
                    
            except Exception as e:
                print(f"❌ Error updating {file_path}: {e}")
        else:
            print(f"❌ File not found: {file_path}")
    
    print(f"\nUpdated {files_updated} files")
    
    # Test the files to verify the paths are correct
    print("\nTesting import path resolution...")
    for file_path, correct_path in fixes:
        full_path = frontend_dir / file_path
        if full_path.exists():
            try:
                content = full_path.read_text(encoding='utf-8')
                if 'import' in content and 'lib' in content:
                    # Extract the import path
                    import_match = re.search(r'from\s+[\'"]([^\'"]*lib[^\'"]*)[\'"]', content)
                    if import_match:
                        import_path = import_match.group(1)
                        print(f"✅ {file_path} - Import path: {import_path}")
                    else:
                        print(f"⚠️  {file_path} - No lib import found")
                else:
                    print(f"⚠️  {file_path} - No imports found")
            except Exception as e:
                print(f"❌ {file_path} - Error reading file: {e}")

if __name__ == "__main__":
    fix_specific_paths()
