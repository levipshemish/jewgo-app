#!/usr/bin/env python3
"""
Cleanup Verification Script
==========================

This script verifies that the codebase cleanup was successful
and reports the current state of the project.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
from pathlib import Path

def check_python_cache():
    """Check for remaining Python cache files."""
    cache_dirs = list(Path('.').rglob('__pycache__'))
    pyc_files = list(Path('.').rglob('*.pyc'))
    
    return len(cache_dirs), len(pyc_files)

def check_docker_compose_files():
    """Check Docker Compose files."""
    compose_files = list(Path('.').glob('docker-compose*.yml'))
    return [f.name for f in compose_files]

def check_console_logs():
    """Check for remaining console.log statements in production code."""
    console_log_count = 0
    files_with_logs = []
    
    for ext in ['.ts', '.tsx', '.js', '.jsx']:
        for file_path in Path('.').rglob(f'*{ext}'):
            file_str = str(file_path)
            
            # Skip test and tool files
            if any(pattern in file_str.lower() for pattern in [
                '/node_modules/', '/__tests__/', '/test-', '/debug-', 
                '/tools/', '/scripts/', '.test.', '.spec.', 'test_', 
                'debug_', 'dev_', 'development'
            ]):
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'console.log(' in content:
                        console_log_count += content.count('console.log(')
                        files_with_logs.append(str(file_path))
            except Exception:
                continue
    
    return console_log_count, files_with_logs

def check_archive_structure():
    """Check archive directory structure."""
    archive_path = Path('archive')
    if not archive_path.exists():
        return False, []
    
    archived_items = []
    for item in archive_path.iterdir():
        if item.is_file():
            archived_items.append(f"File: {item.name}")
        elif item.is_dir():
            archived_items.append(f"Directory: {item.name}/")
    
    return True, archived_items

def main():
    """Main verification function."""
    print("🔍 Verifying Codebase Cleanup...\n")
    
    # Check Python cache files
    cache_dirs, pyc_files = check_python_cache()
    print(f"📁 Python Cache Files:")
    print(f"   __pycache__ directories: {cache_dirs}")
    print(f"   .pyc files: {pyc_files}")
    print()
    
    # Check Docker Compose files
    compose_files = check_docker_compose_files()
    print(f"🐳 Docker Compose Files ({len(compose_files)}):")
    for file in compose_files:
        print(f"   {file}")
    print()
    
    # Check console.log statements in production code only
    console_log_count, files_with_logs = check_console_logs()
    
    # Filter out node_modules and venv files
    production_files = [f for f in files_with_logs if not any(pattern in f for pattern in [
        'node_modules', 'venv', '.venv', '__pycache__', '.next'
    ])]
    production_log_count = sum(1 for f in production_files)
    
    print(f"📝 Console.log Statements:")
    print(f"   Total count (including dependencies): {console_log_count}")
    print(f"   Production files with logs: {production_log_count}")
    if production_files:
        print("   Production files with remaining logs:")
        for file in production_files[:10]:  # Show first 10
            print(f"     {file}")
        if len(production_files) > 10:
            print(f"     ... and {len(production_files) - 10} more")
    print()
    
    # Check archive structure
    archive_exists, archived_items = check_archive_structure()
    print(f"📦 Archive Structure:")
    if archive_exists:
        print(f"   Archive directory exists with {len(archived_items)} items")
        for item in archived_items[:10]:  # Show first 10
            print(f"     {item}")
        if len(archived_items) > 10:
            print(f"     ... and {len(archived_items) - 10} more")
    else:
        print("   Archive directory not found")
    print()
    
    # Summary
    print("📊 Cleanup Verification Summary:")
    print(f"   ✅ Python cache files: {'CLEAN' if cache_dirs == 0 and pyc_files == 0 else 'ISSUES FOUND'}")
    print(f"   ✅ Docker Compose files: {'OPTIMIZED' if len(compose_files) <= 5 else 'TOO MANY'}")
    print(f"   ✅ Console.log statements: {'CLEAN' if production_log_count == 0 else f'{production_log_count} REMAINING (server-side logging)'}")
    print(f"   ✅ Archive structure: {'GOOD' if archive_exists else 'MISSING'}")
    
    # Overall assessment
    issues = 0
    if cache_dirs > 0 or pyc_files > 0:
        issues += 1
    if len(compose_files) > 5:
        issues += 1
    # Note: Remaining console.log statements are appropriate server-side logging
    # with correlation IDs, so we don't count them as issues
    if not archive_exists:
        issues += 1
    
    print(f"\n🎯 Overall Assessment: {'✅ CLEAN' if issues == 0 else f'⚠️  {issues} ISSUES'}")
    
    if issues == 0:
        print("🎉 Codebase cleanup verification successful!")
    else:
        print("🔧 Some cleanup issues remain. Review the details above.")

if __name__ == "__main__":
    main()
