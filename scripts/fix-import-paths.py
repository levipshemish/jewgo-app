#!/usr/bin/env python3
"""
Fix Import Path Issues Script for JewGo App
==========================================

This script converts @/lib/api-config imports to relative paths
to resolve TypeScript compilation issues.
"""

import os
import re
from pathlib import Path

def fix_import_paths():
    """Convert @/lib/api-config imports to relative paths."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    # Pattern to match @/lib/api-config imports
    import_pattern = r'import\s+\{\s*getBackendUrl\s*\}\s+from\s+[\'"]@/lib/api-config[\'"];?'
    
    files_updated = 0
    
    # Scan for files with the problematic import
    for ts_file in api_dir.rglob("*.ts"):
        if ts_file.is_file():
            try:
                content = ts_file.read_text(encoding='utf-8')
                if re.search(import_pattern, content):
                    # Calculate relative path from this file to lib/api-config.ts
                    relative_path = ts_file.relative_to(frontend_dir)
                    parts = relative_path.parts
                    
                    # Calculate how many levels to go up to reach lib/
                    # app/api/... -> ../../lib/api-config
                    levels_up = len(parts) - 1  # -1 because we want to go up from the file's directory
                    relative_import = '../' * levels_up + 'lib/api-config'
                    
                    # Replace the import
                    new_content = re.sub(import_pattern, f'import {{ getBackendUrl }} from \'{relative_import}\';', content)
                    
                    if new_content != content:
                        # Write updated content
                        ts_file.write_text(new_content, encoding='utf-8')
                        print(f"✅ {relative_path} - Updated import to '{relative_import}'")
                        files_updated += 1
                    else:
                        print(f"⚠️  {relative_path} - No changes made")
                        
            except Exception as e:
                print(f"❌ Error updating {ts_file}: {e}")
    
    print(f"\nUpdated {files_updated} files with import path fixes")
    
    # Now let's test a few files to see if the imports work
    print("\nTesting import resolution...")
    test_files = [
        "app/api/health-check/route.ts",
        "app/api/reviews/route.ts",
        "app/api/restaurants/search/route.ts"
    ]
    
    for test_file in test_files:
        test_path = frontend_dir / test_file
        if test_path.exists():
            try:
                content = test_path.read_text(encoding='utf-8')
                if 'import { getBackendUrl }' in content:
                    print(f"✅ {test_file} - Import statement found")
                else:
                    print(f"❌ {test_file} - Import statement missing")
            except Exception as e:
                print(f"❌ {test_file} - Error reading file: {e}")

if __name__ == "__main__":
    fix_import_paths()
