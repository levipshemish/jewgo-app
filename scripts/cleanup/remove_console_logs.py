#!/usr/bin/env python3
"""
Console Log Cleanup Script
==========================

This script removes console.log statements from production code files
while preserving important logging in development and test files.

Author: JewGo Development Team
Version: 1.0
"""

import os
import re
import sys
from pathlib import Path

def should_skip_file(file_path: str) -> bool:
    """Check if file should be skipped (test, dev, or tool files)."""
    skip_patterns = [
        '/node_modules/',
        '/__tests__/',
        '/test-',
        '/debug-',
        '/tools/',
        '/scripts/',
        '.test.',
        '.spec.',
        'test_',
        'debug_',
        'dev_',
        'development'
    ]
    
    file_path_lower = file_path.lower()
    return any(pattern in file_path_lower for pattern in skip_patterns)

def remove_console_logs(file_path: str) -> bool:
    """Remove console.log statements from a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remove console.log statements with various patterns
        patterns = [
            # Basic console.log
            r'^\s*console\.log\([^)]*\);\s*$',
            # console.log with trailing comments
            r'^\s*console\.log\([^)]*\);\s*//.*$',
            # console.log with leading comments
            r'^\s*//.*console\.log\([^)]*\);\s*$',
            # console.log in JSX/TSX
            r'^\s*\{console\.log\([^)]*\)\}\s*$',
            # console.log with template literals
            r'^\s*console\.log\(`[^`]*`\);\s*$',
        ]
        
        for pattern in patterns:
            content = re.sub(pattern, '', content, flags=re.MULTILINE)
        
        # Remove empty lines that might be left
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            if line.strip() or not cleaned_lines or cleaned_lines[-1].strip():
                cleaned_lines.append(line)
        
        content = '\n'.join(cleaned_lines)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main cleanup function."""
    # Get the project root
    project_root = Path(__file__).parent.parent.parent
    
    # Files to process
    file_extensions = ['.ts', '.tsx', '.js', '.jsx']
    
    files_processed = 0
    files_modified = 0
    
    print("🔍 Scanning for console.log statements...")
    
    for ext in file_extensions:
        for file_path in project_root.rglob(f'*{ext}'):
            file_str = str(file_path)
            
            # Skip certain directories and files
            if should_skip_file(file_str):
                continue
            
            files_processed += 1
            
            if remove_console_logs(file_str):
                files_modified += 1
                print(f"✅ Cleaned: {file_path.relative_to(project_root)}")
    
    print(f"\n📊 Cleanup Summary:")
    print(f"   Files processed: {files_processed}")
    print(f"   Files modified: {files_modified}")
    print(f"   Files unchanged: {files_processed - files_modified}")

if __name__ == "__main__":
    main()
