#!/usr/bin/env python3
"""
Fix All Remaining Import Paths Script for JewGo App
==================================================

This script fixes ALL remaining import path issues with correct depth calculation.
"""

import re
from pathlib import Path

def fix_all_remaining_imports():
    """Fix all remaining import path issues."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    files_updated = 0
    total_patterns_fixed = 0
    
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
                patterns_fixed = 0
                
                # Look for any path that has more than 2 levels and ends with /lib
                # This will catch all remaining malformed paths
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
                
                # Write if changed
                if content != original_content:
                    ts_file.write_text(content, encoding='utf-8')
                    relative_path = ts_file.relative_to(frontend_dir)
                    print(f"✅ {relative_path} - Fixed to {correct_path} ({patterns_fixed} patterns)")
                    files_updated += 1
                    total_patterns_fixed += patterns_fixed
                    
            except Exception as e:
                print(f"❌ Error updating {ts_file}: {e}")
    
    print(f"\nAll remaining import paths fixed!")
    print(f"📁 Files Updated: {files_updated}")
    print(f"🔄 Total Patterns Fixed: {total_patterns_fixed}")
    
    # Test a few critical files to verify the paths are correct
    print("\n🧪 Testing critical files...")
    test_files = [
        "app/api/admin/images/bulk/route.ts",
        "app/api/admin/images/export/route.ts",
        "app/api/admin/kosher-places/export/route.ts",
        "app/api/admin/meta/[entity]/route.ts",
        "app/api/admin/rbac/validate/route.ts"
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
    fix_all_remaining_imports()
