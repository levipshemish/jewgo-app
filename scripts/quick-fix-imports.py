#!/usr/bin/env python3
"""
Quick Import Path Fixer for JewGo App
=====================================

This script quickly fixes all remaining import path issues.
"""

import re
from pathlib import Path

def quick_fix_imports():
    """Quick fix for all remaining import path issues."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    files_updated = 0
    
    # Quick fix: replace all overly long paths with correct ones
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
                
                # Replace any overly long path with the correct one
                # Look for patterns like ../../../../../../../../lib and replace
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                
                long_path_pattern = r'\.\.\/\.\.\/lib'
                if re.search(long_path_pattern, content):
                    content = re.sub(long_path_pattern, correct_path, content)
                
                # Write if changed
                if content != original_content:
                    ts_file.write_text(content, encoding='utf-8')
                    relative_path = ts_file.relative_to(frontend_dir)
                    print(f"✅ {relative_path} - Fixed to {correct_path}")
                    files_updated += 1
                    
            except Exception as e:
                print(f"❌ Error updating {ts_file}: {e}")
    
    print(f"\nQuick fix complete! Updated {files_updated} files")

if __name__ == "__main__":
    quick_fix_imports()
