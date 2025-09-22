#!/usr/bin/env python3
"""
Migration Script: Consolidate Database Connection Managers
=========================================================

This script migrates the application from multiple database connection managers
to the new consolidated database manager. It provides:

- Safe migration with rollback capability
- Configuration validation
- Performance testing
- Health check verification
- Cache functionality testing

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import os
import sys
import time
import json
from typing import Dict, Any, List
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.logging_config import get_logger
from database.consolidated_db_manager import (
    ConsolidatedDatabaseManager,
    get_consolidated_db_manager,
    initialize_consolidated_db_manager
)

logger = get_logger(__name__)


class DatabaseMigrationManager:
    """Manages the migration to consolidated database manager."""
    
    def __init__(self):
        self.old_managers = []
        self.new_manager = None
        self.migration_log = []
        self.rollback_data = {}
        
    def discover_old_managers(self) -> List[str]:
        """Discover existing database managers."""
        managers = []
        
        # Check for various manager types
        manager_files = [
            'database_manager_v4.py',
            'database_manager_v5.py',
            'connection_manager.py',
            'unified_connection_manager.py'
        ]
        
        for manager_file in manager_files:
            manager_path = os.path.join(os.path.dirname(__file__), manager_file)
            if os.path.exists(manager_path):
                managers.append(manager_file)
                logger.info(f"Found existing manager: {manager_file}")
        
        return managers
    
    def backup_current_config(self) -> Dict[str, Any]:
        """Backup current database configuration."""
        config_backup = {
            'database_url': os.environ.get('DATABASE_URL'),
            'db_pool_size': os.environ.get('DB_POOL_SIZE'),
            'db_max_overflow': os.environ.get('DB_MAX_OVERFLOW'),
            'db_pool_timeout': os.environ.get('DB_POOL_TIMEOUT'),
            'db_pool_recycle': os.environ.get('DB_POOL_RECYCLE'),
            'redis_url': os.environ.get('REDIS_URL'),
            'db_cache_ttl': os.environ.get('DB_CACHE_TTL'),
            'db_slow_query_threshold': os.environ.get('DB_SLOW_QUERY_THRESHOLD'),
            'timestamp': datetime.now().isoformat()
        }
        
        self.rollback_data['config'] = config_backup
        logger.info("Database configuration backed up")
        return config_backup
    
    def validate_environment(self) -> bool:
        """Validate environment for migration."""
        logger.info("Validating environment for migration...")
        
        # Check required environment variables
        required_vars = ['DATABASE_URL']
        missing_vars = []
        
        for var in required_vars:
            if not os.environ.get(var):
                missing_vars.append(var)
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {missing_vars}")
            return False
        
        # Check database connectivity
        try:
            test_manager = ConsolidatedDatabaseManager()
            if not test_manager.connect():
                logger.error("Failed to connect to database")
                return False
            
            # Test basic query
            result = test_manager.execute_query("SELECT 1")
            if not result:
                logger.error("Database query test failed")
                return False
            
            test_manager.disconnect()
            logger.info("Environment validation successful")
            return True
            
        except Exception as e:
            logger.error(f"Environment validation failed: {e}")
            return False
    
    def test_performance(self) -> Dict[str, Any]:
        """Test performance of the new consolidated manager."""
        logger.info("Testing consolidated manager performance...")
        
        try:
            manager = ConsolidatedDatabaseManager()
            manager.connect()
            
            # Test queries
            test_queries = [
                "SELECT 1 as test",
                "SELECT NOW() as current_time",
                "SELECT version() as db_version"
            ]
            
            results = {}
            total_time = 0
            
            for i, query in enumerate(test_queries):
                start_time = time.time()
                result = manager.execute_query(query)
                duration = time.time() - start_time
                total_time += duration
                
                results[f'query_{i+1}'] = {
                    'query': query,
                    'duration_ms': duration * 1000,
                    'result_count': len(result) if isinstance(result, list) else 1
                }
            
            # Test caching
            cache_test_query = "SELECT 'cache_test' as test_value"
            
            # First execution (cache miss)
            start_time = time.time()
            result1 = manager.execute_query(cache_test_query, use_cache=True)
            first_duration = time.time() - start_time
            
            # Second execution (cache hit)
            start_time = time.time()
            result2 = manager.execute_query(cache_test_query, use_cache=True)
            second_duration = time.time() - start_time
            
            cache_performance = {
                'first_execution_ms': first_duration * 1000,
                'second_execution_ms': second_duration * 1000,
                'cache_speedup': first_duration / second_duration if second_duration > 0 else 0
            }
            
            # Health check
            health_status = manager.health_check()
            
            # Performance metrics
            performance_metrics = manager.get_performance_metrics()
            
            manager.disconnect()
            
            test_results = {
                'queries': results,
                'cache_performance': cache_performance,
                'health_status': health_status,
                'performance_metrics': performance_metrics,
                'total_test_time_ms': total_time * 1000,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info("Performance testing completed successfully")
            return test_results
            
        except Exception as e:
            logger.error(f"Performance testing failed: {e}")
            return {'error': str(e)}
    
    def migrate_app_configuration(self) -> bool:
        """Migrate application configuration to use consolidated manager."""
        logger.info("Migrating application configuration...")
        
        try:
            # Update app.py to use consolidated manager
            app_py_path = os.path.join(os.path.dirname(__file__), '..', 'app.py')
            
            if os.path.exists(app_py_path):
                # Read current app.py
                with open(app_py_path, 'r') as f:
                    app_content = f.read()
                
                # Backup original
                backup_path = f"{app_py_path}.backup.{int(time.time())}"
                with open(backup_path, 'w') as f:
                    f.write(app_content)
                
                self.rollback_data['app_py_backup'] = backup_path
                
                # Replace connection manager imports and initialization
                old_imports = [
                    "from database.unified_connection_manager import UnifiedConnectionManager",
                    "from cache.redis_manager_v5 import RedisManagerV5"
                ]
                
                new_imports = [
                    "from database.consolidated_db_manager import get_consolidated_db_manager"
                ]
                
                # Replace initialization code
                old_init = """# Import real database connection managers with correct class names
    from database.unified_connection_manager import UnifiedConnectionManager
    from cache.redis_manager_v5 import RedisManagerV5
    
    # Initialize real database connection
    connection_manager = UnifiedConnectionManager()
    redis_manager = RedisManagerV5()
    
    # IMPORTANT: Connect to the database
    print('Connecting to database...')
    connection_manager.connect()
    print('SUCCESS: Database connected')
    
    print('SUCCESS: Real database services initialized')
    
    # Initialize services with real database connections
    from routes.v5.api_v5 import init_services
    init_services(connection_manager, redis_manager)
    print('SUCCESS: Services initialized with real database')"""
                
                new_init = """# Import consolidated database manager
    from database.consolidated_db_manager import get_consolidated_db_manager
    
    # Initialize consolidated database manager
    connection_manager = get_consolidated_db_manager()
    print('SUCCESS: Consolidated database manager initialized')
    
    # Initialize services with consolidated manager
    from routes.v5.api_v5 import init_services
    init_services(connection_manager, None)  # Redis handled internally
    print('SUCCESS: Services initialized with consolidated database manager')"""
                
                # Apply replacements
                updated_content = app_content
                updated_content = updated_content.replace(old_init, new_init)
                
                # Write updated app.py
                with open(app_py_path, 'w') as f:
                    f.write(updated_content)
                
                logger.info("Application configuration migrated successfully")
                return True
            else:
                logger.warning("app.py not found, skipping application configuration migration")
                return True
                
        except Exception as e:
            logger.error(f"Failed to migrate application configuration: {e}")
            return False
    
    def create_migration_report(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Create comprehensive migration report."""
        report = {
            'migration_timestamp': datetime.now().isoformat(),
            'migration_status': 'completed',
            'old_managers_found': self.discover_old_managers(),
            'environment_validation': self.validate_environment(),
            'performance_test_results': test_results,
            'configuration_backup': self.rollback_data.get('config', {}),
            'recommendations': self._generate_recommendations(test_results)
        }
        
        return report
    
    def _generate_recommendations(self, test_results: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on test results."""
        recommendations = []
        
        if 'error' in test_results:
            recommendations.append("Migration failed - check error logs and retry")
            return recommendations
        
        # Performance recommendations
        if test_results.get('cache_performance', {}).get('cache_speedup', 0) > 2:
            recommendations.append("Cache is working effectively - consider enabling for more queries")
        
        health_status = test_results.get('health_status', {}).get('status', 'unknown')
        if health_status == 'healthy':
            recommendations.append("Database health is good - migration successful")
        elif health_status == 'degraded':
            recommendations.append("Database performance is degraded - monitor closely")
        else:
            recommendations.append("Database health issues detected - investigate before proceeding")
        
        # Configuration recommendations
        recommendations.extend([
            "Update all service files to use get_consolidated_db_manager()",
            "Remove old connection manager imports from service files",
            "Test all API endpoints after migration",
            "Monitor database performance metrics",
            "Consider enabling query caching for frequently accessed data"
        ])
        
        return recommendations
    
    def rollback_migration(self) -> bool:
        """Rollback migration if needed."""
        logger.info("Rolling back migration...")
        
        try:
            # Restore app.py backup
            if 'app_py_backup' in self.rollback_data:
                backup_path = self.rollback_data['app_py_backup']
                app_py_path = os.path.join(os.path.dirname(__file__), '..', 'app.py')
                
                if os.path.exists(backup_path):
                    with open(backup_path, 'r') as f:
                        original_content = f.read()
                    
                    with open(app_py_path, 'w') as f:
                        f.write(original_content)
                    
                    logger.info("Application configuration rolled back")
            
            # Restore environment variables if needed
            if 'config' in self.rollback_data:
                logger.info("Environment configuration backup available for manual restoration")
            
            logger.info("Migration rollback completed")
            return True
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return False


def main():
    """Main migration function."""
    logger.info("Starting database connection manager consolidation migration")
    
    migration_manager = DatabaseMigrationManager()
    
    try:
        # Step 1: Backup current configuration
        logger.info("Step 1: Backing up current configuration")
        migration_manager.backup_current_config()
        
        # Step 2: Validate environment
        logger.info("Step 2: Validating environment")
        if not migration_manager.validate_environment():
            logger.error("Environment validation failed - aborting migration")
            return False
        
        # Step 3: Test new consolidated manager
        logger.info("Step 3: Testing consolidated manager performance")
        test_results = migration_manager.test_performance()
        
        if 'error' in test_results:
            logger.error(f"Performance testing failed: {test_results['error']}")
            return False
        
        # Step 4: Migrate application configuration
        logger.info("Step 4: Migrating application configuration")
        if not migration_manager.migrate_app_configuration():
            logger.error("Configuration migration failed - rolling back")
            migration_manager.rollback_migration()
            return False
        
        # Step 5: Generate migration report
        logger.info("Step 5: Generating migration report")
        report = migration_manager.create_migration_report(test_results)
        
        # Save report
        report_path = f"/tmp/db_migration_report_{int(time.time())}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Migration completed successfully! Report saved to: {report_path}")
        
        # Print summary
        print("\n" + "="*60)
        print("DATABASE MIGRATION SUMMARY")
        print("="*60)
        print(f"Status: {'SUCCESS' if report['migration_status'] == 'completed' else 'FAILED'}")
        print(f"Old managers found: {len(report['old_managers_found'])}")
        print(f"Environment validation: {'PASSED' if report['environment_validation'] else 'FAILED'}")
        
        if 'performance_test_results' in report and 'error' not in report['performance_test_results']:
            perf = report['performance_test_results']
            print(f"Cache speedup: {perf.get('cache_performance', {}).get('cache_speedup', 0):.2f}x")
            print(f"Health status: {perf.get('health_status', {}).get('status', 'unknown')}")
        
        print("\nRecommendations:")
        for rec in report.get('recommendations', []):
            print(f"  - {rec}")
        
        print(f"\nDetailed report: {report_path}")
        print("="*60)
        
        return True
        
    except Exception as e:
        logger.error(f"Migration failed with error: {e}")
        migration_manager.rollback_migration()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)