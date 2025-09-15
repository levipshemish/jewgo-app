"""
Dependency checker to validate required packages are installed.
Provides clear error messages for missing dependencies.
"""

import sys
import importlib
from typing import List, Dict, Optional, Tuple
from utils.logging_config import get_logger

logger = get_logger(__name__)

class DependencyChecker:
    """Check for required and optional dependencies."""
    
    # Critical dependencies required for basic operation
    CRITICAL_DEPENDENCIES = {
        'flask': 'Flask web framework',
        'sqlalchemy': 'Database ORM',
        'psycopg2': 'PostgreSQL adapter',
        'redis': 'Redis client',
        'jwt': 'JWT token handling',
        'bcrypt': 'Password hashing',
        'requests': 'HTTP client library'
    }
    
    # Optional dependencies that enable additional features
    OPTIONAL_DEPENDENCIES = {
        'playwright': 'Web scraping functionality',
        'sendgrid': 'Email service integration',
        'prometheus_client': 'Metrics collection',
        'rediscluster': 'Redis cluster support',
        'celery': 'Background task processing'
    }
    
    def __init__(self):
        self.missing_critical = []
        self.missing_optional = []
        self.available_optional = []
    
    def check_dependency(self, package_name: str) -> Tuple[bool, Optional[str]]:
        """
        Check if a single dependency is available.
        
        Args:
            package_name: Name of the package to check
            
        Returns:
            Tuple of (is_available, error_message)
        """
        try:
            importlib.import_module(package_name)
            return True, None
        except ImportError as e:
            return False, str(e)
    
    def check_all_dependencies(self) -> Dict[str, any]:
        """
        Check all dependencies and return status report.
        
        Returns:
            Dictionary with dependency status information
        """
        logger.info("Checking application dependencies...")
        
        # Check critical dependencies
        for package, description in self.CRITICAL_DEPENDENCIES.items():
            is_available, error = self.check_dependency(package)
            if not is_available:
                self.missing_critical.append({
                    'package': package,
                    'description': description,
                    'error': error
                })
                logger.error(f"CRITICAL: Missing dependency {package} - {description}")
        
        # Check optional dependencies
        for package, description in self.OPTIONAL_DEPENDENCIES.items():
            is_available, error = self.check_dependency(package)
            if is_available:
                self.available_optional.append({
                    'package': package,
                    'description': description
                })
                logger.info(f"Optional dependency available: {package}")
            else:
                self.missing_optional.append({
                    'package': package,
                    'description': description,
                    'error': error
                })
                logger.warning(f"Optional dependency missing: {package} - {description}")
        
        return {
            'critical_missing': self.missing_critical,
            'optional_missing': self.missing_optional,
            'optional_available': self.available_optional,
            'all_critical_available': len(self.missing_critical) == 0
        }
    
    def get_installation_commands(self) -> Dict[str, List[str]]:
        """
        Get pip install commands for missing dependencies.
        
        Returns:
            Dictionary with install commands for missing packages
        """
        commands = {
            'critical': [],
            'optional': []
        }
        
        if self.missing_critical:
            critical_packages = [dep['package'] for dep in self.missing_critical]
            commands['critical'] = [
                f"pip install {' '.join(critical_packages)}",
                "# Or install from requirements.txt:",
                "pip install -r requirements.txt"
            ]
        
        if self.missing_optional:
            optional_packages = [dep['package'] for dep in self.missing_optional]
            commands['optional'] = [
                f"pip install {' '.join(optional_packages)}",
                "# Optional packages for enhanced functionality"
            ]
        
        return commands
    
    def validate_environment(self) -> bool:
        """
        Validate that the environment has all critical dependencies.
        
        Returns:
            True if environment is valid, False otherwise
        """
        status = self.check_all_dependencies()
        
        if not status['all_critical_available']:
            logger.error("Environment validation failed - missing critical dependencies")
            self.print_dependency_report()
            return False
        
        logger.info("Environment validation passed - all critical dependencies available")
        return True
    
    def print_dependency_report(self):
        """Print a formatted dependency report to console."""
        print("\n" + "="*60)
        print("DEPENDENCY STATUS REPORT")
        print("="*60)
        
        if self.missing_critical:
            print("\n❌ MISSING CRITICAL DEPENDENCIES:")
            for dep in self.missing_critical:
                print(f"  • {dep['package']}: {dep['description']}")
            
            print("\n🔧 TO FIX CRITICAL ISSUES:")
            commands = self.get_installation_commands()
            for cmd in commands['critical']:
                print(f"  {cmd}")
        
        if self.missing_optional:
            print("\n⚠️  MISSING OPTIONAL DEPENDENCIES:")
            for dep in self.missing_optional:
                print(f"  • {dep['package']}: {dep['description']}")
            
            print("\n🔧 TO ENABLE OPTIONAL FEATURES:")
            commands = self.get_installation_commands()
            for cmd in commands['optional']:
                print(f"  {cmd}")
        
        if self.available_optional:
            print("\n✅ AVAILABLE OPTIONAL FEATURES:")
            for dep in self.available_optional:
                print(f"  • {dep['package']}: {dep['description']}")
        
        print("\n" + "="*60)

def check_dependencies_on_startup():
    """
    Check dependencies during application startup.
    Exit if critical dependencies are missing.
    """
    checker = DependencyChecker()
    
    if not checker.validate_environment():
        print("\nCRITICAL: Cannot start application due to missing dependencies")
        sys.exit(1)
    
    # Log optional dependency status
    if checker.missing_optional:
        logger.warning(f"Running with {len(checker.missing_optional)} optional features disabled")
    
    if checker.available_optional:
        logger.info(f"Running with {len(checker.available_optional)} optional features enabled")

if __name__ == "__main__":
    # Allow running as standalone script
    checker = DependencyChecker()
    checker.check_all_dependencies()
    checker.print_dependency_report()