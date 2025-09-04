#!/usr/bin/env python3
"""
Targeted Backend URL Update Script for JewGo App
===============================================

This script specifically targets the 21 backend URL patterns identified
for consolidation with minimal risk.
"""

import os
import re
from pathlib import Path

def update_backend_urls():
    """Update backend URL patterns in API route files."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    # Pattern to match backend URL assignments
    backend_url_pattern = r'process\.env\[[\'"]NEXT_PUBLIC_BACKEND_URL[\'"]\]\s*\|\|\s*[\'"][^\'"]+[\'"]'
    
    # Files that need the import added
    files_to_update = []
    
    # Scan for files with backend URL patterns
    for ts_file in api_dir.rglob("*.ts"):
        if ts_file.is_file():
            try:
                content = ts_file.read_text(encoding='utf-8')
                if re.search(backend_url_pattern, content):
                    files_to_update.append(ts_file)
            except Exception as e:
                print(f"Error reading {ts_file}: {e}")
    
    print(f"Found {len(files_to_update)} files with backend URL patterns to update")
    
    for file_path in files_to_update:
        try:
            content = file_path.read_text(encoding='utf-8')
            relative_path = file_path.relative_to(frontend_dir)
            
            # Check if import already exists
            if 'import { getBackendUrl }' in content:
                print(f"✅ {relative_path} - Already has import")
                continue
            
            # Add import if not present
            if 'import { NextRequest' in content:
                # Add import after existing imports
                content = re.sub(
                    r'(import.*NextRequest.*\n)',
                    r'\1import { getBackendUrl } from \'@/lib/api-config\';\n',
                    content
                )
                print(f"➕ {relative_path} - Added import")
            
            # Replace backend URL patterns
            old_pattern = r'process\.env\[[\'"]NEXT_PUBLIC_BACKEND_URL[\'"]\]\s*\|\|\s*[\'"][^\'"]+[\'"]'
            new_content = re.sub(old_pattern, 'getBackendUrl()', content)
            
            if new_content != content:
                # Write updated content
                file_path.write_text(new_content, encoding='utf-8')
                print(f"🔄 {relative_path} - Updated backend URL patterns")
            else:
                print(f"⚠️  {relative_path} - No patterns found to replace")
                
        except Exception as e:
            print(f"❌ Error updating {file_path}: {e}")
    
    print("\nBackend URL consolidation complete!")
    print("Next steps:")
    print("1. Test the build to ensure no errors")
    print("2. Verify that getBackendUrl() is working correctly")
    print("3. Check that environment variables are still properly configured")

if __name__ == "__main__":
    update_backend_urls()
