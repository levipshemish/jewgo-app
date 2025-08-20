#!/usr/bin/env python3
"""API v4 Migration Manager.

This script helps manage the gradual migration from v3 to v4 APIs.
It provides tools for monitoring, testing, and controlling the migration process.

Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests
from utils.feature_flags_v4 import (
    MigrationStage,
    api_v4_flags,
    complete_migration,
    enable_full_rollout,
    enable_partial_rollout,
    enable_testing_mode,
    get_migration_status,
    migrate_stage,
    rollback_migration,
)
from utils.logging_config import get_logger

# Add the backend directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

logger = get_logger(__name__)


class APIV4MigrationManager:
    """Manager for API v4 migration process."""

    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "User-Agent": "API-V4-Migration-Manager/1.0",
            }
        )

    def get_current_status(self) -> Dict[str, Any]:
        """Get current migration status."""
        try:
            response = self.session.get(f"{self.base_url}/api/v4/migration/status")
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(
                    f"Failed to get migration status: {response.status_code}"
                )
                return get_migration_status()
        except Exception as e:
            logger.error(f"Error getting migration status: {e}")
            return get_migration_status()

    def test_v4_endpoints(self) -> Dict[str, Any]:
        """Test v4 API endpoints."""
        results = {}

        # Test restaurant endpoints
        results["restaurants"] = self._test_restaurant_endpoints()

        # Test review endpoints
        results["reviews"] = self._test_review_endpoints()

        # Test user endpoints
        results["users"] = self._test_user_endpoints()

        # Test statistics endpoints
        results["statistics"] = self._test_statistics_endpoints()

        return results

    def _test_restaurant_endpoints(self) -> Dict[str, Any]:
        """Test restaurant endpoints."""
        results = {}

        try:
            # Test GET /api/v4/restaurants
            response = self.session.get(f"{self.base_url}/api/v4/restaurants?limit=5")
            results["get_restaurants"] = {
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "response_time": response.elapsed.total_seconds(),
            }

            # Test GET /api/v4/restaurants/search
            response = self.session.get(
                f"{self.base_url}/api/v4/restaurants/search?q=pizza"
            )
            results["search_restaurants"] = {
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "response_time": response.elapsed.total_seconds(),
            }

            # Test GET /api/v4/restaurants/1
            response = self.session.get(f"{self.base_url}/api/v4/restaurants/1")
            results["get_restaurant"] = {
                "status_code": response.status_code,
                "success": response.status_code in [200, 404],
                "response_time": response.elapsed.total_seconds(),
            }

        except Exception as e:
            results["error"] = str(e)

        return results

    def _test_review_endpoints(self) -> Dict[str, Any]:
        """Test review endpoints."""
        results = {}

        try:
            # Test GET /api/v4/reviews
            response = self.session.get(f"{self.base_url}/api/v4/reviews?limit=5")
            results["get_reviews"] = {
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "response_time": response.elapsed.total_seconds(),
            }

            # Test GET /api/v4/reviews/1
            response = self.session.get(f"{self.base_url}/api/v4/reviews/1")
            results["get_review"] = {
                "status_code": response.status_code,
                "success": response.status_code in [200, 404],
                "response_time": response.elapsed.total_seconds(),
            }

        except Exception as e:
            results["error"] = str(e)

        return results

    def _test_user_endpoints(self) -> Dict[str, Any]:
        """Test user endpoints."""
        results = {}

        try:
            # Test GET /api/v4/admin/users
            response = self.session.get(f"{self.base_url}/api/v4/admin/users")
            results["get_users"] = {
                "status_code": response.status_code,
                "success": response.status_code in [200, 401, 403],
                "response_time": response.elapsed.total_seconds(),
            }

        except Exception as e:
            results["error"] = str(e)

        return results

    def _test_statistics_endpoints(self) -> Dict[str, Any]:
        """Test statistics endpoints."""
        results = {}

        try:
            # Test GET /api/v4/statistics
            response = self.session.get(f"{self.base_url}/api/v4/statistics")
            results["get_statistics"] = {
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "response_time": response.elapsed.total_seconds(),
            }

        except Exception as e:
            results["error"] = str(e)

        return results

    def compare_v3_v4_performance(
        self, endpoint: str, iterations: int = 10
    ) -> Dict[str, Any]:
        """Compare performance between v3 and v4 APIs."""
        results = {"v3_times": [], "v4_times": [], "v3_errors": 0, "v4_errors": 0}

        for i in range(iterations):
            # Test v3 endpoint
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}/api/{endpoint}")
                v3_time = time.time() - start_time
                results["v3_times"].append(v3_time)
                if response.status_code >= 400:
                    results["v3_errors"] += 1
            except Exception as e:
                results["v3_errors"] += 1
                logger.error(f"V3 error on iteration {i}: {e}")

            # Test v4 endpoint
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}/api/v4/{endpoint}")
                v4_time = time.time() - start_time
                results["v4_times"].append(v4_time)
                if response.status_code >= 400:
                    results["v4_errors"] += 1
            except Exception as e:
                results["v4_errors"] += 1
                logger.error(f"V4 error on iteration {i}: {e}")

            # Small delay between requests
            time.sleep(0.1)

        # Calculate statistics
        if results["v3_times"]:
            results["v3_avg"] = sum(results["v3_times"]) / len(results["v3_times"])
            results["v3_min"] = min(results["v3_times"])
            results["v3_max"] = max(results["v3_times"])

        if results["v4_times"]:
            results["v4_avg"] = sum(results["v4_times"]) / len(results["v4_times"])
            results["v4_min"] = min(results["v4_times"])
            results["v4_max"] = max(results["v4_times"])

        return results

    def enable_testing_mode(self) -> Dict[str, Any]:
        """Enable testing mode for all v4 API flags."""
        logger.info("Enabling testing mode for v4 API")
        results = enable_testing_mode()

        # Test endpoints after enabling
        test_results = self.test_v4_endpoints()

        return {"migration_results": results, "test_results": test_results}

    def enable_partial_rollout(self, percentage: float = 10.0) -> Dict[str, Any]:
        """Enable partial rollout for v4 API."""
        logger.info(f"Enabling partial rollout ({percentage}%) for v4 API")

        # Set rollout percentages
        for flag_name in api_v4_flags.flags:
            if flag_name.startswith("api_v4_"):
                api_v4_flags.set_rollout_percentage(flag_name, percentage)

        results = enable_partial_rollout()

        # Test endpoints after enabling
        test_results = self.test_v4_endpoints()

        return {
            "migration_results": results,
            "test_results": test_results,
            "rollout_percentage": percentage,
        }

    def enable_full_rollout(self) -> Dict[str, Any]:
        """Enable full rollout for v4 API."""
        logger.info("Enabling full rollout for v4 API")
        results = enable_full_rollout()

        # Test endpoints after enabling
        test_results = self.test_v4_endpoints()

        return {"migration_results": results, "test_results": test_results}

    def complete_migration(self) -> Dict[str, Any]:
        """Complete migration for v4 API."""
        logger.info("Completing migration for v4 API")
        results = complete_migration()

        # Test endpoints after completing
        test_results = self.test_v4_endpoints()

        return {"migration_results": results, "test_results": test_results}

    def rollback_migration(self) -> Dict[str, Any]:
        """Rollback migration for v4 API."""
        logger.info("Rolling back migration for v4 API")
        results = rollback_migration()

        return {"migration_results": results, "rollback_completed": True}

    def generate_migration_report(self) -> Dict[str, Any]:
        """Generate a comprehensive migration report."""
        status = self.get_current_status()
        test_results = self.test_v4_endpoints()

        # Performance comparison for key endpoints
        performance_results = {}
        key_endpoints = ["restaurants", "reviews", "statistics"]

        for endpoint in key_endpoints:
            performance_results[endpoint] = self.compare_v3_v4_performance(
                endpoint, iterations=5
            )

        report = {
            "timestamp": datetime.now().isoformat(),
            "migration_status": status,
            "test_results": test_results,
            "performance_comparison": performance_results,
            "recommendations": self._generate_recommendations(
                status, test_results, performance_results
            ),
        }

        return report

    def _generate_recommendations(
        self, status: Dict, test_results: Dict, performance_results: Dict
    ) -> List[str]:
        """Generate recommendations based on current status and test results."""
        recommendations = []

        # Check overall migration progress
        disabled_count = status["stages"].get("disabled", 0)
        total_flags = status["total_flags"]

        if disabled_count == total_flags:
            recommendations.append(
                "All flags are disabled. Consider enabling testing mode to begin migration."
            )
        elif disabled_count > total_flags * 0.5:
            recommendations.append(
                "Most flags are still disabled. Consider enabling testing mode for gradual migration."
            )

        # Check test results
        test_errors = 0
        for category, results in test_results.items():
            if isinstance(results, dict) and "error" in results:
                test_errors += 1

        if test_errors > 0:
            recommendations.append(
                f"Found {test_errors} test errors. Review and fix before proceeding with migration."
            )

        # Check performance
        for endpoint, perf in performance_results.items():
            if "v4_avg" in perf and "v3_avg" in perf:
                if perf["v4_avg"] > perf["v3_avg"] * 1.5:
                    recommendations.append(
                        f"V4 {endpoint} endpoint is significantly slower than V3. Investigate performance issues."
                    )

        return recommendations


def main():
    """Main function for command-line usage."""
    parser = argparse.ArgumentParser(description="API v4 Migration Manager")
    parser.add_argument(
        "--base-url", default="http://localhost:5000", help="Base URL for the API"
    )
    parser.add_argument(
        "--action",
        choices=[
            "status",
            "test",
            "testing",
            "partial",
            "full",
            "complete",
            "rollback",
            "report",
        ],
        default="status",
        help="Action to perform",
    )
    parser.add_argument(
        "--percentage",
        type=float,
        default=10.0,
        help="Rollout percentage for partial migration",
    )
    parser.add_argument("--output", help="Output file for report")

    args = parser.parse_args()

    manager = APIV4MigrationManager(args.base_url)

    if args.action == "status":
        status = manager.get_current_status()
        print(json.dumps(status, indent=2))

    elif args.action == "test":
        results = manager.test_v4_endpoints()
        print(json.dumps(results, indent=2))

    elif args.action == "testing":
        results = manager.enable_testing_mode()
        print(json.dumps(results, indent=2))

    elif args.action == "partial":
        results = manager.enable_partial_rollout(args.percentage)
        print(json.dumps(results, indent=2))

    elif args.action == "full":
        results = manager.enable_full_rollout()
        print(json.dumps(results, indent=2))

    elif args.action == "complete":
        results = manager.complete_migration()
        print(json.dumps(results, indent=2))

    elif args.action == "rollback":
        results = manager.rollback_migration()
        print(json.dumps(results, indent=2))

    elif args.action == "report":
        report = manager.generate_migration_report()
        if args.output:
            with open(args.output, "w") as f:
                json.dump(report, f, indent=2)
            print(f"Report saved to {args.output}")
        else:
            print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
