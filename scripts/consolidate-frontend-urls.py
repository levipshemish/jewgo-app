#!/usr/bin/env python3
"""
Frontend URL Consolidation Script for JewGo App
==============================================

This script consolidates frontend URL patterns to eliminate duplication
and use the new centralized utilities.
"""

import os
import re
from pathlib import Path

def consolidate_frontend_urls():
    """Consolidate frontend URL patterns across the codebase."""
    frontend_dir = Path("frontend")
    
    # Define the patterns to replace and their replacements
    url_patterns = [
        # Pattern 1: Hardcoded localhost URLs
        (r"['\"]http://localhost:3000['\"]", "getFrontendAppUrl()"),
        (r"['\"]http://localhost:5000['\"]", "getBackendUrl()"),
        (r"['\"]http://localhost:8082['\"]", "getAlternativeBackendUrl()"),
        (r"['\"]http://localhost:8000['\"]", "getAlternativeBackendUrl()"),
        (r"['\"]http://127\.0\.0\.1:3000['\"]", "getFrontendAppUrl()"),
        (r"['\"]http://127\.0\.0\.1:8081['\"]", "getBackendUrl()"),
        
        # Pattern 2: Environment variable patterns
        (r"process\.env\[['\"]NEXT_PUBLIC_APP_URL['\"]\]\s*\|\|\s*['\"]http://localhost:3000['\"]", "getFrontendAppUrl()"),
        (r"process\.env\[['\"]NEXTAUTH_URL['\"]\]\s*\|\|\s*['\"]http://localhost:3000['\"]", "getFrontendAppUrl()"),
        (r"process\.env\[['\"]NEXT_PUBLIC_BACKEND_URL['\"]\]\s*\|\|\s*['\"]https://api\.jewgo\.app['\"]", "getBackendUrl()"),
        (r"process\.env\[['\"]NEXT_PUBLIC_BACKEND_URL['\"]\]\s*\|\|\s*['\"]http://localhost:5000['\"]", "getBackendUrl()"),
        (r"process\.env\[['\"]BACKEND_URL['\"]\]\s*\|\|\s*['\"]http://localhost:5000['\"]", "getAlternativeBackendUrl()"),
        (r"process\.env\[['\"]BACKEND_URL['\"]\]\s*\|\|\s*['\"]http://localhost:8082['\"]", "getAlternativeBackendUrl()"),
        
        # Pattern 3: Cloudinary URL patterns
        (r"`https://api\.cloudinary\.com/v1_1/\$\{process\.env\['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'\]\}/image/upload`", "getCloudinaryUrl()"),
        
        # Pattern 4: Production URL patterns
        (r"['\"]https://www\.jewgo\.app['\"]", "getFrontendAppUrl()"),
        (r"['\"]https://api\.jewgo\.app['\"]", "getBackendUrl()"),
    ]
    
    # Files to process (exclude node_modules, .next, etc.)
    exclude_patterns = [
        'node_modules',
        '.next',
        '.git',
        'coverage',
        'htmlcov',
        '__pycache__',
        '*.pyc',
        '*.pyo',
        '*.pyd',
        '.pytest_cache',
        '.mypy_cache',
        '.coverage',
        '*.log'
    ]
    
    files_updated = 0
    total_patterns_fixed = 0
    
    # Process all TypeScript/JavaScript files
    for file_path in frontend_dir.rglob("*"):
        if file_path.is_file() and file_path.suffix in ['.ts', '.tsx', '.js', '.jsx']:
            # Skip excluded directories
            if any(pattern in str(file_path) for pattern in exclude_patterns):
                continue
                
            try:
                content = file_path.read_text(encoding='utf-8')
                original_content = content
                patterns_fixed = 0
                
                # Apply all patterns
                for pattern, replacement in url_patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        content = re.sub(pattern, replacement, content)
                        patterns_found = len(matches)
                        patterns_fixed += patterns_found
                        print(f"  🔄 {pattern} -> {replacement} ({patterns_found} matches)")
                
                # Add import if we made changes and the file doesn't already import from the barrel export
                if content != original_content and patterns_fixed > 0:
                    # Check if we need to add the import
                    if any(replacement in content for _, replacement in url_patterns):
                        # Try to add import if not present
                        if 'import' in content and 'from' in content:
                            # Check if we need to add the barrel export import
                            if 'getFrontendAppUrl' in content and 'from' not in content:
                                # Find the best place to add the import
                                lines = content.split('\n')
                                import_index = 0
                                for i, line in enumerate(lines):
                                    if line.strip().startswith('import '):
                                        import_index = i + 1
                                    elif line.strip() and not line.strip().startswith('import '):
                                        break
                                
                                # Add the barrel export import
                                lines.insert(import_index, "import { getFrontendAppUrl, getBackendUrl, getAlternativeBackendUrl, getCloudinaryUrl } from '../../../lib';")
                                content = '\n'.join(lines)
                        
                        # Write updated content
                        file_path.write_text(content, encoding='utf-8')
                        relative_path = file_path.relative_to(frontend_dir)
                        print(f"✅ {relative_path} - Updated {patterns_fixed} patterns")
                        files_updated += 1
                        total_patterns_fixed += patterns_fixed
                        
            except Exception as e:
                print(f"❌ Error processing {file_path}: {e}")
    
    print(f"\n🎯 Frontend URL Consolidation Complete!")
    print(f"📁 Files Updated: {files_updated}")
    print(f"🔄 Total Patterns Fixed: {total_patterns_fixed}")
    
    # Test a few files to verify the changes
    print("\n🧪 Testing consolidation results...")
    test_files = [
        "components/search/AdvancedSearchBox.tsx",
        "lib/api/health.ts",
        "app/api/health-check/route.ts"
    ]
    
    for test_file in test_files:
        test_path = frontend_dir / test_file
        if test_path.exists():
            try:
                content = test_path.read_text(encoding='utf-8')
                if 'getFrontendAppUrl' in content or 'getBackendUrl' in content:
                    print(f"✅ {test_file} - Using consolidated utilities")
                else:
                    print(f"⚠️  {test_file} - May need manual review")
            except Exception as e:
                print(f"❌ {test_file} - Error reading file: {e}")

if __name__ == "__main__":
    consolidate_frontend_urls()
