# !/usr/bin/env python3
"""
Script to fix remaining lint issues:
- W291: trailing whitespace
- W293: blank line contains whitespace
- E501: line too long (basic fixes)
"""

import os
import re
import glob


def fix_trailing_whitespace(content):
    """Remove trailing whitespace from lines."""
    lines = content.split("\n")
    fixed_lines = []
    for line in lines:
        # Remove trailing whitespace
        fixed_line = line.rstrip()
        fixed_lines.append(fixed_line)
    return "\n".join(fixed_lines)


def fix_blank_lines_with_whitespace(content):
    """Remove blank lines that contain only whitespace."""
    lines = content.split("\n")
    fixed_lines = []
    for line in lines:
        # Keep non-blank lines and truly empty lines, remove whitespace-only lines
        if line.strip() or line == "":
            fixed_lines.append(line)
    return "\n".join(fixed_lines)


def fix_long_lines_basic(content):
    """Basic fixes for long lines - break long strings and imports."""
    lines = content.split("\n")
    fixed_lines = []

    for line in lines:
        if len(line) > 88:
            # Try to fix common patterns
            if "import " in line and "," in line:
                # Split long imports
                if line.count(",") > 2:
                    parts = line.split(",")
                    if len(parts) > 3:
                        # Split into multiple lines
                        indent = len(line) - len(line.lstrip())
                        indent_str = " " * indent
                        fixed_line = parts[0] + ","
                        for part in parts[1:-1]:
                            fixed_line += "\n" + indent_str + part + ","
                        fixed_line += "\n" + indent_str + parts[-1]
                        fixed_lines.append(fixed_line)
                        continue

            # For long strings, try to break them
            if '"""' in line or "'''" in line:
                # Skip for now - complex string handling
                pass
            elif len(line) > 88 and "(" in line and ")" in line:
                # Try to break function calls
                if line.count("(") == 1 and line.count(")") == 1:
                    open_paren = line.find("(")
                    close_paren = line.rfind(")")
                    if open_paren < 80 and close_paren > 88:
                        indent = len(line) - len(line.lstrip())
                        indent_str = " " * (indent + 4)
                        before_paren = line[: open_paren + 1]
                        after_paren = line[close_paren:]
                        params = line[open_paren + 1 : close_paren]

                        if "," in params:
                            param_parts = [p.strip() for p in params.split(",")]
                            fixed_line = before_paren + "\n"
                            for i, part in enumerate(param_parts):
                                if i == len(param_parts) - 1:
                                    fixed_line += (
                                        indent_str
                                        + part
                                        + "\n"
                                        + " " * indent
                                        + after_paren
                                    )
                                else:
                                    fixed_line += indent_str + part + ",\n"
                            fixed_lines.append(fixed_line)
                            continue

        fixed_lines.append(line)

    return "\n".join(fixed_lines)


def process_file(filepath):
    """Process a single file to fix lint issues."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content

        # Apply fixes
        content = fix_trailing_whitespace(content)
        content = fix_blank_lines_with_whitespace(content)
        content = fix_long_lines_basic(content)

        # Only write if content changed
        if content != original_content:
            with open(filepath, "w", encoding="utf-8") as f:
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
    for root, dirs, files in os.walk("."):
        # Skip venv and cache directories
        dirs[:] = [d for d in dirs if d not in ["venv", ".venv", "__pycache__"]]

        for file in files:
            if file.endswith(".py"):
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
