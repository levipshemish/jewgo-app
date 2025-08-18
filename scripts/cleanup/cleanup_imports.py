#!/usr/bin/env python3
"""Import Statement Cleanup Script.
================================

This script cleans up import statements across the JewGo backend codebase:
1. Removes unused structlog imports (replaced by unified logging)
2. Organizes imports using isort standards
3. Removes other unused imports
4. Standardizes import patterns

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Set, Tuple

# Add backend to path for imports
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from utils.logging_config import get_logger

logger = get_logger(__name__)


class ImportCleaner:
    """Clean up import statements in Python files."""
    
    def __init__(self, backend_dir: str = "backend"):
        self.backend_dir = Path(backend_dir)
        self.files_processed = 0
        self.files_modified = 0
        self.imports_removed = 0
        
    def find_python_files(self) -> List[Path]:
        """Find all Python files in the backend directory."""
        python_files = []
        for root, dirs, files in os.walk(self.backend_dir):
            # Skip virtual environments and cache directories
            dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__' and 'venv' not in d]
            
            for file in files:
                if file.endswith('.py'):
                    python_files.append(Path(root) / file)
        
        return python_files
    
    def clean_structlog_imports(self, content: str) -> Tuple[str, int]:
        """
        Remove unused structlog imports and replace with unified logging.
        
        Args:
            content: File content as string
            
        Returns:
            Tuple of (cleaned_content, number_of_changes)
        """
        changes = 0
        
        # Pattern to match structlog import statements
        structlog_patterns = [
            # Simple import structlog
            r'^import structlog\s*$',
            # from structlog import ...
            r'^from structlog import .*$',
            # structlog.configure(...) blocks
            r'# Configure.*logging.*\nstructlog\.configure\([^)]*\)\s*$',
            # logger = structlog.get_logger()
            r'^logger = structlog\.get_logger\(\)\s*$',
            r'^logger = structlog\.get_logger\(.*\)\s*$',
        ]
        
        lines = content.split('\n')
        cleaned_lines = []
        i = 0
        
        while i < len(lines):
            line = lines[i]
            skip_line = False
            
            # Check for structlog import patterns
            for pattern in structlog_patterns:
                if re.match(pattern, line.strip()):
                    skip_line = True
                    changes += 1
                    break
            
            # Check for structlog.configure blocks
            if 'structlog.configure(' in line:
                # Skip the entire configure block
                skip_line = True
                changes += 1
                # Find the end of the configure block
                while i < len(lines) and ')' not in lines[i]:
                    i += 1
                    changes += 1
                continue
            
            if not skip_line:
                cleaned_lines.append(line)
            i += 1
        
        # Add unified logging import if we removed structlog imports
        if changes > 0:
            # Find the right place to add the import
            import_section_end = 0
            for i, line in enumerate(cleaned_lines):
                if line.strip().startswith('import ') or line.strip().startswith('from '):
                    import_section_end = i + 1
                elif line.strip() and not line.startswith('#'):
                    break
            
            # Add unified logging import
            unified_import = 'from utils.logging_config import get_logger\n\nlogger = get_logger(__name__)\n'
            cleaned_lines.insert(import_section_end, unified_import)
        
        return '\n'.join(cleaned_lines), changes
    
    def organize_imports(self, content: str) -> str:
        """
        Organize imports according to isort standards.
        
        Args:
            content: File content as string
            
        Returns:
            Organized content
        """
        lines = content.split('\n')
        imports = []
        other_lines = []
        in_import_section = False
        
        for line in lines:
            stripped = line.strip()
            
            # Detect import section
            if stripped.startswith('import ') or stripped.startswith('from '):
                in_import_section = True
                imports.append(line)
            elif in_import_section and stripped == '':
                imports.append(line)
            elif in_import_section and not stripped.startswith('#'):
                in_import_section = False
                other_lines.append(line)
            else:
                other_lines.append(line)
        
        # Sort imports (basic sorting - in production, use isort)
        stdlib_imports = []
        third_party_imports = []
        local_imports = []
        
        for imp in imports:
            if imp.strip().startswith('from .') or imp.strip().startswith('import .'):
                local_imports.append(imp)
            elif any(pkg in imp for pkg in ['flask', 'sqlalchemy', 'requests', 'structlog', 'redis']):
                third_party_imports.append(imp)
            else:
                stdlib_imports.append(imp)
        
        # Combine organized imports
        organized_imports = stdlib_imports + [''] + third_party_imports + [''] + local_imports
        
        return '\n'.join(organized_imports + other_lines)
    
    def remove_unused_imports(self, content: str) -> Tuple[str, int]:
        """
        Remove obviously unused imports.
        
        Args:
            content: File content as string
            
        Returns:
            Tuple of (cleaned_content, number_of_changes)
        """
        changes = 0
        
        # Common unused imports to remove
        unused_patterns = [
            r'^import builtins\s*$',
            r'^import contextlib\s*$',
            r'^from builtins import .*$',
            r'^from contextlib import .*$',
        ]
        
        lines = content.split('\n')
        cleaned_lines = []
        
        for line in lines:
            skip_line = False
            
            for pattern in unused_patterns:
                if re.match(pattern, line.strip()):
                    skip_line = True
                    changes += 1
                    break
            
            if not skip_line:
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines), changes
    
    def process_file(self, file_path: Path) -> bool:
        """
        Process a single Python file.
        
        Args:
            file_path: Path to the Python file
            
        Returns:
            True if file was modified, False otherwise
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            total_changes = 0
            
            # Clean structlog imports
            content, changes = self.clean_structlog_imports(content)
            total_changes += changes
            
            # Remove unused imports
            content, changes = self.remove_unused_imports(content)
            total_changes += changes
            
            # Organize imports
            content = self.organize_imports(content)
            
            # Write back if changed
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.files_modified += 1
                self.imports_removed += total_changes
                
                logger.info(
                    "Cleaned imports",
                    file=str(file_path),
                    changes=total_changes
                )
                return True
            
            return False
            
        except Exception as e:
            logger.error(
                "Error processing file",
                file=str(file_path),
                error=str(e)
            )
            return False
    
    def run(self) -> None:
        """Run the import cleanup process."""
        logger.info("Starting import cleanup process")
        
        python_files = self.find_python_files()
        logger.info(f"Found {len(python_files)} Python files to process")
        
        for file_path in python_files:
            self.files_processed += 1
            self.process_file(file_path)
        
        logger.info(
            "Import cleanup completed",
            files_processed=self.files_processed,
            files_modified=self.files_modified,
            imports_removed=self.imports_removed
        )


def main():
    """Main function to run the import cleanup."""
    cleaner = ImportCleaner()
    cleaner.run()


if __name__ == "__main__":
    main()
