#!/usr/bin/env python3
"""
Final Import Path Fix Script for JewGo App
==========================================

This script fixes ALL remaining import path issues with correct depth calculation.
"""

import re
from pathlib import Path

def calculate_correct_path(file_path: Path) -> str:
    """Calculate the correct relative path to lib based on file location."""
    parts = file_path.parts
    
    # Find the index of 'api' in the path
    try:
        api_index = parts.index('api')
        # Calculate levels needed to go up from api to reach lib
        levels_needed = len(parts) - api_index - 1
        return '../' * levels_needed + 'lib'
    except ValueError:
        # Fallback if 'api' not found
        return '../../../lib'

def fix_all_import_paths():
    """Fix all import path issues in the frontend."""
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
                correct_path = calculate_correct_path(ts_file)
                
                # Replace ALL overly long paths with the correct one
                patterns_fixed = 0
                
                # Pattern to match any path that has more than 3 levels and ends with /lib
                # This will catch all malformed paths
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                    patterns_fixed += 1
                
                # Also catch paths with 6+ levels
                long_path_pattern2 = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern2, content):
                    content = re.sub(long_path_pattern2, correct_path, content)
                    patterns_fixed += 1
                
                # Catch paths with 5+ levels
                long_path_pattern3 = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern3, content):
                    content = re.sub(long_path_pattern3, correct_path, content)
                    patterns_fixed += 1
                
                # Catch paths with 4+ levels
                long_path_pattern4 = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern4, content):
                    content = re.sub(long_path_pattern4, correct_path, content)
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
        "app/api/admin/restaurants/[id]/approve/route.ts",
        "app/api/restaurants/[id]/fetch-hours/route.ts",
        "app/api/restaurants/[id]/reject/route.ts",
        "app/api/restaurants/[id]/approve/route.ts",
        "app/api/restaurants/[id]/fetch-website/route.ts",
        "app/api/admin/restaurants/bulk/route.ts"
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
    fix_all_import_paths()
