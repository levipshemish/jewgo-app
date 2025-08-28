#!/usr/bin/env python3
"""
Script Validation Tool
=====================

This script validates all critical scripts in the JewGo project for:
- Syntax correctness
- Dependency availability
- Basic functionality
- Security compliance

Usage:
    python scripts/validate-scripts.py [--verbose] [--fix]
"""

import os
import sys
import subprocess
import importlib
import ast
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import argparse
import json

# Colors for output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'

def print_status(message: str, color: str = Colors.BLUE):
    """Print a status message with color."""
    print(f"{color}[INFO]{Colors.END} {message}")

def print_success(message: str):
    """Print a success message."""
    print(f"{Colors.GREEN}[SUCCESS]{Colors.END} {message}")

def print_warning(message: str):
    """Print a warning message."""
    print(f"{Colors.YELLOW}[WARNING]{Colors.END} {message}")

def print_error(message: str):
    """Print an error message."""
    print(f"{Colors.RED}[ERROR]{Colors.END} {message}")

def print_header(message: str):
    """Print a header message."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{message}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}")

class ScriptValidator:
    """Validates scripts for syntax, dependencies, and functionality."""
    
    def __init__(self, verbose: bool = False, fix: bool = False):
        self.verbose = verbose
        self.fix = fix
        self.errors = []
        self.warnings = []
        self.successes = []
        
        # Define script categories
        self.critical_scripts = {
            'python': [
                'scripts/utils/jewgo-cli.py',
                'scripts/maintenance/',
                'scripts/deployment/',
                'backend/scripts/',
            ],
            'node': [
                'scripts/env-consistency-check.js',
                'frontend/scripts/validate-env-unified.js',
                'frontend/scripts/deploy-validate.js',
                'ci-scripts/',
            ],
            'bash': [
                'scripts/validate-db-separation.sh',
                'scripts/deployment/',
                'ci-scripts/',
            ]
        }
    
    def validate_python_script(self, script_path: str) -> bool:
        """Validate a Python script for syntax and basic functionality."""
        try:
            # Check if file exists
            if not os.path.exists(script_path):
                self.errors.append(f"Script not found: {script_path}")
                return False
            
            # Validate syntax
            with open(script_path, 'r', encoding='utf-8') as f:
                source = f.read()
            
            # Parse AST to check syntax
            ast.parse(source)
            
            # Check for common issues
            issues = self._check_python_issues(source, script_path)
            if issues:
                self.warnings.extend(issues)
            
            if self.verbose:
                print_success(f"Python script validated: {script_path}")
            
            return True
            
        except SyntaxError as e:
            self.errors.append(f"Syntax error in {script_path}: {e}")
            return False
        except Exception as e:
            self.errors.append(f"Error validating {script_path}: {e}")
            return False
    
    def _check_python_issues(self, source: str, script_path: str) -> List[str]:
        """Check for common Python script issues."""
        issues = []
        
        # Check for hardcoded secrets
        secret_patterns = [
            'password', 'secret', 'token', 'key', 'api_key'
        ]
        
        lines = source.split('\n')
        for i, line in enumerate(lines, 1):
            line_lower = line.lower()
            for pattern in secret_patterns:
                if pattern in line_lower and '=' in line and not line.strip().startswith('#'):
                    if not any(env_var in line for env_var in ['os.environ', 'getenv', 'environ']):
                        issues.append(f"Potential hardcoded secret in {script_path}:{i}")
        
        # Check for proper imports
        if 'import requests' in source and 'timeout' not in source:
            issues.append(f"HTTP requests without timeout in {script_path}")
        
        # Check for error handling
        if 'requests.get(' in source and 'try:' not in source:
            issues.append(f"HTTP requests without error handling in {script_path}")
        
        return issues
    
    def validate_node_script(self, script_path: str) -> bool:
        """Validate a Node.js script for syntax."""
        try:
            if not os.path.exists(script_path):
                self.errors.append(f"Script not found: {script_path}")
                return False
            
            # Use node -c to check syntax
            result = subprocess.run(
                ['node', '-c', script_path],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                self.errors.append(f"Node.js syntax error in {script_path}: {result.stderr}")
                return False
            
            if self.verbose:
                print_success(f"Node.js script validated: {script_path}")
            
            return True
            
        except Exception as e:
            self.errors.append(f"Error validating {script_path}: {e}")
            return False
    
    def validate_bash_script(self, script_path: str) -> bool:
        """Validate a bash script for syntax."""
        try:
            if not os.path.exists(script_path):
                self.errors.append(f"Script not found: {script_path}")
                return False
            
            # Use bash -n to check syntax
            result = subprocess.run(
                ['bash', '-n', script_path],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                self.errors.append(f"Bash syntax error in {script_path}: {result.stderr}")
                return False
            
            # Check for execute permissions
            if not os.access(script_path, os.X_OK):
                self.warnings.append(f"Script not executable: {script_path}")
            
            if self.verbose:
                print_success(f"Bash script validated: {script_path}")
            
            return True
            
        except Exception as e:
            self.errors.append(f"Error validating {script_path}: {e}")
            return False
    
    def check_dependencies(self) -> bool:
        """Check if all required dependencies are available."""
        print_status("Checking script dependencies...")
        
        required_packages = [
            'requests', 'psycopg2', 'sqlalchemy', 'click', 'python-dotenv',
            'pandas', 'numpy', 'python-dateutil', 'pytz', 'pyyaml'
        ]
        
        missing_packages = []
        
        for package in required_packages:
            try:
                importlib.import_module(package)
                if self.verbose:
                    print_success(f"Package available: {package}")
            except ImportError:
                missing_packages.append(package)
                print_error(f"Missing package: {package}")
        
        if missing_packages:
            self.errors.append(f"Missing required packages: {', '.join(missing_packages)}")
            return False
        
        print_success("All required dependencies are available")
        return True
    
    def test_cli_functionality(self) -> bool:
        """Test basic CLI functionality."""
        print_status("Testing CLI functionality...")
        
        try:
            # Test help command
            result = subprocess.run(
                ['python', 'scripts/utils/jewgo-cli.py', '--help'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                self.errors.append(f"CLI help command failed: {result.stderr}")
                return False
            
            if self.verbose:
                print_success("CLI help command works")
            
            return True
            
        except subprocess.TimeoutExpired:
            self.errors.append("CLI help command timed out")
            return False
        except Exception as e:
            self.errors.append(f"CLI functionality test failed: {e}")
            return False
    
    def validate_all_scripts(self) -> bool:
        """Validate all critical scripts."""
        print_header("Validating All Scripts")
        
        all_valid = True
        
        # Validate Python scripts
        print_status("Validating Python scripts...")
        for script_path in self.critical_scripts['python']:
            if os.path.isdir(script_path):
                # Directory - find all Python files
                for root, dirs, files in os.walk(script_path):
                    for file in files:
                        if file.endswith('.py'):
                            full_path = os.path.join(root, file)
                            if not self.validate_python_script(full_path):
                                all_valid = False
            else:
                # Single file
                if not self.validate_python_script(script_path):
                    all_valid = False
        
        # Validate Node.js scripts
        print_status("Validating Node.js scripts...")
        for script_path in self.critical_scripts['node']:
            if os.path.isdir(script_path):
                # Directory - find all JavaScript files
                for root, dirs, files in os.walk(script_path):
                    for file in files:
                        if file.endswith('.js'):
                            full_path = os.path.join(root, file)
                            if not self.validate_node_script(full_path):
                                all_valid = False
            else:
                # Single file
                if not self.validate_node_script(script_path):
                    all_valid = False
        
        # Validate Bash scripts
        print_status("Validating Bash scripts...")
        for script_path in self.critical_scripts['bash']:
            if os.path.isdir(script_path):
                # Directory - find all shell scripts
                for root, dirs, files in os.walk(script_path):
                    for file in files:
                        if file.endswith(('.sh', '.bash')):
                            full_path = os.path.join(root, file)
                            if not self.validate_bash_script(full_path):
                                all_valid = False
            else:
                # Single file
                if not self.validate_bash_script(script_path):
                    all_valid = False
        
        return all_valid
    
    def generate_report(self) -> Dict:
        """Generate a validation report."""
        return {
            'timestamp': subprocess.run(['date', '-u'], capture_output=True, text=True).stdout.strip(),
            'total_errors': len(self.errors),
            'total_warnings': len(self.warnings),
            'total_successes': len(self.successes),
            'errors': self.errors,
            'warnings': self.warnings,
            'successes': self.successes
        }
    
    def print_report(self):
        """Print the validation report."""
        print_header("Validation Report")
        
        print(f"{Colors.BOLD}Summary:{Colors.END}")
        print(f"  Errors: {Colors.RED}{len(self.errors)}{Colors.END}")
        print(f"  Warnings: {Colors.YELLOW}{len(self.warnings)}{Colors.END}")
        print(f"  Successes: {Colors.GREEN}{len(self.successes)}{Colors.END}")
        
        if self.errors:
            print(f"\n{Colors.BOLD}{Colors.RED}Errors:{Colors.END}")
            for error in self.errors:
                print(f"  ❌ {error}")
        
        if self.warnings:
            print(f"\n{Colors.BOLD}{Colors.YELLOW}Warnings:{Colors.END}")
            for warning in self.warnings:
                print(f"  ⚠️  {warning}")
        
        if self.successes:
            print(f"\n{Colors.BOLD}{Colors.GREEN}Successes:{Colors.END}")
            for success in self.successes:
                print(f"  ✅ {success}")

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Validate JewGo scripts')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--fix', '-f', action='store_true', help='Attempt to fix issues')
    parser.add_argument('--report', '-r', action='store_true', help='Generate JSON report')
    parser.add_argument('--output', '-o', help='Output file for report')
    
    args = parser.parse_args()
    
    print_header("JewGo Script Validation Tool")
    
    validator = ScriptValidator(verbose=args.verbose, fix=args.fix)
    
    # Run all validations
    scripts_valid = validator.validate_all_scripts()
    dependencies_valid = validator.check_dependencies()
    cli_valid = validator.test_cli_functionality()
    
    # Generate and print report
    validator.print_report()
    
    # Generate JSON report if requested
    if args.report:
        report = validator.generate_report()
        report_json = json.dumps(report, indent=2)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(report_json)
            print_success(f"Report saved to {args.output}")
        else:
            print("\nJSON Report:")
            print(report_json)
    
    # Exit with appropriate code
    if not (scripts_valid and dependencies_valid and cli_valid):
        print_error("Script validation failed!")
        sys.exit(1)
    else:
        print_success("All script validations passed!")
        sys.exit(0)

if __name__ == '__main__':
    main()
