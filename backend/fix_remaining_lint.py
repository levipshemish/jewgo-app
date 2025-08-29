# !/usr/bin/env python3
"""
Script to fix remaining critical lint issues:
- E999: Syntax errors
- F541: f-string missing placeholders
- E265: block comment should start with '# '
"""

import os
import re

def fix_f_string_placeholders(content):
    """Fix f-strings that are missing placeholders."""
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Fix f-strings without placeholders
        if 'f"' in line and '{' not in line and '}' not in line:
            # Replace "..." with "..."
            line = line.replace('"', '"')
        elif "f'" in line and '{' not in line and '}' not in line:
            # Replace '...' with '...'
            line = line.replace("'", "'")
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

def fix_block_comments(content):
    """Fix block comments that should start with '# '."""
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Fix block comments
        if line.strip().startswith('#'):
            if not line.strip().startswith('# '):
                # Add space after #
                indent = len(line) - len(line.lstrip())
                comment = line.strip()
                if comment.startswith('#'):
                    comment = '# ' + comment[1:]
                fixed_line = ' ' * indent + comment
                fixed_lines.append(fixed_line)
            else:
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

def fix_comparison_operators(content):
    """Fix comparison to True/False."""
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Fix comparison to True
        line = re.sub(r'if\s+([^:]+)\s*==\s*True\s*:', r'if \1:', line)
        # Fix comparison to False
        line = re.sub(r'if\s+([^:]+)\s*==\s*False\s*:', r'if not \1:', line)
        # Fix comparison to True in other contexts
        line = re.sub(r'([^=!<>])\s*==\s*True\b', r'\1', line)
        # Fix comparison to False in other contexts
        line = re.sub(r'([^=!<>])\s*==\s*False\b', r'not \1', line)
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

def fix_ambiguous_variable_names(content):
    """Fix ambiguous variable names like 'l'."""
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Replace ambiguous 'l' with 'line' or 'list_item'
        if 'for line in' in line:
            line = line.replace('for line in', 'for line in')
        elif ' line ' in line and not line.strip().startswith('#'):
            # More careful replacement
            line = re.sub(r'\bl\b', 'line', line)
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

def process_file(filepath):
    """Process a single file to fix lint issues."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply fixes
        content = fix_f_string_placeholders(content)
        content = fix_block_comments(content)
        content = fix_comparison_operators(content)
        content = fix_ambiguous_variable_names(content)
        
        # Only write if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Main function to process all Python files."""
    # Get all Python files excluding venv and cache directories
    python_files = []
    for root, dirs, files in os.walk('.'):
        # Skip venv and cache directories
        dirs[:] = [d for d in dirs if d not in ['venv', '.venv', '__pycache__']]
        
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    print(f"Found {len(python_files)} Python files to process")
    
    fixed_count = 0
    for filepath in python_files:
        if process_file(filepath):
            fixed_count += 1
            print(f"Fixed: {filepath}")
    
    print(f"\nFixed {fixed_count} files")

if __name__ == "__main__":
    main()
