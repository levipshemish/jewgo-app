#!/usr/bin/env python3
"""
Fix Malformed Import Statements Script
=====================================

This script fixes the malformed import statements created by the
backend URL update script.
"""

import os
from pathlib import Path

def fix_imports():
    """Fix malformed import statements in API route files."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    # Pattern to fix
    malformed_pattern = "import { getBackendUrl } from \\'@/lib/api-config\\';"
    correct_pattern = "import { getBackendUrl } from '@/lib/api-config';"
    
    files_fixed = 0
    
    # Scan for files with malformed imports
    for ts_file in api_dir.rglob("*.ts"):
        if ts_file.is_file():
            try:
                content = ts_file.read_text(encoding='utf-8')
                if malformed_pattern in content:
                    # Fix the import
                    new_content = content.replace(malformed_pattern, correct_pattern)
                    ts_file.write_text(new_content, encoding='utf-8')
                    relative_path = ts_file.relative_to(frontend_dir)
                    print(f"✅ Fixed {relative_path}")
                    files_fixed += 1
            except Exception as e:
                print(f"❌ Error fixing {ts_file}: {e}")
    
    print(f"\nFixed {files_fixed} files with malformed import statements")

if __name__ == "__main__":
    fix_imports()
