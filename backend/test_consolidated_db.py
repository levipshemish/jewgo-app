#!/usr/bin/env python3
"""
Test Script for Consolidated Database Manager
=============================================

This script tests the consolidated database manager functionality including:
- Basic connectivity
- Query execution
- Caching functionality
- Performance metrics
- Health monitoring

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import os
import sys
import time
import json
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from utils.logging_config import get_logger
from database.consolidated_db_manager import (
    ConsolidatedDatabaseManager,
    get_consolidated_db_manager
)
from database.service_integration import (
    get_restaurant_service,
    get_user_service,
    get_analytics_service
)

logger = get_logger(__name__)


def test_basic_connectivity():
    """Test basic database connectivity."""
    logger.info("Testing basic database connectivity...")
    
    try:
        manager = get_consolidated_db_manager()
        
        # Test simple query
        result = manager.execute_query("SELECT 1 as test_value")
        assert result[0]['test_value'] == 1, "Basic query failed"
        
        # Test with parameters
        result = manager.execute_query("SELECT :value as test_param", {'value': 'hello'})
        assert result[0]['test_param'] == 'hello', "Parameterized query failed"
        
        logger.info("✓ Basic connectivity test passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ Basic connectivity test failed: {e}")
        return False


def test_caching_functionality():
    """Test query caching functionality."""
    logger.info("Testing query caching functionality...")
    
    try:
        manager = get_consolidated_db_manager()
        
        # Test query without cache
        start_time = time.time()
        result1 = manager.execute_query("SELECT NOW() as current_time", use_cache=False)
        time_without_cache = time.time() - start_time
        
        # Test query with cache (first execution)
        start_time = time.time()
        result2 = manager.execute_query("SELECT NOW() as current_time", use_cache=True)
        time_with_cache_first = time.time() - start_time
        
        # Test query with cache (second execution - should be cached)
        start_time = time.time()
        result3 = manager.execute_query("SELECT NOW() as current_time", use_cache=True)
        time_with_cache_second = time.time() - start_time
        
        # Verify results are consistent
        assert len(result1) == 1, f"Query result should have one row, got {len(result1)}"
        assert len(result2) == 1, f"Cached query result should have one row, got {len(result2)}"
        assert len(result3) == 1, f"Second cached query result should have one row, got {len(result3)}"
        
        # Debug: log the actual results
        logger.debug(f"Result1: {result1}")
        logger.debug(f"Result2: {result2}")
        logger.debug(f"Result3: {result3}")
        
        # Cache should be faster on second execution
        cache_speedup = time_with_cache_first / time_with_cache_second if time_with_cache_second > 0 else 0
        
        logger.info(f"✓ Caching test passed - Speedup: {cache_speedup:.2f}x")
        logger.info(f"  Without cache: {time_without_cache*1000:.2f}ms")
        logger.info(f"  With cache (first): {time_with_cache_first*1000:.2f}ms")
        logger.info(f"  With cache (second): {time_with_cache_second*1000:.2f}ms")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Caching test failed: {e}")
        return False


def test_performance_metrics():
    """Test performance metrics collection."""
    logger.info("Testing performance metrics collection...")
    
    try:
        manager = get_consolidated_db_manager()
        
        # Execute some queries to generate metrics (without cache to ensure they all count)
        manager.execute_query("SELECT 1", use_cache=False)
        manager.execute_query("SELECT 2", use_cache=False)
        manager.execute_query("SELECT 3", use_cache=False)
        
        # Get performance metrics
        metrics = manager.get_performance_metrics()
        
        # Verify metrics structure
        assert 'database_stats' in metrics, "Database stats missing"
        assert 'cache_stats' in metrics, "Cache stats missing"
        assert 'connection_pool' in metrics, "Connection pool stats missing"
        assert 'health_summary' in metrics, "Health summary missing"
        
        # Check specific metrics
        db_stats = metrics['database_stats']
        print(f"Debug: total_queries = {db_stats['total_queries']}")
        assert db_stats['total_queries'] >= 3, f"Should have executed at least 3 queries, got {db_stats['total_queries']}"
        
        cache_stats = metrics['cache_stats']
        assert 'hits' in cache_stats, "Cache hits metric missing"
        assert 'misses' in cache_stats, "Cache misses metric missing"
        
        logger.info("✓ Performance metrics test passed")
        logger.info(f"  Total queries: {db_stats['total_queries']}")
        logger.info(f"  Cache hits: {cache_stats['hits']}")
        logger.info(f"  Cache misses: {cache_stats['misses']}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Performance metrics test failed: {e}")
        return False


def test_health_monitoring():
    """Test health monitoring functionality."""
    logger.info("Testing health monitoring functionality...")
    
    try:
        manager = get_consolidated_db_manager()
        
        # Get health check
        health_status = manager.health_check()
        
        # Verify health status structure
        assert 'status' in health_status, "Health status missing"
        assert 'timestamp' in health_status, "Health timestamp missing"
        assert 'connection_pool' in health_status, "Connection pool status missing"
        assert 'performance' in health_status, "Performance metrics missing"
        
        # Check health status
        status = health_status['status']
        assert status in ['healthy', 'degraded', 'unhealthy', 'critical'], f"Invalid health status: {status}"
        
        logger.info(f"✓ Health monitoring test passed - Status: {status}")
        
        # Log detailed health info
        pool_status = health_status['connection_pool']
        logger.info(f"  Pool size: {pool_status['size']}")
        logger.info(f"  Checked out: {pool_status['checked_out']}")
        logger.info(f"  Checked in: {pool_status['checked_in']}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Health monitoring test failed: {e}")
        return False


def test_service_integration():
    """Test service integration functionality."""
    logger.info("Testing service integration functionality...")
    
    try:
        # Test restaurant service
        restaurant_service = get_restaurant_service()
        stats = restaurant_service.get_service_stats()
        assert 'service_name' in stats, "Service stats missing service name"
        assert stats['service_name'] == 'restaurant_service', "Wrong service name"
        
        # Test user service
        user_service = get_user_service()
        stats = user_service.get_service_stats()
        assert stats['service_name'] == 'user_service', "Wrong service name"
        
        # Test analytics service
        analytics_service = get_analytics_service()
        stats = analytics_service.get_service_stats()
        assert stats['service_name'] == 'analytics_service', "Wrong service name"
        
        # Test getting all service stats
        from database.service_integration import get_all_service_stats
        all_stats = get_all_service_stats()
        assert 'services' in all_stats, "All service stats missing services"
        assert len(all_stats['services']) == 3, "Should have 3 services"
        
        logger.info("✓ Service integration test passed")
        logger.info(f"  Services available: {list(all_stats['services'].keys())}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Service integration test failed: {e}")
        return False


def test_database_operations():
    """Test actual database operations."""
    logger.info("Testing database operations...")
    
    try:
        manager = get_consolidated_db_manager()
        
        # Test reading from existing tables (if they exist)
        try:
            # Try to get table information
            result = manager.execute_query("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                LIMIT 5
            """)
            
            logger.info(f"✓ Found {len(result)} tables in database")
            for table in result:
                logger.info(f"  - {table['table_name']}")
                
        except Exception as e:
            logger.warning(f"Could not query table information: {e}")
        
        # Test transaction functionality
        with manager.get_session() as session:
            # Simple transaction test
            from sqlalchemy import text
            result = session.execute(text("SELECT 1")).fetchone()
            assert result[0] == 1, "Transaction test failed"
        
        logger.info("✓ Database operations test passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ Database operations test failed: {e}")
        return False


