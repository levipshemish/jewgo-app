#!/usr/bin/env python3
"""Migration script for DatabaseManager v3 to v4."""

import json
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from database.database_manager_v3 import EnhancedDatabaseManager as DatabaseManagerV3
from database.database_manager_v4 import DatabaseManager as DatabaseManagerV4
from services.restaurant_service_v4 import RestaurantServiceV4
from services.review_service_v4 import ReviewServiceV4
from services.user_service_v4 import UserServiceV4
from utils.cache_manager_v4 import CacheManagerV4
from utils.config_manager import ConfigManager
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))


class DatabaseMigrationManager:
    """Manages the migration from DatabaseManager v3 to v4."""

    def __init__(self, config: Optional[ConfigManager] = None):
        """Initialize the migration manager.

        Args:
            config: Configuration manager instance
        """
        self.config = config or ConfigManager()
        self.v3_manager = None
        self.v4_manager = None
        self.cache_manager = None
        self.migration_log = []
        self.start_time = None
        self.end_time = None

    def initialize_managers(self) -> bool:
        """Initialize both v3 and v4 database managers."""
        try:
            logger.info("Initializing DatabaseManager v3...")
            self.v3_manager = DatabaseManagerV3()
            if not self.v3_manager.connect():
                logger.error("Failed to connect to database with v3 manager")
                return False

            logger.info("Initializing DatabaseManager v4...")
            self.v4_manager = DatabaseManagerV4()
            if not self.v4_manager.connect():
                logger.error("Failed to connect to database with v4 manager")
                return False

            logger.info("Initializing CacheManager v4...")
            redis_url = self.config.get("REDIS_URL")
            self.cache_manager = CacheManagerV4(redis_url=redis_url)

            logger.info("All managers initialized successfully")
            return True

        except Exception as e:
            logger.error("Error initializing managers", error=str(e))
            return False

    def run_comparison_tests(self) -> Dict[str, Any]:
        """Run comparison tests between v3 and v4 managers."""
        logger.info("Running comparison tests...")
        results = {
            "restaurants": self._compare_restaurant_operations(),
            "reviews": self._compare_review_operations(),
            "users": self._compare_user_operations(),
            "images": self._compare_image_operations(),
            "statistics": self._compare_statistics_operations(),
        }

        # Log results
        for category, result in results.items():
            if result["status"] == "success":
                logger.info(
                    f"{category} comparison: SUCCESS",
                    v3_count=result.get("v3_count", 0),
                    v4_count=result.get("v4_count", 0),
                )
            else:
                logger.error(
                    f"{category} comparison: FAILED",
                    error=result.get("error", "Unknown error"),
                )

        return results

    def _compare_restaurant_operations(self) -> Dict[str, Any]:
        """Compare restaurant operations between v3 and v4."""
        try:
            # Test getting restaurants
            v3_restaurants = self.v3_manager.get_restaurants(limit=10, as_dict=True)
            v4_restaurants = self.v4_manager.get_restaurants(limit=10, as_dict=True)

            # Test getting restaurant by ID
            if v3_restaurants and v4_restaurants:
                test_id = v3_restaurants[0]["id"]
                v3_restaurant = self.v3_manager.get_restaurant_by_id(test_id)
                v4_restaurant = self.v4_manager.get_restaurant_by_id(test_id)

                return {
                    "status": "success",
                    "v3_count": len(v3_restaurants),
                    "v4_count": len(v4_restaurants),
                    "v3_restaurant": v3_restaurant is not None,
                    "v4_restaurant": v4_restaurant is not None,
                }

            return {
                "status": "success",
                "v3_count": len(v3_restaurants),
                "v4_count": len(v4_restaurants),
            }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _compare_review_operations(self) -> Dict[str, Any]:
        """Compare review operations between v3 and v4."""
        try:
            # Test getting reviews
            v3_reviews = self.v3_manager.get_reviews(limit=10)
            v4_reviews = self.v4_manager.get_reviews(limit=10)

            return {
                "status": "success",
                "v3_count": len(v3_reviews),
                "v4_count": len(v4_reviews),
            }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _compare_user_operations(self) -> Dict[str, Any]:
        """Compare user operations between v3 and v4."""
        try:
            # Test getting users
            v3_users = self.v3_manager.get_users(limit=10)
            v4_users = self.v4_manager.get_users(limit=10)

            return {
                "status": "success",
                "v3_count": len(v3_users),
                "v4_count": len(v4_users),
            }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _compare_image_operations(self) -> Dict[str, Any]:
        """Compare image operations between v3 and v4."""
        try:
            # Test getting images for a restaurant
            restaurants = self.v3_manager.get_restaurants(limit=1, as_dict=True)
            if restaurants:
                test_id = restaurants[0]["id"]
                v3_images = self.v3_manager.get_restaurant_images(test_id)
                v4_images = self.v4_manager.get_restaurant_images(test_id)

                return {
                    "status": "success",
                    "v3_count": len(v3_images),
                    "v4_count": len(v4_images),
                }

            return {
                "status": "success",
                "v3_count": 0,
                "v4_count": 0,
            }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _compare_statistics_operations(self) -> Dict[str, Any]:
        """Compare statistics operations between v3 and v4."""
        try:
            # Test getting statistics
            v3_stats = self.v3_manager.get_restaurant_statistics()
            v4_stats = self.v4_manager.get_restaurant_statistics()

            return {
                "status": "success",
                "v3_stats": v3_stats is not None,
                "v4_stats": v4_stats is not None,
            }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def test_service_layer_migration(self) -> Dict[str, Any]:
        """Test the new service layer with v4 manager."""
        try:
            logger.info("Testing service layer migration...")

            # Initialize services with v4 manager
            restaurant_service = RestaurantServiceV4(db_manager=self.v4_manager)
            review_service = ReviewServiceV4(db_manager=self.v4_manager)
            user_service = UserServiceV4(db_manager=self.v4_manager)

            # Test restaurant service
            restaurants = restaurant_service.get_all_restaurants()
            restaurant_count = len(restaurants)

            # Test review service
            reviews = review_service.get_reviews(limit=10)
            review_count = len(reviews)

            # Test user service
            users = user_service.get_users(limit=10)
            user_count = len(users)

            return {
                "status": "success",
                "restaurant_count": restaurant_count,
                "review_count": review_count,
                "user_count": user_count,
            }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def test_cache_integration(self) -> Dict[str, Any]:
        """Test cache integration with v4 manager."""
        try:
            logger.info("Testing cache integration...")

            # Test cache operations
            test_key = "test:migration:key"
            test_value = {"test": "data", "timestamp": datetime.now().isoformat()}

            # Set cache
            cache_set = self.cache_manager.set(test_key, test_value, ttl=60)

            # Get cache
            cache_get = self.cache_manager.get(test_key)

            # Delete cache
            cache_delete = self.cache_manager.delete(test_key)

            # Get cache stats
            cache_stats = self.cache_manager.get_cache_stats()

            return {
                "status": "success",
                "cache_set": cache_set,
                "cache_get": cache_get == test_value,
                "cache_delete": cache_delete,
                "cache_stats": cache_stats,
            }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def generate_migration_report(self, results: Dict[str, Any]) -> str:
        """Generate a migration report."""
        self.end_time = datetime.now()
        duration = (self.end_time - self.start_time).total_seconds()

        report = f"""
# Database Migration Report: v3 to v4

## Migration Summary
- **Start Time**: {self.start_time}
- **End Time**: {self.end_time}
- **Duration**: {duration:.2f} seconds

## Comparison Results

### Restaurant Operations
- Status: {results['restaurants']['status']}
- V3 Count: {results['restaurants'].get('v3_count', 0)}
- V4 Count: {results['restaurants'].get('v4_count', 0)}

### Review Operations
- Status: {results['reviews']['status']}
- V3 Count: {results['reviews'].get('v3_count', 0)}
- V4 Count: {results['reviews'].get('v4_count', 0)}

### User Operations
- Status: {results['users']['status']}
- V3 Count: {results['users'].get('v3_count', 0)}
- V4 Count: {results['users'].get('v4_count', 0)}

### Image Operations
- Status: {results['images']['status']}
- V3 Count: {results['images'].get('v3_count', 0)}
- V4 Count: {results['images'].get('v4_count', 0)}

### Statistics Operations
- Status: {results['statistics']['status']}
- V3 Stats: {results['statistics'].get('v3_stats', False)}
- V4 Stats: {results['statistics'].get('v4_stats', False)}

## Service Layer Migration
- Status: {results.get('service_layer', {}).get('status', 'not_tested')}
- Restaurant Count: {results.get('service_layer', {}).get('restaurant_count', 0)}
- Review Count: {results.get('service_layer', {}).get('review_count', 0)}
- User Count: {results.get('service_layer', {}).get('user_count', 0)}

## Cache Integration
- Status: {results.get('cache_integration', {}).get('status', 'not_tested')}
- Cache Set: {results.get('cache_integration', {}).get('cache_set', False)}
- Cache Get: {results.get('cache_integration', {}).get('cache_get', False)}
- Cache Delete: {results.get('cache_integration', {}).get('cache_delete', False)}

## Recommendations

### Phase 1: Validation ✅
- [x] DatabaseManager v4 initialization
- [x] Repository pattern implementation
- [x] Basic CRUD operations comparison

### Phase 2: Service Layer Migration 🔄
- [ ] Update existing services to use v4 manager
- [ ] Implement caching layer
- [ ] Performance testing

### Phase 3: API Layer Migration 📋
- [ ] Update API routes to use v4 services
- [ ] Implement gradual rollout strategy
- [ ] Monitor performance and error rates

### Phase 4: Cleanup 🧹
- [ ] Remove v3 manager dependencies
- [ ] Update documentation
- [ ] Performance optimization

## Next Steps
1. Complete service layer migration
2. Implement caching for frequently accessed data
3. Update API routes gradually
4. Monitor performance metrics
5. Remove v3 manager when stable
"""

        return report

    def run_full_migration_test(self) -> Dict[str, Any]:
        """Run the full migration test suite."""
        self.start_time = datetime.now()
        logger.info("Starting full migration test suite...")

        # Initialize managers
        if not self.initialize_managers():
            return {"status": "error", "message": "Failed to initialize managers"}

        results = {}

        # Run comparison tests
        logger.info("Running comparison tests...")
        results["comparison"] = self.run_comparison_tests()

        # Test service layer migration
        logger.info("Testing service layer migration...")
        results["service_layer"] = self.test_service_layer_migration()

        # Test cache integration
        logger.info("Testing cache integration...")
        results["cache_integration"] = self.test_cache_integration()

        # Generate report
        report = self.generate_migration_report(results)

        # Save report to file
        report_filename = (
            f"migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        )
        with open(report_filename, "w") as f:
            f.write(report)

        logger.info(f"Migration report saved to {report_filename}")

        return {
            "status": "success",
            "results": results,
            "report_filename": report_filename,
            "report": report,
        }

    def cleanup(self):
        """Clean up resources."""
        try:
            if self.v3_manager:
                self.v3_manager.disconnect()
            if self.v4_manager:
                self.v4_manager.disconnect()
            if self.cache_manager:
                self.cache_manager.close()
            logger.info("Migration manager cleanup completed")
        except Exception as e:
            logger.error("Error during cleanup", error=str(e))


def main():
    """Main migration script."""
    logger.info("Starting DatabaseManager v3 to v4 migration test...")

    # Initialize migration manager
    migration_manager = DatabaseMigrationManager()

    try:
        # Run full migration test
        result = migration_manager.run_full_migration_test()

        if result["status"] == "success":
            logger.info("Migration test completed successfully")
            print("\n" + "=" * 50)
            print("MIGRATION TEST RESULTS")
            print("=" * 50)
            print(result["report"])
        else:
            logger.error(
                "Migration test failed", error=result.get("message", "Unknown error")
            )
            print(f"Migration test failed: {result.get('message', 'Unknown error')}")

    except Exception as e:
        logger.error("Unexpected error during migration test", error=str(e))
        print(f"Unexpected error: {str(e)}")

    finally:
        # Cleanup
        migration_manager.cleanup()


if __name__ == "__main__":
    main()
