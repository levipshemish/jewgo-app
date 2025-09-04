#!/usr/bin/env python3
"""
Final Targeted Import Path Fix Script for JewGo App
==================================================

This script fixes import path issues by targeting specific problematic files first,
then systematically fixing the remaining ones.
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
        # The lib directory is at the same level as 'app'
        levels_needed = len(parts) - api_index - 1
        
        # Special handling for nested routes with [id] and other dynamic segments
        # These need extra levels to account for the dynamic routing structure
        if '[id]' in parts or '[...path]' in parts:
            # Add extra level for dynamic routes
            levels_needed += 1
            
        return '../' * levels_needed + 'lib'
    except ValueError:
        # Fallback if 'api' not found
        return '../../../lib'

def fix_targeted_files():
    """Fix specific files that are causing build failures."""
    frontend_dir = Path("frontend")
    
    # List of critical files that need fixing
    critical_files = [
        "app/api/admin/restaurants/bulk/route.ts",
        "app/api/admin/restaurants/[id]/approve/route.ts",
        "app/api/admin/restaurants/[id]/reject/route.ts",
        "app/api/admin/submissions/restaurants/[id]/approve/route.ts",
        "app/api/admin/submissions/restaurants/[id]/reject/route.ts"
    ]
    
    files_fixed = 0
    
    for file_path in critical_files:
        full_path = frontend_dir / file_path
        if full_path.exists():
            try:
                content = full_path.read_text(encoding='utf-8')
                original_content = content
                
                # Calculate correct path for this file
                correct_path = calculate_correct_path(full_path)
                
                # Replace all import paths with the correct one
                # This will catch any malformed paths
                patterns_fixed = 0
                
                # Pattern to match any path that has more than 3 levels and ends with /lib
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
                long_path_pattern3 = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\/lib'
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
                    full_path.write_text(content, encoding='utf-8')
                    print(f"✅ {file_path} - Fixed to {correct_path} ({patterns_fixed} patterns)")
                    files_fixed += 1
                else:
                    print(f"✅ {file_path} - Already correct ({correct_path})")
                    
            except Exception as e:
                print(f"❌ Error updating {file_path}: {e}")
    
    print(f"\nCritical files fixed: {files_fixed}")
    return files_fixed

def fix_all_remaining_files():
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
                correct_path = calculate_correct_path(ts_file)
                
                # Replace ALL overly long paths with the correct one
                patterns_fixed = 0
                
                # Pattern to match any path that has more than 3 levels and ends with /lib
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
                long_path_pattern3 = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\/lib'
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
    return files_updated, total_patterns_fixed

def main():
    """Main function to fix all import path issues."""
    print("🔧 Starting targeted import path fixes...")
    
    # Step 1: Fix critical files first
    critical_fixed = fix_targeted_files()
    
    # Step 2: Fix all remaining files
    print(f"\n🔧 Fixing all remaining import path issues...")
    remaining_fixed, total_patterns = fix_all_remaining_files()
    
    print(f"\n🎉 Import path fixes completed!")
    print(f"📁 Critical Files Fixed: {critical_fixed}")
    print(f"📁 Remaining Files Fixed: {remaining_fixed}")
    print(f"🔄 Total Patterns Fixed: {total_patterns}")

if __name__ == "__main__":
    main()