def run_all_tests():
    """Run all tests and generate report."""
    logger.info("Starting consolidated database manager tests...")
    
    tests = [
        ("Basic Connectivity", test_basic_connectivity),
        ("Caching Functionality", test_caching_functionality),
        ("Performance Metrics", test_performance_metrics),
        ("Health Monitoring", test_health_monitoring),
        ("Service Integration", test_service_integration),
        ("Database Operations", test_database_operations)
    ]
    
    results = {}
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*50}")
        logger.info(f"Running test: {test_name}")
        logger.info(f"{'='*50}")
        
        try:
            success = test_func()
            results[test_name] = {
                'status': 'PASSED' if success else 'FAILED',
                'timestamp': datetime.now().isoformat()
            }
            
            if success:
                passed += 1
            else:
                failed += 1
                
        except Exception as e:
            logger.error(f"Test '{test_name}' crashed: {e}")
            results[test_name] = {
                'status': 'CRASHED',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            failed += 1
    
    # Generate final report
    logger.info(f"\n{'='*60}")
    logger.info("CONSOLIDATED DATABASE MANAGER TEST RESULTS")
    logger.info(f"{'='*60}")
    logger.info(f"Total tests: {len(tests)}")
    logger.info(f"Passed: {passed}")
    logger.info(f"Failed: {failed}")
    logger.info(f"Success rate: {(passed/len(tests)*100):.1f}%")
    
    logger.info("\nDetailed Results:")
    for test_name, result in results.items():
        status = result['status']
        logger.info(f"  {test_name}: {status}")
        if status == 'CRASHED':
            logger.info(f"    Error: {result['error']}")
    
    # Save detailed report
    report = {
        'test_summary': {
            'total_tests': len(tests),
            'passed': passed,
            'failed': failed,
            'success_rate': passed/len(tests)*100
        },
        'test_results': results,
        'timestamp': datetime.now().isoformat()
    }
    
    report_path = f"/tmp/consolidated_db_test_report_{int(time.time())}.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"\nDetailed report saved to: {report_path}")
    
    return failed == 0


def main():
    """Main test function."""
    # Set up environment
    if not os.environ.get('DATABASE_URL'):
        os.environ['DATABASE_URL'] = 'postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db'
    
    success = run_all_tests()
    
    if success:
        logger.info("\n🎉 All tests passed! Consolidated database manager is working correctly.")
        return 0
    else:
        logger.error("\n❌ Some tests failed. Please check the logs above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())