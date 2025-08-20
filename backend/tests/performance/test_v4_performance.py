#!/usr/bin/env python3
"""Comprehensive performance tests for API v4 vs v3.

This module provides performance testing capabilities to compare the new v4 API
against the existing v3 API, establish performance baselines, and identify
potential bottlenecks.

Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""

import argparse
import asyncio
import gc
import json
import os
import statistics
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import aiohttp
import psutil
import requests

# Add the backend directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from database.database_manager_v3 import EnhancedDatabaseManager as DatabaseManagerV3
from database.database_manager_v4 import DatabaseManager as DatabaseManagerV4
from utils.feature_flags_v4 import MigrationStage, api_v4_flags
from utils.logging_config import get_logger

logger = get_logger(__name__)


class PerformanceTestSuite:
    """Comprehensive performance testing suite for v4 vs v3 APIs."""

    def __init__(
        self, base_url: str = "http://localhost:5000", test_duration: int = 60
    ):
        self.base_url = base_url
        self.test_duration = test_duration
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "test_config": {"base_url": base_url, "test_duration": test_duration},
            "v3_results": {},
            "v4_results": {},
            "comparison": {},
            "recommendations": [],
        }

    def run_comprehensive_tests(self) -> Dict[str, Any]:
        """Run all performance tests."""
        logger.info("Starting comprehensive performance test suite")

        # Database performance tests
        self.results["database_tests"] = self._test_database_performance()

        # API endpoint performance tests
        self.results["api_tests"] = self._test_api_endpoints()

        # Cache performance tests
        self.results["cache_tests"] = self._test_cache_performance()

        # Load testing
        self.results["load_tests"] = self._test_load_performance()

        # Memory usage tests
        self.results["memory_tests"] = self._test_memory_usage()

        # Generate comparison and recommendations
        self._generate_comparison()
        self._generate_recommendations()

        logger.info("Performance test suite completed")
        return self.results

    def _test_database_performance(self) -> Dict[str, Any]:
        """Test database performance for v3 vs v4."""
        logger.info("Testing database performance")

        results = {"v3": {}, "v4": {}, "comparison": {}}

        # Test v3 database manager
        try:
            db_v3 = DatabaseManagerV3()
            if db_v3.connect():
                results["v3"] = self._benchmark_database_operations(db_v3, "v3")
                db_v3.close()
        except Exception as e:
            logger.error(f"V3 database test failed: {e}")
            results["v3"] = {"error": str(e)}

        # Test v4 database manager
        try:
            db_v4 = DatabaseManagerV4()
            if db_v4.connect():
                results["v4"] = self._benchmark_database_operations(db_v4, "v4")
                db_v4.close()
        except Exception as e:
            logger.error(f"V4 database test failed: {e}")
            results["v4"] = {"error": str(e)}

        # Compare results
        if "error" not in results["v3"] and "error" not in results["v4"]:
            results["comparison"] = self._compare_database_results(
                results["v3"], results["v4"]
            )

        return results

    def _benchmark_database_operations(
        self, db_manager, version: str
    ) -> Dict[str, Any]:
        """Benchmark database operations."""
        results = {}

        # Test connection time
        start_time = time.time()
        db_manager.connect()
        results["connection_time"] = time.time() - start_time

        # Test restaurant queries
        start_time = time.time()
        restaurants = db_manager.get_restaurants(limit=100, as_dict=True)
        results["get_restaurants_100"] = {
            "time": time.time() - start_time,
            "count": len(restaurants),
        }

        # Test restaurant by ID
        if restaurants:
            start_time = time.time()
            restaurant = db_manager.get_restaurant_by_id(restaurants[0]["id"])
            results["get_restaurant_by_id"] = time.time() - start_time

        # Test review queries
        start_time = time.time()
        reviews = db_manager.get_reviews(limit=100)
        results["get_reviews_100"] = {
            "time": time.time() - start_time,
            "count": len(reviews),
        }

        # Test search operations
        start_time = time.time()
        search_results = db_manager.search_places("pizza", limit=20)
        results["search_restaurants"] = {
            "time": time.time() - start_time,
            "count": len(search_results),
        }

        # Test statistics
        start_time = time.time()
        stats = db_manager.get_statistics()
        results["get_statistics"] = time.time() - start_time

        return results

    def _compare_database_results(
        self, v3_results: Dict, v4_results: Dict
    ) -> Dict[str, Any]:
        """Compare v3 vs v4 database results."""
        comparison = {}

        for operation in v3_results:
            if operation in v4_results and isinstance(
                v3_results[operation], (int, float)
            ):
                v3_time = v3_results[operation]
                v4_time = v4_results[operation]

                if isinstance(v3_time, dict):
                    v3_time = v3_time["time"]
                if isinstance(v4_time, dict):
                    v4_time = v4_time["time"]

                improvement = ((v3_time - v4_time) / v3_time) * 100
                comparison[operation] = {
                    "v3_time": v3_time,
                    "v4_time": v4_time,
                    "improvement_percent": improvement,
                    "faster": v4_time < v3_time,
                }

        return comparison

    def _test_api_endpoints(self) -> Dict[str, Any]:
        """Test API endpoint performance."""
        logger.info("Testing API endpoint performance")

        endpoints = [
            ("restaurants", "/api/restaurants?limit=20"),
            ("restaurants_search", "/api/restaurants/search?q=pizza"),
            ("restaurant_detail", "/api/restaurants/1"),
            ("reviews", "/api/reviews?limit=20"),
            ("statistics", "/api/statistics"),
        ]

        results = {"v3": {}, "v4": {}, "comparison": {}}

        # Test v3 endpoints
        for name, endpoint in endpoints:
            results["v3"][name] = self._test_endpoint_performance(
                f"{self.base_url}{endpoint}"
            )

        # Test v4 endpoints
        for name, endpoint in endpoints:
            v4_endpoint = endpoint.replace("/api/", "/api/v4/")
            results["v4"][name] = self._test_endpoint_performance(
                f"{self.base_url}{v4_endpoint}"
            )

        # Compare results
        for name in results["v3"]:
            if name in results["v4"]:
                v3_avg = results["v3"][name]["average_response_time"]
                v4_avg = results["v4"][name]["average_response_time"]
                improvement = ((v3_avg - v4_avg) / v3_avg) * 100

                results["comparison"][name] = {
                    "v3_avg": v3_avg,
                    "v4_avg": v4_avg,
                    "improvement_percent": improvement,
                    "faster": v4_avg < v3_avg,
                }

        return results

    def _test_endpoint_performance(
        self, url: str, iterations: int = 10
    ) -> Dict[str, Any]:
        """Test a single endpoint's performance."""
        response_times = []
        success_count = 0
        error_count = 0

        for i in range(iterations):
            try:
                start_time = time.time()
                response = requests.get(url, timeout=10)
                response_time = time.time() - start_time

                response_times.append(response_time)

                if response.status_code == 200:
                    success_count += 1
                else:
                    error_count += 1

            except Exception as e:
                error_count += 1
                logger.warning(f"Request failed: {e}")

            # Small delay between requests
            time.sleep(0.1)

        if response_times:
            return {
                "average_response_time": statistics.mean(response_times),
                "min_response_time": min(response_times),
                "max_response_time": max(response_times),
                "median_response_time": statistics.median(response_times),
                "success_count": success_count,
                "error_count": error_count,
                "success_rate": (success_count / iterations) * 100,
            }
        else:
            return {
                "error": "All requests failed",
                "success_count": 0,
                "error_count": error_count,
            }

    def _test_cache_performance(self) -> Dict[str, Any]:
        """Test cache performance."""
        logger.info("Testing cache performance")

        results = {"v3_cache": {}, "v4_cache": {}, "comparison": {}}

        # Test v3 cache (if available)
        try:
            from utils.cache_manager import cache_manager

            results["v3_cache"] = self._benchmark_cache_operations(cache_manager, "v3")
        except Exception as e:
            logger.warning(f"V3 cache test failed: {e}")
            results["v3_cache"] = {"error": str(e)}

        # Test v4 cache
        try:
            from utils.cache_manager_v4 import CacheManagerV4

            cache_v4 = CacheManagerV4()
            results["v4_cache"] = self._benchmark_cache_operations(cache_v4, "v4")
        except Exception as e:
            logger.warning(f"V4 cache test failed: {e}")
            results["v4_cache"] = {"error": str(e)}

        return results

    def _benchmark_cache_operations(
        self, cache_manager, version: str
    ) -> Dict[str, Any]:
        """Benchmark cache operations."""
        results = {}

        # Test set operations
        start_time = time.time()
        for i in range(100):
            cache_manager.set(f"test_key_{i}", f"test_value_{i}", ttl=60)
        results["set_100_items"] = time.time() - start_time

        # Test get operations
        start_time = time.time()
        for i in range(100):
            cache_manager.get(f"test_key_{i}")
        results["get_100_items"] = time.time() - start_time

        # Test delete operations
        start_time = time.time()
        for i in range(100):
            cache_manager.delete(f"test_key_{i}")
        results["delete_100_items"] = time.time() - start_time

        return results

    def _test_load_performance(self) -> Dict[str, Any]:
        """Test load performance with concurrent requests."""
        logger.info("Testing load performance")

        results = {"v3_load": {}, "v4_load": {}, "comparison": {}}

        # Test v3 load
        results["v3_load"] = self._run_load_test("/api/restaurants?limit=20", "v3")

        # Test v4 load
        results["v4_load"] = self._run_load_test("/api/v4/restaurants?limit=20", "v4")

        # Compare results
        if "error" not in results["v3_load"] and "error" not in results["v4_load"]:
            v3_rps = results["v3_load"]["requests_per_second"]
            v4_rps = results["v4_load"]["requests_per_second"]
            improvement = ((v4_rps - v3_rps) / v3_rps) * 100

            results["comparison"] = {
                "v3_rps": v3_rps,
                "v4_rps": v4_rps,
                "improvement_percent": improvement,
                "faster": v4_rps > v3_rps,
            }

        return results

    def _run_load_test(self, endpoint: str, version: str) -> Dict[str, Any]:
        """Run a load test on a specific endpoint."""
        url = f"{self.base_url}{endpoint}"
        concurrent_users = 10
        total_requests = 100

        results = {
            "total_requests": total_requests,
            "concurrent_users": concurrent_users,
            "response_times": [],
            "success_count": 0,
            "error_count": 0,
        }

        def make_request():
            try:
                start_time = time.time()
                response = requests.get(url, timeout=10)
                response_time = time.time() - start_time

                results["response_times"].append(response_time)

                if response.status_code == 200:
                    results["success_count"] += 1
                else:
                    results["error_count"] += 1

            except Exception as e:
                results["error_count"] += 1

        # Run concurrent requests
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = [executor.submit(make_request) for _ in range(total_requests)]
            for future in as_completed(futures):
                future.result()

        total_time = time.time() - start_time

        if results["response_times"]:
            results["total_time"] = total_time
            results["requests_per_second"] = total_requests / total_time
            results["average_response_time"] = statistics.mean(
                results["response_times"]
            )
            results["p95_response_time"] = sorted(results["response_times"])[
                int(len(results["response_times"]) * 0.95)
            ]
            results["success_rate"] = (results["success_count"] / total_requests) * 100

        return results

    def _test_memory_usage(self) -> Dict[str, Any]:
        """Test memory usage patterns."""
        logger.info("Testing memory usage")

        results = {"v3_memory": {}, "v4_memory": {}, "comparison": {}}

        # Test v3 memory usage
        gc.collect()
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        try:
            db_v3 = DatabaseManagerV3()
            db_v3.connect()

            # Perform operations
            for i in range(10):
                db_v3.get_restaurants(limit=100, as_dict=True)
                db_v3.get_reviews(limit=100)

            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            results["v3_memory"] = {
                "initial_mb": initial_memory,
                "final_mb": final_memory,
                "increase_mb": final_memory - initial_memory,
            }

            db_v3.close()
        except Exception as e:
            results["v3_memory"] = {"error": str(e)}

        # Test v4 memory usage
        gc.collect()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        try:
            db_v4 = DatabaseManagerV4()
            db_v4.connect()

            # Perform operations
            for i in range(10):
                db_v4.get_restaurants(limit=100, as_dict=True)
                db_v4.get_reviews(limit=100)

            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            results["v4_memory"] = {
                "initial_mb": initial_memory,
                "final_mb": final_memory,
                "increase_mb": final_memory - initial_memory,
            }

            db_v4.close()
        except Exception as e:
            results["v4_memory"] = {"error": str(e)}

        # Compare memory usage
        if "error" not in results["v3_memory"] and "error" not in results["v4_memory"]:
            v3_increase = results["v3_memory"]["increase_mb"]
            v4_increase = results["v4_memory"]["increase_mb"]

            results["comparison"] = {
                "v3_memory_increase": v3_increase,
                "v4_memory_increase": v4_increase,
                "difference_mb": v4_increase - v3_increase,
                "more_efficient": v4_increase < v3_increase,
            }

        return results

    def _generate_comparison(self):
        """Generate overall comparison metrics."""
        logger.info("Generating performance comparison")

        self.results["comparison"] = {
            "database_performance": self._calculate_overall_improvement(
                "database_tests"
            ),
            "api_performance": self._calculate_overall_improvement("api_tests"),
            "cache_performance": self._calculate_overall_improvement("cache_tests"),
            "load_performance": self._calculate_overall_improvement("load_tests"),
            "memory_efficiency": self._calculate_memory_efficiency(),
        }

    def _calculate_overall_improvement(self, test_category: str) -> Dict[str, Any]:
        """Calculate overall improvement for a test category."""
        if test_category not in self.results:
            return {"error": "Test category not found"}

        category_results = self.results[test_category]
        if "comparison" not in category_results:
            return {"error": "No comparison data available"}

        improvements = []
        for operation, data in category_results["comparison"].items():
            if "improvement_percent" in data:
                improvements.append(data["improvement_percent"])

        if improvements:
            return {
                "average_improvement": statistics.mean(improvements),
                "median_improvement": statistics.median(improvements),
                "best_improvement": max(improvements),
                "worst_improvement": min(improvements),
                "operations_tested": len(improvements),
            }
        else:
            return {"error": "No improvement data available"}

    def _calculate_memory_efficiency(self) -> Dict[str, Any]:
        """Calculate memory efficiency comparison."""
        if "memory_tests" not in self.results:
            return {"error": "Memory tests not found"}

        memory_results = self.results["memory_tests"]
        if "comparison" not in memory_results:
            return {"error": "No memory comparison data available"}

        comparison = memory_results["comparison"]
        if "more_efficient" in comparison:
            return {
                "v4_more_efficient": comparison["more_efficient"],
                "memory_difference_mb": comparison.get("difference_mb", 0),
                "efficiency_improvement": comparison.get("difference_mb", 0) < 0,
            }

        return {"error": "Insufficient memory comparison data"}

    def _generate_recommendations(self):
        """Generate performance recommendations."""
        logger.info("Generating performance recommendations")

        recommendations = []

        # Database recommendations
        if "database_tests" in self.results:
            db_comparison = self.results["database_tests"].get("comparison", {})
            for operation, data in db_comparison.items():
                if not data.get("faster", True):
                    recommendations.append(
                        f"Database {operation} is slower in v4. Consider optimization."
                    )

        # API recommendations
        if "api_tests" in self.results:
            api_comparison = self.results["api_tests"].get("comparison", {})
            for endpoint, data in api_comparison.items():
                if not data.get("faster", True):
                    recommendations.append(
                        f"API endpoint {endpoint} is slower in v4. Consider optimization."
                    )

        # Load testing recommendations
        if "load_tests" in self.results:
            load_comparison = self.results["load_tests"].get("comparison", {})
            if "faster" in load_comparison and not load_comparison["faster"]:
                recommendations.append(
                    "V4 API shows lower throughput under load. Consider scaling optimizations."
                )

        # Memory recommendations
        if "memory_tests" in self.results:
            memory_comparison = self.results["memory_tests"].get("comparison", {})
            if (
                "more_efficient" in memory_comparison
                and not memory_comparison["more_efficient"]
            ):
                recommendations.append(
                    "V4 API uses more memory. Consider memory optimization."
                )

        # General recommendations
        if not recommendations:
            recommendations.append(
                "V4 API shows good performance across all metrics. Ready for production deployment."
            )

        self.results["recommendations"] = recommendations

    def save_results(self, filename: str = None) -> str:
        """Save test results to a file."""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"performance_test_results_{timestamp}.json"

        filepath = os.path.join(os.path.dirname(__file__), "results", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        with open(filepath, "w") as f:
            json.dump(self.results, f, indent=2)

        logger.info(f"Performance test results saved to {filepath}")
        return filepath

    def print_summary(self):
        """Print a summary of the test results."""
        print("\n" + "=" * 80)
        print("PERFORMANCE TEST SUMMARY")
        print("=" * 80)

        if "comparison" in self.results:
            comparison = self.results["comparison"]

            print(f"\nDatabase Performance:")
            if "database_performance" in comparison:
                db_perf = comparison["database_performance"]
                if "average_improvement" in db_perf:
                    print(
                        f"  Average Improvement: {db_perf['average_improvement']:.2f}%"
                    )

            print(f"\nAPI Performance:")
            if "api_performance" in comparison:
                api_perf = comparison["api_performance"]
                if "average_improvement" in api_perf:
                    print(
                        f"  Average Improvement: {api_perf['average_improvement']:.2f}%"
                    )

            print(f"\nLoad Performance:")
            if "load_performance" in comparison:
                load_perf = comparison["load_performance"]
                if "average_improvement" in load_perf:
                    print(
                        f"  Average Improvement: {load_perf['average_improvement']:.2f}%"
                    )

        print(f"\nRecommendations:")
        for rec in self.results.get("recommendations", []):
            print(f"  - {rec}")

        print("=" * 80)


def main():
    """Main function for running performance tests."""
    parser = argparse.ArgumentParser(description="API v4 Performance Testing Suite")
    parser.add_argument(
        "--base-url", default="http://localhost:5000", help="Base URL for the API"
    )
    parser.add_argument(
        "--duration", type=int, default=60, help="Test duration in seconds"
    )
    parser.add_argument("--output", help="Output file for results")
    parser.add_argument("--save", action="store_true", help="Save results to file")

    args = parser.parse_args()

    # Create and run test suite
    test_suite = PerformanceTestSuite(args.base_url, args.duration)
    results = test_suite.run_comprehensive_tests()

    # Print summary
    test_suite.print_summary()

    # Save results if requested
    if args.save or args.output:
        filepath = test_suite.save_results(args.output)
        print(f"\nResults saved to: {filepath}")

    # Return results for programmatic use
    return results


if __name__ == "__main__":
    main()
