#!/usr/bin/env python3
"""
Update to Barrel Imports Script for JewGo App
============================================

This script updates imports to use the centralized barrel export file
to resolve path resolution issues.
"""

import os
import re
from pathlib import Path

def update_to_barrel_imports():
    """Update imports to use the centralized barrel export file."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    # Patterns to match and replace
    patterns = [
        # API config imports
        (r'import\s+\{\s*getBackendUrl\s*\}\s+from\s+[\'"]\.\./\.\./\.\./lib/api-config[\'"];?', 
         'import { getBackendUrl } from \'../../../lib\';'),
        (r'import\s+\{\s*getBackendUrl\s*\}\s+from\s+[\'"]\.\./\.\./\.\./\.\./lib/api-config[\'"];?', 
         'import { getBackendUrl } from \'../../../../lib\';'),
        (r'import\s+\{\s*getBackendUrl\s*\}\s+from\s+[\'"]\.\./\.\./\.\./\.\./\.\./lib/api-config[\'"];?', 
         'import { getBackendUrl } from \'../../../../../lib\';'),
        
        # Error response imports
        (r'import\s+\{\s*errorResponses[^}]*\}\s+from\s+[\'"]\.\./\.\./\.\./lib/utils/error-responses[\'"];?', 
         'import { errorResponses } from \'../../../lib\';'),
        (r'import\s+\{\s*errorResponses[^}]*\}\s+from\s+[\'"]\.\./\.\./\.\./\.\./lib/utils/error-responses[\'"];?', 
         'import { errorResponses } from \'../../../../lib\';'),
        (r'import\s+\{\s*errorResponses[^}]*\}\s+from\s+[\'"]\.\./\.\./\.\./\.\./\.\./lib/utils/error-responses[\'"];?', 
         'import { errorResponses } from \'../../../../../lib\';'),
        
        # Restaurant status imports
        (r'import\s+\{\s*handleRestaurantStatusChange[^}]*\}\s+from\s+[\'"]\.\./\.\./\.\./lib/server/restaurant-status-utils[\'"];?', 
         'import { handleRestaurantStatusChange } from \'../../../lib\';'),
        (r'import\s+\{\s*handleRestaurantStatusChange[^}]*\}\s+from\s+[\'"]\.\./\.\./\.\./\.\./lib/server/restaurant-status-utils[\'"];?', 
         'import { handleRestaurantStatusChange } from \'../../../../lib\';'),
        (r'import\s+\{\s*handleRestaurantStatusChange[^}]*\}\s+from\s+[\'"]\.\./\.\./\.\./\.\./\.\./lib/server/restaurant-status-utils[\'"];?', 
         'import { handleRestaurantStatusChange } from \'../../../../../lib\';'),
    ]
    
    files_updated = 0
    
    # Scan for files with the patterns
    for ts_file in api_dir.rglob("*.ts"):
        if ts_file.is_file():
            try:
                content = ts_file.read_text(encoding='utf-8')
                original_content = content
                
                # Apply all patterns
                for pattern, replacement in patterns:
                    content = re.sub(pattern, replacement, content)
                
                if content != original_content:
                    # Write updated content
                    ts_file.write_text(content, encoding='utf-8')
                    relative_path = ts_file.relative_to(frontend_dir)
                    print(f"✅ {relative_path} - Updated to barrel imports")
                    files_updated += 1
                    
            except Exception as e:
                print(f"❌ Error updating {ts_file}: {e}")
    
    print(f"\nUpdated {files_updated} files to use barrel imports")
    
    # Test the barrel export file
    print("\nTesting barrel export file...")
    barrel_file = frontend_dir / "lib" / "index.ts"
    if barrel_file.exists():
        try:
            content = barrel_file.read_text(encoding='utf-8')
            if 'export { getBackendUrl' in content:
                print("✅ Barrel export file contains getBackendUrl")
            else:
                print("❌ Barrel export file missing getBackendUrl")
        except Exception as e:
            print(f"❌ Error reading barrel file: {e}")
    else:
        print("❌ Barrel export file not found")

if __name__ == "__main__":
    update_to_barrel_imports()
