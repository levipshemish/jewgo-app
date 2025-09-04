#!/usr/bin/env python3
"""
Final Import Path Fixer for JewGo App
=====================================

This script fixes ALL remaining import path issues with correct depth calculation.
"""

import re
from pathlib import Path

def final_import_fix():
    """Final fix for all remaining import path issues."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    files_updated = 0
    
    # Process all API route files
    for ts_file in api_dir.rglob("*.ts"):
        if ts_file.is_file():
            try:
                content = ts_file.read_text(encoding='utf-8')
                original_content = content
                
                # Calculate correct path for this file
                parts = ts_file.parts
                try:
                    api_index = parts.index('api')
                    levels_to_lib = len(parts) - api_index - 1
                    correct_path = '../' * levels_to_lib + 'lib'
                except ValueError:
                    correct_path = '../../../lib'
                
                # Replace ALL overly long paths with the correct one
                # This will catch any remaining malformed paths
                patterns_fixed = 0
                
                # Look for any path that has more than 2 levels and ends with /lib
                # This regex will match any overly long relative path
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
                
                # Write if changed
                if content != original_content:
                    ts_file.write_text(content, encoding='utf-8')
                    relative_path = ts_file.relative_to(frontend_dir)
                    print(f"✅ {relative_path} - Fixed to {correct_path} ({patterns_fixed} patterns)")
                    files_updated += 1
                    
            except Exception as e:
                print(f"❌ Error updating {ts_file}: {e}")
    
    print(f"\nFinal import fix complete! Updated {files_updated} files")
    
    # Test a few critical files
    print("\nTesting critical files...")
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
    final_import_fix()
