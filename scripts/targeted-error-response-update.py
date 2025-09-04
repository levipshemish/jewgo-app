#!/usr/bin/env python3
"""
Targeted Error Response Update Script for JewGo App
==================================================

This script updates error response patterns in existing API route files
with a more focused approach.
"""

import os
import re
from pathlib import Path

def update_error_responses():
    """Update error response patterns in existing API route files."""
    frontend_dir = Path("frontend")
    api_dir = frontend_dir / "app" / "api"
    
    # Simple patterns that are more likely to work
    patterns = [
        # Simple single-line patterns
        (r'NextResponse\.json\(\s*\{\s*error:\s*[\'"][^\'"]*[\'"]\s*\}\s*,\s*\{\s*status:\s*400\s*\}\s*\)', 'errorResponses.badRequest()'),
        (r'NextResponse\.json\(\s*\{\s*error:\s*[\'"][^\'"]*[\'"]\s*\}\s*,\s*\{\s*status:\s*401\s*\}\s*\)', 'errorResponses.unauthorized()'),
        (r'NextResponse\.json\(\s*\{\s*error:\s*[\'"][^\'"]*[\'"]\s*\}\s*,\s*\{\s*status:\s*403\s*\}\s*\)', 'errorResponses.forbidden()'),
        (r'NextResponse\.json\(\s*\{\s*error:\s*[\'"][^\'"]*[\'"]\s*\}\s*,\s*\{\s*status:\s*404\s*\}\s*\)', 'errorResponses.notFound()'),
        (r'NextResponse\.json\(\s*\{\s*error:\s*[\'"][^\'"]*[\'"]\s*\}\s*,\s*\{\s*status:\s*500\s*\}\s*\)', 'errorResponses.internalError()'),
        
        # Success response patterns
        (r'NextResponse\.json\(\s*\{\s*success:\s*true\s*[^}]*\}\s*\)', 'createSuccessResponse()'),
        (r'NextResponse\.json\(\s*\{\s*message:\s*[\'"][^\'"]*[\'"]\s*[^}]*\}\s*\)', 'createSuccessResponse()'),
    ]
    
    files_updated = 0
    total_patterns_found = 0
    
    # Scan for files with the patterns
    for ts_file in api_dir.rglob("*.ts"):
        if ts_file.is_file():
            try:
                content = ts_file.read_text(encoding='utf-8')
                original_content = content
                patterns_found = 0
                
                # Apply all patterns
                for pattern, replacement in patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        content = re.sub(pattern, replacement, content)
                        patterns_found += len(matches)
                
                if content != original_content:
                    # Add import if not present
                    if 'errorResponses' in content and 'import { errorResponses }' not in content:
                        # Find the best place to add the import
                        if 'import { NextResponse }' in content:
                            content = content.replace(
                                'import { NextResponse }',
                                'import { NextResponse } from \'next/server\';\nimport { errorResponses, createSuccessResponse } from \'../../../lib\';'
                            )
                        else:
                            # Add at the top after other imports
                            lines = content.split('\n')
                            import_index = 0
                            for i, line in enumerate(lines):
                                if line.strip().startswith('import '):
                                    import_index = i + 1
                                elif line.strip() and not line.strip().startswith('import '):
                                    break
                            
                            lines.insert(import_index, 'import { errorResponses, createSuccessResponse } from \'../../../lib\';')
                            content = '\n'.join(lines)
                    
                    # Write updated content
                    ts_file.write_text(content, encoding='utf-8')
                    relative_path = ts_file.relative_to(frontend_dir)
                    print(f"✅ {relative_path} - Updated {patterns_found} patterns")
                    files_updated += 1
                    total_patterns_found += patterns_found
                    
            except Exception as e:
                print(f"❌ Error updating {ts_file}: {e}")
    
    print(f"\nUpdated {files_updated} files with {total_patterns_found} total patterns")
    
    # Test a few files to see if the imports work
    print("\nTesting import resolution...")
    test_files = [
        "app/api/health-check/route.ts",
        "app/api/restaurants/search/route.ts"
    ]
    
    for test_file in test_files:
        test_path = frontend_dir / test_file
        if test_path.exists():
            try:
                content = test_path.read_text(encoding='utf-8')
                if 'errorResponses' in content:
                    print(f"✅ {test_file} - errorResponses import found")
                else:
                    print(f"⚠️  {test_file} - errorResponses import missing")
            except Exception as e:
                print(f"❌ {test_file} - Error reading file: {e}")

if __name__ == "__main__":
    update_error_responses()
