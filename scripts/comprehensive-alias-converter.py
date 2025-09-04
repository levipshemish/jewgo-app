#!/usr/bin/env python3
"""
Comprehensive Import Path Alias Converter
Converts all remaining relative import paths to use the @/lib alias

This script systematically finds and fixes all remaining relative import paths
in the frontend API routes and other files, converting them to use the reliable
@/lib alias instead of problematic relative paths.
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple, Dict, Set

class ImportPathConverter:
    def __init__(self, frontend_dir: str = "frontend"):
        self.frontend_dir = Path(frontend_dir)
        self.api_dir = self.frontend_dir / "app" / "api"
        self.lib_dir = self.frontend_dir / "lib"
        
        # Track conversion statistics
        self.stats = {
            "files_processed": 0,
            "files_modified": 0,
            "imports_converted": 0,
            "errors": 0
        }
        
        # Common import patterns to convert
        self.import_patterns = [
            # Relative path patterns
            (r'from\s+[\'"](\.\.\/)+lib', 'from \'@/lib'),
            (r'from\s+[\'"](\.\.\/)+lib', 'from "@/lib'),
            
            # Specific module patterns
            (r'from\s+[\'"](\.\.\/)+lib\/admin', 'from \'@/lib/admin'),
            (r'from\s+[\'"](\.\.\/)+lib\/server', 'from \'@/lib/server'),
            (r'from\s+[\'"](\.\.\/)+lib\/utils', 'from \'@/lib/utils'),
            (r'from\s+[\'"](\.\.\/)+lib\/config', 'from \'@/lib/config'),
            (r'from\s+[\'"](\.\.\/)+lib\/supabase', 'from \'@/lib/supabase'),
            (r'from\s+[\'"](\.\.\/)+lib\/constants', 'from \'@/lib/constants'),
            (r'from\s+[\'"](\.\.\/)+lib\/types', 'from \'@/lib/types'),
            (r'from\s+[\'"](\.\.\/)+lib\/auth', 'from \'@/lib/auth'),
            (r'from\s+[\'"](\.\.\/)+lib\/db', 'from \'@/lib/db'),
            (r'from\s+[\'"](\.\.\/)+lib\/rate-limiting', 'from \'@/lib/rate-limiting'),
            
            # Double quote versions
            (r'from\s+[\'"](\.\.\/)+lib\/admin', 'from "@/lib/admin'),
            (r'from\s+[\'"](\.\.\/)+lib\/server', 'from "@/lib/server'),
            (r'from\s+[\'"](\.\.\/)+lib\/utils', 'from "@/lib/utils'),
            (r'from\s+[\'"](\.\.\/)+lib\/config', 'from "@/lib/config'),
            (r'from\s+[\'"](\.\.\/)+lib\/supabase', 'from "@/lib/supabase'),
            (r'from\s+[\'"](\.\.\/)+lib\/constants', 'from "@/lib/constants'),
            (r'from\s+[\'"](\.\.\/)+lib\/types', 'from "@/lib/types'),
            (r'from\s+[\'"](\.\.\/)+lib\/auth', 'from "@/lib/auth'),
            (r'from\s+[\'"](\.\.\/)+lib\/db', 'from "@/lib/db'),
            (r'from\s+[\'"](\.\.\/)+lib\/rate-limiting', 'from "@/lib/rate-limiting'),
        ]
        
        # Dynamic import patterns
        self.dynamic_import_patterns = [
            (r'await\s+import\([\'"](\.\.\/)+lib', 'await import(\'@/lib'),
            (r'await\s+import\([\'"](\.\.\/)+lib', 'await import("@/lib'),
        ]

    def find_files_to_process(self) -> List[Path]:
        """Find all TypeScript/JavaScript files that need processing."""
        files = []
        
        # Process API routes
        if self.api_dir.exists():
            for file_path in self.api_dir.rglob("*.ts"):
                if file_path.is_file():
                    files.append(file_path)
        
        # Process other frontend files
        for file_path in self.frontend_dir.rglob("*.ts"):
            if file_path.is_file() and file_path.suffix in ['.ts', '.tsx']:
                # Skip node_modules and other excluded directories
                if not any(part.startswith('.') or part in ['node_modules', 'dist', 'build'] 
                          for part in file_path.parts):
                    files.append(file_path)
        
        return files

    def convert_import_paths(self, file_path: Path) -> bool:
        """Convert import paths in a single file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            modified = False
            
            # Convert static imports
            for pattern, replacement in self.import_patterns:
                if re.search(pattern, content):
                    content = re.sub(pattern, replacement, content)
                    modified = True
            
            # Convert dynamic imports
            for pattern, replacement in self.dynamic_import_patterns:
                if re.search(pattern, content):
                    content = re.sub(pattern, replacement, content)
                    modified = True
            
            # Write back if modified
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.stats["files_modified"] += 1
                self.stats["imports_converted"] += 1
                print(f"✅ Modified: {file_path.relative_to(self.frontend_dir)}")
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
            self.stats["errors"] += 1
            return False

    def validate_conversions(self) -> Dict[str, int]:
        """Validate that all conversions were successful."""
        remaining_patterns = {
            "relative_lib_imports": 0,
            "dynamic_imports": 0
        }
        
        for file_path in self.find_files_to_process():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check for remaining relative lib imports
                if re.search(r'from\s+[\'"](\.\.\/)+lib', content):
                    remaining_patterns["relative_lib_imports"] += 1
                
                # Check for remaining dynamic imports
                if re.search(r'await\s+import\([\'"](\.\.\/)+lib', content):
                    remaining_patterns["dynamic_imports"] += 1
                    
            except Exception:
                continue
        
        return remaining_patterns

    def run_conversion(self) -> None:
        """Run the complete conversion process."""
        print("🚀 Starting Comprehensive Import Path Conversion...")
        print(f"📁 Processing files in: {self.frontend_dir}")
        print(f"📁 API directory: {self.api_dir}")
        print(f"📁 Lib directory: {self.lib_dir}")
        print("-" * 60)
        
        # Find files to process
        files = self.find_files_to_process()
        print(f"📋 Found {len(files)} files to process")
        
        # Process each file
        for file_path in files:
            self.stats["files_processed"] += 1
            self.convert_import_paths(file_path)
        
        # Validation
        print("-" * 60)
        print("🔍 Validating conversions...")
        remaining = self.validate_conversions()
        
        # Print results
        print("-" * 60)
        print("📊 CONVERSION RESULTS:")
        print(f"   Files processed: {self.stats['files_processed']}")
        print(f"   Files modified: {self.stats['files_modified']}")
        print(f"   Imports converted: {self.stats['imports_converted']}")
        print(f"   Errors: {self.stats['errors']}")
        print(f"   Remaining relative lib imports: {remaining['relative_lib_imports']}")
        print(f"   Remaining dynamic imports: {remaining['dynamic_imports']}")
        
        if remaining['relative_lib_imports'] == 0 and remaining['dynamic_imports'] == 0:
            print("🎉 SUCCESS: All import paths converted!")
        else:
            print("⚠️  WARNING: Some import paths may still need manual attention")
        
        print("-" * 60)

def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        frontend_dir = sys.argv[1]
    else:
        frontend_dir = "frontend"
    
    if not Path(frontend_dir).exists():
        print(f"❌ Error: Directory '{frontend_dir}' not found")
        sys.exit(1)
    
    converter = ImportPathConverter(frontend_dir)
    converter.run_conversion()

if __name__ == "__main__":
    main()
