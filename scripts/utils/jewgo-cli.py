#!/usr/bin/env python3
"""
JewGo CLI - Standardized Command Line Interface
==============================================

This script provides a consistent CLI interface for all JewGo operations including
scraping, database management, monitoring, and maintenance tasks.

Author: JewGo Development Team
Version: 1.0
"""

import argparse
import asyncio
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

def setup_environment():
    """Setup environment variables and configuration."""
    try:
        from dotenv import load_dotenv

        load_dotenv()
        print("✅ Environment variables loaded")
    except ImportError:
        print("⚠️  python-dotenv not available, using system environment")

def check_required_env_vars(operation: str):
    """Check for required environment variables based on operation."""
    required_vars = {
        "scrape": ["GOOGLE_PLACES_API_KEY"],
        "database": ["DATABASE_URL"],
        "monitor": ["DATABASE_URL"],
        "maintenance": ["DATABASE_URL"],
    }

    if operation in required_vars:
        missing_vars = []
        for var in required_vars[operation]:
            if not os.environ.get(var):
                missing_vars.append(var)

        if missing_vars:
            print(
                f"❌ Missing required environment variables: {', '.join(missing_vars)}"
            )
            return False

    return True

def print_header(operation: str):
    """Print operation header."""
    print(f"\n🚀 JewGo CLI - {operation.upper()}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 60)

def print_success(message: str):
    """Print success message."""
    print(f"✅ {message}")

def print_error(message: str):
    """Print error message."""
    print(f"❌ {message}")

def print_info(message: str):
    """Print info message."""
    print(f"ℹ️  {message}")

# Scraping Operations
async def scrape_(args):
    """Scrape Kosher Miami data."""
    try:
        from services.scraper_service import ScraperService
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()
        if not db_manager.connect():
            print_error("Failed to connect to database")
            return False

        scraper = ScraperService(db_manager=db_manager)

        print_info(f"Scraping Kosher Miami data (limit: {args.limit})")
        result = await scraper.scrape_(limit=args.limit)

        if result["success"]:
            print_success(f"Scraped {result['total_scraped']} establishments")
            print_info(f"Output files: {result['output_files']}")
            return True
        else:
            print_error(f"Scraping failed: {result['error']}")
            return False

    except Exception as e:
        print_error(f"Scraping error: {e}")
        return False

def scrape_google_reviews(args):
    """Scrape Google reviews."""
    try:
        from services.scraper_service import ScraperService
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()
        if not db_manager.connect():
            print_error("Failed to connect to database")
            return False

        scraper = ScraperService(db_manager=db_manager)

        if args.restaurant_id:
            print_info(f"Scraping reviews for restaurant {args.restaurant_id}")
            result = scraper.scrape_google_reviews(restaurant_id=args.restaurant_id)
        else:
            print_info(f"Batch scraping reviews (batch size: {args.batch_size})")
            result = scraper.scrape_google_reviews(batch_size=args.batch_size)

        if result["success"]:
            print_success(f"Processed {result.get('total_processed', 0)} restaurants")
            print_success(f"Updated {result.get('total_updated', 0)} restaurants")
            if result.get("errors"):
                print_error(f"Errors: {len(result['errors'])}")
            return True
        else:
            print_error(f"Scraping failed: {result['error']}")
            return False

    except Exception as e:
        print_error(f"Scraping error: {e}")
        return False

def scrape_images(args):
    """Scrape restaurant images."""
    try:
        from services.scraper_service import ScraperService
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()
        if not db_manager.connect():
            print_error("Failed to connect to database")
            return False

        scraper = ScraperService(db_manager=db_manager)

        if args.restaurant_id:
            print_info(f"Scraping images for restaurant {args.restaurant_id}")
            result = scraper.scrape_restaurant_images(restaurant_id=args.restaurant_id)
        else:
            print_info(f"Batch scraping images (limit: {args.limit})")
            result = scraper.scrape_restaurant_images(limit=args.limit)

        if result["success"]:
            print_success(f"Processed {result.get('total_processed', 0)} restaurants")
            print_success(f"Updated {result.get('total_updated', 0)} restaurants")
            if result.get("errors"):
                print_error(f"Errors: {len(result['errors'])}")
            return True
        else:
            print_error(f"Image scraping failed: {result['error']}")
            return False

    except Exception as e:
        print_error(f"Image scraping error: {e}")
        return False

# Database Operations
def database_health_check(args):
    """Check database health."""
    try:
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()

        print_info("Checking database connection...")
        if db_manager.connect():
            print_success("Database connection successful")

            print_info("Running health check...")
            if db_manager.health_check():
                print_success("Database health check passed")
                return True
            else:
                print_error("Database health check failed")
                return False
        else:
            print_error("Database connection failed")
            return False

    except Exception as e:
        print_error(f"Database health check error: {e}")
        return False

def database_statistics(args):
    """Show database statistics."""
    try:
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()
        if not db_manager.connect():
            print_error("Failed to connect to database")
            return False

        print_info("Getting database statistics...")
        stats = db_manager.get_statistics()

        if stats:
            print("\n📊 Database Statistics:")
            print("=" * 40)
            print(f"Total restaurants: {stats.get('total_restaurants', 0)}")
            print(f"Active restaurants: {stats.get('active_restaurants', 0)}")
            print(f"Restaurants with images: {stats.get('restaurants_with_images', 0)}")
            print(
                f"Restaurants with reviews: {stats.get('restaurants_with_reviews', 0)}"
            )
            print(
                f"Restaurants with websites: {stats.get('restaurants_with_websites', 0)}"
            )

            kosher_types = stats.get("kosher_types", {})
            if kosher_types:
                print("\n🍽️  Kosher Types:")
                for kosher_type, count in kosher_types.items():
                    print(f"  {kosher_type}: {count}")

            return True
        else:
            print_error("Could not get statistics")
            return False

    except Exception as e:
        print_error(f"Statistics error: {e}")
        return False

def database_cleanup(args):
    """Run database cleanup operations."""
    try:
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()
        if not db_manager.connect():
            print_error("Failed to connect to database")
            return False

        print_info("Running database cleanup...")

        # Remove duplicates
        if args.remove_duplicates:
            print_info("Removing duplicate restaurants...")
            # This would need to be implemented in the database manager
            print_info("Duplicate removal not yet implemented")

        # Update missing data
        if args.update_missing:
            print_info("Updating missing data...")
            # This would need to be implemented in the database manager
            print_info("Missing data update not yet implemented")

        print_success("Database cleanup completed")
        return True

    except Exception as e:
        print_error(f"Database cleanup error: {e}")
        return False

# Monitoring Operations
def monitor_health(args):
    """Monitor system health."""
    try:
        print_info("Checking system health...")

        # Check database
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()
        db_healthy = db_manager.connect() and db_manager.health_check()

        # Check services
        from services.health_service import HealthService

        health_service = HealthService()
        health_status = health_service.get_health_status()
        services_healthy = health_status["status"] == "healthy"

        print("\n🏥 System Health Report:")
        print("=" * 40)
        print(f"Database: {'✅ Healthy' if db_healthy else '❌ Unhealthy'}")
        print(f"Services: {'✅ Healthy' if services_healthy else '❌ Unhealthy'}")

        return db_healthy and services_healthy

    except Exception as e:
        print_error(f"Health monitoring error: {e}")
        return False

def monitor_performance(args):
    """Monitor system performance."""
    try:
        from services.scraper_service import ScraperService
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()
        if not db_manager.connect():
            print_error("Failed to connect to database")
            return False

        scraper = ScraperService(db_manager=db_manager)

        print_info("Getting performance statistics...")
        stats = scraper.get_scraping_statistics()

        if stats["success"]:
            print("\n📈 Performance Statistics:")
            print("=" * 40)
            data = stats["statistics"]
            print(f"Total restaurants: {data['total_restaurants']}")
            print(f"With images: {data['restaurants_with_images']}")
            print(f"With reviews: {data['restaurants_with_reviews']}")
            print(f"With websites: {data['restaurants_with_websites']}")

            # Calculate percentages
            if data["total_restaurants"] > 0:
                image_coverage = (
                    data["restaurants_with_images"] / data["total_restaurants"]
                ) * 100
                review_coverage = (
                    data["restaurants_with_reviews"] / data["total_restaurants"]
                ) * 100
                website_coverage = (
                    data["restaurants_with_websites"] / data["total_restaurants"]
                ) * 100

                print(f"\n📊 Coverage:")
                print(f"  Images: {image_coverage:.1f}%")
                print(f"  Reviews: {review_coverage:.1f}%")
                print(f"  Websites: {website_coverage:.1f}%")

            return True
        else:
            print_error(f"Performance monitoring failed: {stats['error']}")
            return False

    except Exception as e:
        print_error(f"Performance monitoring error: {e}")
        return False

# Maintenance Operations
def maintenance_backup(args):
    """Create database backup."""
    try:
        print_info("Creating database backup...")

        # This would need to be implemented
        print_info("Database backup not yet implemented")

        return True

    except Exception as e:
        print_error(f"Backup error: {e}")
        return False

def maintenance_cleanup(args):
    """Run maintenance cleanup."""
    try:
        print_info("Running maintenance cleanup...")

        # Clean up old files
        if args.cleanup_files:
            print_info("Cleaning up old files...")
            # This would need to be implemented
            print_info("File cleanup not yet implemented")

        # Clean up old logs
        if args.cleanup_logs:
            print_info("Cleaning up old logs...")
            # This would need to be implemented
            print_info("Log cleanup not yet implemented")

        print_success("Maintenance cleanup completed")
        return True

    except Exception as e:
        print_error(f"Maintenance cleanup error: {e}")
        return False

def main():
    """Main CLI function."""
    parser = argparse.ArgumentParser(
        description="JewGo CLI - Standardized Command Line Interface",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scrape Kosher Miami data
  python jewgo-cli.py scrape kosher-miami --limit 50
  
  # Scrape Google reviews for specific restaurant
  python jewgo-cli.py scrape reviews --restaurant-id 123
  
  # Batch scrape Google reviews
  python jewgo-cli.py scrape reviews --batch-size 20
  
  # Check database health
  python jewgo-cli.py database health
  
  # Show database statistics
  python jewgo-cli.py database stats
  
  # Monitor system health
  python jewgo-cli.py monitor health
  
  # Monitor performance
  python jewgo-cli.py monitor performance
        """,
    )

    subparsers = parser.add_subparsers(dest="operation", help="Available operations")

    # Scraping subcommands
    scrape_parser = subparsers.add_parser("scrape", help="Scraping operations")
    scrape_subparsers = scrape_parser.add_subparsers(
        dest="scrape_type", help="Scraping types"
    )

    # Kosher Miami scraping
    kosher_parser = scrape_subparsers.add_parser(
        "kosher-miami", help="Scrape Kosher Miami data"
    )
    kosher_parser.add_argument(
        "--limit", type=int, help="Limit number of establishments to scrape"
    )
    kosher_parser.set_defaults(func=lambda args: asyncio.run(scrape_(args)))

    # Google Reviews scraping
    reviews_parser = scrape_subparsers.add_parser(
        "reviews", help="Scrape Google reviews"
    )
    reviews_parser.add_argument(
        "--restaurant-id", type=int, help="Specific restaurant ID"
    )
    reviews_parser.add_argument(
        "--batch-size", type=int, default=10, help="Batch size for multiple restaurants"
    )
    reviews_parser.set_defaults(func=scrape_google_reviews)

    # Images scraping
    images_parser = scrape_subparsers.add_parser(
        "images", help="Scrape restaurant images"
    )
    images_parser.add_argument(
        "--restaurant-id", type=int, help="Specific restaurant ID"
    )
    images_parser.add_argument(
        "--limit", type=int, default=10, help="Limit for batch processing"
    )
    images_parser.set_defaults(func=scrape_images)

    # Database subcommands
    db_parser = subparsers.add_parser("database", help="Database operations")
    db_subparsers = db_parser.add_subparsers(
        dest="db_operation", help="Database operation types"
    )

    # Database health check
    health_parser = db_subparsers.add_parser("health", help="Check database health")
    health_parser.set_defaults(func=database_health_check)

    # Database statistics
    stats_parser = db_subparsers.add_parser("stats", help="Show database statistics")
    stats_parser.set_defaults(func=database_statistics)

    # Database cleanup
    cleanup_parser = db_subparsers.add_parser("cleanup", help="Run database cleanup")
    cleanup_parser.add_argument(
        "--remove-duplicates", action="store_true", help="Remove duplicate restaurants"
    )
    cleanup_parser.add_argument(
        "--update-missing", action="store_true", help="Update missing data"
    )
    cleanup_parser.set_defaults(func=database_cleanup)

    # Monitoring subcommands
    monitor_parser = subparsers.add_parser("monitor", help="Monitoring operations")
    monitor_subparsers = monitor_parser.add_subparsers(
        dest="monitor_type", help="Monitoring types"
    )

    # System health monitoring
    health_monitor_parser = monitor_subparsers.add_parser(
        "health", help="Monitor system health"
    )
    health_monitor_parser.set_defaults(func=monitor_health)

    # Performance monitoring
    perf_parser = monitor_subparsers.add_parser(
        "performance", help="Monitor system performance"
    )
    perf_parser.set_defaults(func=monitor_performance)

    # Maintenance subcommands
    maintenance_parser = subparsers.add_parser(
        "maintenance", help="Maintenance operations"
    )
    maintenance_subparsers = maintenance_parser.add_subparsers(
        dest="maintenance_type", help="Maintenance types"
    )

    # Backup
    backup_parser = maintenance_subparsers.add_parser(
        "backup", help="Create database backup"
    )
    backup_parser.set_defaults(func=maintenance_backup)

    # Cleanup
    cleanup_maintenance_parser = maintenance_subparsers.add_parser(
        "cleanup", help="Run maintenance cleanup"
    )
    cleanup_maintenance_parser.add_argument(
        "--cleanup-files", action="store_true", help="Clean up old files"
    )
    cleanup_maintenance_parser.add_argument(
        "--cleanup-logs", action="store_true", help="Clean up old logs"
    )
    cleanup_maintenance_parser.set_defaults(func=maintenance_cleanup)

    args = parser.parse_args()

    if not args.operation:
        parser.print_help()
        return

    # Setup environment
    setup_environment()

    # Check required environment variables
    if not check_required_env_vars(args.operation):
        sys.exit(1)

    # Print header
    print_header(args.operation)

    # Execute operation
    try:
        success = args.func(args)

        if success:
            print_success("Operation completed successfully!")
            sys.exit(0)
        else:
            print_error("Operation failed. Please check the errors above.")
            sys.exit(1)

    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
