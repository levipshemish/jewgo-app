#!/usr/bin/env python3
"""
Code Duplication Analysis Script
================================

Analyzes the codebase for duplicated functions, classes, and code patterns.
Identifies opportunities for consolidation and refactoring.

Author: JewGo Development Team
Version: 1.0
"""

import os
import re
import ast
import hashlib
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict
import json

class CodeDuplicationAnalyzer:
    def __init__(self, root_dir: str = "."):
        self.root_dir = Path(root_dir)
        self.backend_dir = self.root_dir / "backend"
        self.frontend_dir = self.root_dir / "frontend"
        self.scripts_dir = self.root_dir / "scripts"
        
        # Results storage
        self.duplicate_functions = defaultdict(list)
        self.duplicate_classes = defaultdict(list)
        self.duplicate_code_blocks = defaultdict(list)
        self.similar_patterns = defaultdict(list)
        
    def analyze_codebase(self) -> Dict[str, Any]:
        """Main analysis function."""
        print("🔍 Analyzing codebase for duplications...")
        
        # Analyze Python files
        python_files = self._find_python_files()
        self._analyze_python_duplications(python_files)
        
        # Analyze JavaScript/TypeScript files
        js_files = self._find_js_files()
        self._analyze_js_duplications(js_files)
        
        # Generate report
        return self._generate_report()
    
    def _find_python_files(self) -> List[Path]:
        """Find all Python files in the codebase."""
        python_files = []
        for root, dirs, files in os.walk(self.root_dir):
            # Skip virtual environments, node_modules, and third-party packages
            if any(skip in root for skip in [
                '.venv', 'venv', 'node_modules', '__pycache__', 
                'site-packages', 'lib/python', 'playwright', 'torch',
                'urllib3', 'coverage', 'pytest'
            ]):
                continue
                
            for file in files:
                if file.endswith('.py'):
                    python_files.append(Path(root) / file)
        
        return python_files
    
    def _find_js_files(self) -> List[Path]:
        """Find all JavaScript/TypeScript files in the codebase."""
        js_files = []
        for root, dirs, files in os.walk(self.root_dir):
            # Skip node_modules and third-party packages
            if any(skip in root for skip in [
                'node_modules', 'site-packages', 'lib/python', 
                'playwright', 'torch', 'urllib3', 'coverage'
            ]):
                continue
                
            for file in files:
                if file.endswith(('.js', '.ts', '.tsx')):
                    js_files.append(Path(root) / file)
        
        return js_files
    
    def _analyze_python_duplications(self, files: List[Path]) -> None:
        """Analyze Python files for duplications."""
        print(f"📝 Analyzing {len(files)} Python files...")
        
        function_definitions = []
        class_definitions = []
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Parse AST
                tree = ast.parse(content)
                
                # Extract function definitions
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        func_hash = self._hash_function_ast(node)
                        function_definitions.append({
                            'name': node.name,
                            'file': str(file_path),
                            'line': node.lineno,
                            'hash': func_hash,
                            'code': ast.unparse(node)
                        })
                    
                    elif isinstance(node, ast.ClassDef):
                        class_hash = self._hash_class_ast(node)
                        class_definitions.append({
                            'name': node.name,
                            'file': str(file_path),
                            'line': node.lineno,
                            'hash': class_hash,
                            'code': ast.unparse(node)
                        })
                        
            except Exception as e:
                print(f"⚠️  Error parsing {file_path}: {e}")
        
        # Find duplicates
        self._find_duplicate_functions(function_definitions)
        self._find_duplicate_classes(class_definitions)
        
        # Find similar patterns
        self._find_similar_patterns(files)
    
    def _analyze_js_duplications(self, files: List[Path]) -> None:
        """Analyze JavaScript/TypeScript files for duplications."""
        print(f"⚛️  Analyzing {len(files)} JavaScript/TypeScript files...")
        
        function_definitions = []
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract function definitions using regex
                function_patterns = [
                    r'function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*\}',
                    r'const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\}',
                    r'(\w+)\s*\([^)]*\)\s*\{[^}]*\}'
                ]
                
                for pattern in function_patterns:
                    matches = re.finditer(pattern, content, re.DOTALL)
                    for match in matches:
                        func_name = match.group(1)
                        func_code = match.group(0)
                        func_hash = hashlib.md5(func_code.encode()).hexdigest()
                        
                        function_definitions.append({
                            'name': func_name,
                            'file': str(file_path),
                            'code': func_code,
                            'hash': func_hash
                        })
                        
            except Exception as e:
                print(f"⚠️  Error parsing {file_path}: {e}")
        
        # Find duplicates
        self._find_duplicate_functions(function_definitions)
    
    def _hash_function_ast(self, node: ast.FunctionDef) -> str:
        """Create a hash of function AST for comparison."""
        # Normalize the function by removing comments and docstrings
        normalized_code = ast.unparse(node)
        # Remove docstrings and comments
        normalized_code = re.sub(r'""".*?"""', '', normalized_code, flags=re.DOTALL)
        normalized_code = re.sub(r"'''.*?'''", '', normalized_code, flags=re.DOTALL)
        normalized_code = re.sub(r'#.*$', '', normalized_code, flags=re.MULTILINE)
        # Remove whitespace
        normalized_code = re.sub(r'\s+', ' ', normalized_code).strip()
        return hashlib.md5(normalized_code.encode()).hexdigest()
    
    def _hash_class_ast(self, node: ast.ClassDef) -> str:
        """Create a hash of class AST for comparison."""
        normalized_code = ast.unparse(node)
        normalized_code = re.sub(r'""".*?"""', '', normalized_code, flags=re.DOTALL)
        normalized_code = re.sub(r"'''.*?'''", '', normalized_code, flags=re.DOTALL)
        normalized_code = re.sub(r'#.*$', '', normalized_code, flags=re.MULTILINE)
        normalized_code = re.sub(r'\s+', ' ', normalized_code).strip()
        return hashlib.md5(normalized_code.encode()).hexdigest()
    
    def _find_duplicate_functions(self, functions: List[Dict]) -> None:
        """Find duplicate function definitions."""
        hash_groups = defaultdict(list)
        
        for func in functions:
            hash_groups[func['hash']].append(func)
        
        for func_hash, func_list in hash_groups.items():
            if len(func_list) > 1:
                self.duplicate_functions[func_hash] = func_list
    
    def _find_duplicate_classes(self, classes: List[Dict]) -> None:
        """Find duplicate class definitions."""
        hash_groups = defaultdict(list)
        
        for cls in classes:
            hash_groups[cls['hash']].append(cls)
        
        for class_hash, class_list in hash_groups.items():
            if len(class_list) > 1:
                self.duplicate_classes[class_hash] = class_list
    
    def _find_similar_patterns(self, files: List[Path]) -> None:
        """Find similar code patterns."""
        print("🔍 Looking for similar patterns...")
        
        # Common patterns to look for
        patterns = {
            'database_connection': r'create_engine\s*\(',
            'try_except': r'try:\s*\n.*?\nexcept\s+Exception',
            'logging': r'logger\.(info|debug|warning|error)\s*\(',
            'validation': r'def\s+\w*validate\w*\s*\(',
            'format_hours': r'def\s+\w*format\w*hours\w*\s*\(',
            'google_places': r'GooglePlaces',
            'cache_invalidation': r'invalidate.*cache',
        }
        
        for pattern_name, pattern in patterns.items():
            pattern_matches = []
            
            for file_path in files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    matches = re.finditer(pattern, content, re.MULTILINE | re.DOTALL)
                    for match in matches:
                        pattern_matches.append({
                            'file': str(file_path),
                            'line': content[:match.start()].count('\n') + 1,
                            'match': match.group(0)[:100] + '...' if len(match.group(0)) > 100 else match.group(0)
                        })
                        
                except Exception as e:
                    continue
            
            if len(pattern_matches) > 1:
                self.similar_patterns[pattern_name] = pattern_matches
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive duplication report."""
        report = {
            'summary': {
                'total_duplicate_functions': len(self.duplicate_functions),
                'total_duplicate_classes': len(self.duplicate_classes),
                'total_similar_patterns': len(self.similar_patterns),
            },
            'duplicate_functions': {},
            'duplicate_classes': {},
            'similar_patterns': {},
            'recommendations': []
        }
        
        # Process duplicate functions
        for func_hash, func_list in self.duplicate_functions.items():
            func_name = func_list[0]['name']
            report['duplicate_functions'][func_name] = {
                'count': len(func_list),
                'locations': [{'file': f['file'], 'line': f.get('line', 'N/A')} for f in func_list],
                'hash': func_hash
            }
        
        # Process duplicate classes
        for class_hash, class_list in self.duplicate_classes.items():
            class_name = class_list[0]['name']
            report['duplicate_classes'][class_name] = {
                'count': len(class_list),
                'locations': [{'file': c['file'], 'line': c.get('line', 'N/A')} for c in class_list],
                'hash': class_hash
            }
        
        # Process similar patterns
        for pattern_name, matches in self.similar_patterns.items():
            report['similar_patterns'][pattern_name] = {
                'count': len(matches),
                'locations': [{'file': m['file'], 'line': m['line']} for m in matches]
            }
        
        # Generate recommendations
        report['recommendations'] = self._generate_recommendations()
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations for fixing duplications."""
        recommendations = []
        
        # Function duplication recommendations
        for func_hash, func_list in self.duplicate_functions.items():
            if len(func_list) > 1:
                func_name = func_list[0]['name']
                files = [f['file'] for f in func_list]
                recommendations.append(
                    f"🔧 Consolidate duplicate function '{func_name}' found in {len(files)} files: {', '.join(files)}"
                )
        
        # Class duplication recommendations
        for class_hash, class_list in self.duplicate_classes.items():
            if len(class_list) > 1:
                class_name = class_list[0]['name']
                files = [c['file'] for c in class_list]
                recommendations.append(
                    f"🔧 Consolidate duplicate class '{class_name}' found in {len(files)} files: {', '.join(files)}"
                )
        
        # Pattern recommendations
        if 'validate_website_url' in [f[0]['name'] for f in self.duplicate_functions.values()]:
            recommendations.append(
                "🔧 Multiple 'validate_website_url' functions found. Consider creating a unified validator in utils/"
            )
        
        if 'format_hours' in self.similar_patterns:
            recommendations.append(
                "🔧 Multiple hours formatting functions found. Consider consolidating into a single HoursFormatter class"
            )
        
        if 'database_connection' in self.similar_patterns:
            recommendations.append(
                "🔧 Multiple database connection patterns found. Consider using the centralized ConnectionManager"
            )
        
        return recommendations
    
    def save_report(self, report: Dict[str, Any], output_file: str = "duplication_analysis_report.json") -> None:
        """Save the analysis report to a file."""
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"📄 Report saved to {output_file}")
    
    def print_summary(self, report: Dict[str, Any]) -> None:
        """Print a summary of the analysis."""
        print("\n" + "="*60)
        print("📊 DUPLICATION ANALYSIS SUMMARY")
        print("="*60)
        
        summary = report['summary']
        print(f"🔍 Total duplicate functions: {summary['total_duplicate_functions']}")
        print(f"🔍 Total duplicate classes: {summary['total_duplicate_classes']}")
        print(f"🔍 Total similar patterns: {summary['total_similar_patterns']}")
        
        if summary['total_duplicate_functions'] > 0:
            print("\n📝 DUPLICATE FUNCTIONS:")
            for func_name, details in report['duplicate_functions'].items():
                print(f"  • {func_name} ({details['count']} instances)")
                for loc in details['locations']:
                    print(f"    - {loc['file']}:{loc['line']}")
        
        if summary['total_duplicate_classes'] > 0:
            print("\n📝 DUPLICATE CLASSES:")
            for class_name, details in report['duplicate_classes'].items():
                print(f"  • {class_name} ({details['count']} instances)")
                for loc in details['locations']:
                    print(f"    - {loc['file']}:{loc['line']}")
        
        if summary['total_similar_patterns'] > 0:
            print("\n📝 SIMILAR PATTERNS:")
            for pattern_name, details in report['similar_patterns'].items():
                print(f"  • {pattern_name} ({details['count']} instances)")
        
        if report['recommendations']:
            print("\n💡 RECOMMENDATIONS:")
            for rec in report['recommendations']:
                print(f"  {rec}")


def main():
    """Main function to run the duplication analysis."""
    analyzer = CodeDuplicationAnalyzer()
    
    print("🧹 JewGo Code Duplication Analysis")
    print("="*50)
    
    # Run analysis
    report = analyzer.analyze_codebase()
    
    # Print summary
    analyzer.print_summary(report)
    
    # Save detailed report
    analyzer.save_report(report)
    
    print("\n✅ Analysis complete!")


if __name__ == "__main__":
    main()
