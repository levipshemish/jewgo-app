#!/usr/bin/env python3
"""Simplified Performance Test for API v4 Architecture.

This script provides a basic performance test that can run without
requiring the full database setup, focusing on testing the core
components and architecture.
"""

import os
import sys
import time
import json
import statistics
import argparse
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add the backend directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

def test_import_performance():
    """Test import performance of v4 components."""
    print("Testing import performance...")
    
    start_time = time.time()
    
    try:
        # Test v4 imports
        from utils.config_manager import ConfigManager
        from utils.logging_config import get_logger
        from utils.feature_flags_v4 import api_v4_flags, MigrationStage
        
        v4_import_time = time.time() - start_time
        print(f"✅ V4 components imported in {v4_import_time:.4f}s")
        
        # Test basic functionality
        logger = get_logger(__name__)
        config = ConfigManager.get_config_summary()
        flags = api_v4_flags.get_all_flags()
        
        print(f"✅ Configuration loaded: {len(config)} sections")
        print(f"✅ Feature flags loaded: {len(flags)} flags")
        
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_memory_usage():
    """Test memory usage of components."""
    print("\nTesting memory usage...")
    
    try:
        import psutil
        import gc
        
        # Get initial memory
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Import components
        from utils.config_manager import ConfigManager
        from utils.logging_config import get_logger
        from utils.feature_flags_v4 import api_v4_flags
        
        # Get memory after imports
        gc.collect()
        after_import_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        memory_increase = after_import_memory - initial_memory
        print(f"✅ Memory usage: {initial_memory:.2f}MB → {after_import_memory:.2f}MB (+{memory_increase:.2f}MB)")
        
        return True
        
    except ImportError:
        print("⚠️  psutil not available, skipping memory test")
        return True
    except Exception as e:
        print(f"❌ Memory test failed: {e}")
        return False

def test_feature_flags_performance():
    """Test feature flags performance."""
    print("\nTesting feature flags performance...")
    
    try:
        from utils.feature_flags_v4 import api_v4_flags
        
        # Test flag checking performance
        iterations = 10000
        start_time = time.time()
        
        for i in range(iterations):
            api_v4_flags.is_enabled("api_v4_restaurants", f"user_{i}")
        
        total_time = time.time() - start_time
        avg_time = total_time / iterations * 1000  # ms
        
        print(f"✅ Feature flag checks: {iterations} iterations in {total_time:.4f}s")
        print(f"✅ Average time per check: {avg_time:.4f}ms")
        
        return True
        
    except Exception as e:
        print(f"❌ Feature flags test failed: {e}")
        return False

def test_config_manager_performance():
    """Test config manager performance."""
    print("\nTesting config manager performance...")
    
    try:
        from utils.config_manager import ConfigManager
        
        # Test config retrieval performance
        iterations = 10000
        start_time = time.time()
        
        for i in range(iterations):
            ConfigManager.get_database_url()
            ConfigManager.get_redis_url()
            ConfigManager.get_google_places_api_key()
        
        total_time = time.time() - start_time
        avg_time = total_time / iterations * 1000  # ms
        
        print(f"✅ Config retrievals: {iterations} iterations in {total_time:.4f}s")
        print(f"✅ Average time per retrieval: {avg_time:.4f}ms")
        
        # Test config summary
        summary = ConfigManager.get_config_summary()
        print(f"✅ Config summary generated: {len(summary)} sections")
        
        return True
        
    except Exception as e:
        print(f"❌ Config manager test failed: {e}")
        return False

def test_logging_performance():
    """Test logging performance."""
    print("\nTesting logging performance...")
    
    try:
        from utils.logging_config import get_logger
        
        logger = get_logger(__name__)
        
        # Test logging performance
        iterations = 1000
        start_time = time.time()
        
        for i in range(iterations):
            logger.debug(f"Test log message {i}")
        
        total_time = time.time() - start_time
        avg_time = total_time / iterations * 1000  # ms
        
        print(f"✅ Logging: {iterations} messages in {total_time:.4f}s")
        print(f"✅ Average time per log: {avg_time:.4f}ms")
        
        return True
        
    except Exception as e:
        print(f"❌ Logging test failed: {e}")
        return False

def generate_performance_report(results: Dict[str, bool], save: bool = False):
    """Generate performance test report."""
    print("\n" + "="*50)
    print("PERFORMANCE TEST REPORT")
    print("="*50)
    
    passed = sum(results.values())
    total = len(results)
    
    print(f"Tests Passed: {passed}/{total}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    print("\nDetailed Results:")
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    if save:
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "passed": passed,
                "total": total,
                "success_rate": (passed/total)*100
            },
            "results": results
        }
        
        filename = f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Report saved to: {filename}")
    
    return passed == total

def main():
    """Main performance test function."""
    parser = argparse.ArgumentParser(description="Simple Performance Test for API v4")
    parser.add_argument("--save", action="store_true", help="Save report to file")
    args = parser.parse_args()
    
    print("🚀 Starting Simplified Performance Test for API v4")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Set up test environment
    os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
    os.environ.setdefault("GOOGLE_PLACES_API_KEY", "test-key")
    os.environ.setdefault("FLASK_SECRET_KEY", "test-secret")
    os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")
    
    # Run tests
    results = {}
    
    results["Import Performance"] = test_import_performance()
    results["Memory Usage"] = test_memory_usage()
    results["Feature Flags Performance"] = test_feature_flags_performance()
    results["Config Manager Performance"] = test_config_manager_performance()
    results["Logging Performance"] = test_logging_performance()
    
    # Generate report
    success = generate_performance_report(results, args.save)
    
    if success:
        print("\n🎉 All performance tests passed!")
        return 0
    else:
        print("\n⚠️  Some performance tests failed. Check the report above.")
        return 1

if __name__ == "__main__":
    exit(main())
