#!/usr/bin/env python3
"""Hours Backfill Script for JewGo App.
====================================

This script populates the database with real hours data from Google Places
and ORB sources. It runs the migration first, then fetches hours for all
restaurants that don't have normalized hours data.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import csv
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

try:
    from database.database_manager_v3 import EnhancedDatabaseManager
    from services.hours_normalizer import hours_normalizer
    from services.hours_sources import hours_sources
    from database.migrations.consolidate_hours_normalized import run_migration
except ImportError as e:
    print(f"Error importing modules: {e}")
    sys.exit(1)

import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


class HoursBackfill:
    """Service for backfilling hours data."""
    
    def __init__(self):
        self.logger = logger
        self.db_manager = None
        self.stats = {
            "total_restaurants": 0,
            "processed": 0,
            "google_success": 0,
            "google_failed": 0,
            "orb_success": 0,
            "orb_failed": 0,
            "errors": 0,
            "skipped": 0
        }
        self.failures = []
    
    def run(self):
        """Run the complete hours backfill process."""
        try:
            print("🚀 Starting Hours Backfill Process")
            print("=" * 50)
            
            # Step 1: Run migration
            print("\n📊 Step 1: Running hours consolidation migration...")
            migration_success = run_migration()
            if not migration_success:
                print("❌ Migration failed, aborting backfill")
                return False
            
            # Step 2: Initialize database connection
            print("\n🔌 Step 2: Initializing database connection...")
            if not self._init_database():
                print("❌ Failed to connect to database")
                return False
            
            # Step 3: Get restaurants that need hours
            print("\n📋 Step 3: Identifying restaurants needing hours...")
            restaurants = self._get_restaurants_needing_hours()
            self.stats["total_restaurants"] = len(restaurants)
            
            if not restaurants:
                print("✅ All restaurants already have hours data")
                return True
            
            print(f"📝 Found {len(restaurants)} restaurants needing hours")
            
            # Step 4: Process each restaurant
            print("\n🔄 Step 4: Processing restaurants...")
            for i, restaurant in enumerate(restaurants, 1):
                print(f"\n[{i}/{len(restaurants)}] Processing: {restaurant['name']}")
                self._process_restaurant(restaurant)
            
            # Step 5: Generate report
            print("\n📈 Step 5: Generating backfill report...")
            self._generate_report()
            
            print("\n✅ Hours backfill completed!")
            return True
            
        except Exception as e:
            self.logger.error(f"Hours backfill failed: {e}")
            print(f"❌ Hours backfill failed: {e}")
            return False
    
    def _init_database(self) -> bool:
        """Initialize database connection."""
        try:
            database_url = os.environ.get("DATABASE_URL")
            if not database_url:
                print("❌ DATABASE_URL environment variable not set")
                return False
            
            self.db_manager = EnhancedDatabaseManager(database_url)
            if not self.db_manager.connect():
                print("❌ Failed to connect to database")
                return False
            
            print("✅ Database connection established")
            return True
            
        except Exception as e:
            self.logger.error(f"Database initialization failed: {e}")
            return False
    
    def _get_restaurants_needing_hours(self) -> List[Dict[str, Any]]:
        """Get restaurants that need hours data."""
        try:
            # Get all restaurants
            restaurants = self.db_manager.get_restaurants(limit=1000)
            
            # Filter restaurants that need hours
            needing_hours = []
            for restaurant in restaurants:
                hours_json = restaurant.get("hours_of_operation")
                
                # Check if hours are missing or invalid
                needs_hours = False
                if not hours_json:
                    needs_hours = True
                elif isinstance(hours_json, str):
                    try:
                        hours_doc = json.loads(hours_json)
                        # Check if it's just the basic structure from migration
                        if self._is_basic_hours_structure(hours_doc):
                            needs_hours = True
                    except json.JSONDecodeError:
                        needs_hours = True
                
                if needs_hours:
                    needing_hours.append(restaurant)
            
            return needing_hours
            
        except Exception as e:
            self.logger.error(f"Error getting restaurants needing hours: {e}")
            return []
    
    def _is_basic_hours_structure(self, hours_doc: Dict[str, Any]) -> bool:
        """Check if hours document is just the basic structure from migration."""
        try:
            # Check if it has the basic structure but no real data
            if not hours_doc.get("weekly"):
                return True
            
            # Check if all days are empty
            for day in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]:
                if hours_doc["weekly"].get(day):
                    return False
            
            # Check if it has migration source
            source = hours_doc.get("source", {})
            if source.get("manual", {}).get("updated_by") == "migration":
                return True
            
            return False
            
        except Exception:
            return True
    
    def _process_restaurant(self, restaurant: Dict[str, Any]):
        """Process a single restaurant to get hours data."""
        try:
            restaurant_id = restaurant["id"]
            name = restaurant["name"]
            
            self.stats["processed"] += 1
            
            # Try Google Places first
            google_hours = self._try_google_hours(restaurant)
            if google_hours:
                self._save_hours(restaurant_id, google_hours, "google_places")
                self.stats["google_success"] += 1
                print(f"  ✅ Got hours from Google Places")
                return
            
            # Try ORB if Google failed
            orb_hours = self._try_orb_hours(restaurant)
            if orb_hours:
                self._save_hours(restaurant_id, orb_hours, "orb")
                self.stats["orb_success"] += 1
                print(f"  ✅ Got hours from ORB")
                return
            
            # No hours found
            self.stats["skipped"] += 1
            print(f"  ⚠️  No hours found from any source")
            
            # Record failure
            self.failures.append({
                "restaurant_id": restaurant_id,
                "name": name,
                "reason": "No hours found from any source",
                "google_place_id": restaurant.get("google_place_id"),
                "website": restaurant.get("website")
            })
            
        except Exception as e:
            self.stats["errors"] += 1
            self.logger.error(f"Error processing restaurant {restaurant['id']}: {e}")
            print(f"  ❌ Error: {e}")
            
            # Record failure
            self.failures.append({
                "restaurant_id": restaurant["id"],
                "name": restaurant["name"],
                "reason": str(e),
                "google_place_id": restaurant.get("google_place_id"),
                "website": restaurant.get("website")
            })
    
    def _try_google_hours(self, restaurant: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Try to get hours from Google Places."""
        try:
            place_id = restaurant.get("google_place_id")
            if not place_id:
                return None
            
            # Fetch from Google
            google_hours = hours_sources.fetch_google_hours(place_id)
            if not google_hours:
                return None
            
            # Get timezone
            timezone = restaurant.get("timezone", "America/New_York")
            
            # Normalize hours
            normalized_hours = hours_normalizer.normalize_from_google(google_hours, timezone)
            
            return normalized_hours
            
        except Exception as e:
            self.logger.error(f"Error getting Google hours for restaurant {restaurant['id']}: {e}")
            return None
    
    def _try_orb_hours(self, restaurant: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Try to get hours from ORB."""
        try:
            # Try website first, then construct ORB URL
            cert_url = restaurant.get("website")
            if not cert_url:
                # Could try to construct ORB URL from restaurant name/location
                return None
            
            # Fetch from ORB
            orb_hours = hours_sources.fetch_orb_hours(cert_url)
            if not orb_hours:
                return None
            
            # Get timezone
            timezone = restaurant.get("timezone", "America/New_York")
            
            # Normalize hours
            normalized_hours = hours_normalizer.normalize_from_orb(orb_hours, timezone)
            
            return normalized_hours
            
        except Exception as e:
            self.logger.error(f"Error getting ORB hours for restaurant {restaurant['id']}: {e}")
            return None
    
    def _save_hours(self, restaurant_id: int, hours_doc: Dict[str, Any], source: str):
        """Save hours to database."""
        try:
            # Validate hours
            hours_normalizer.validate_hours(hours_doc)
            
            # Update database
            success = self.db_manager.update_restaurant_data(
                restaurant_id,
                {"hours_of_operation": json.dumps(hours_doc)}
            )
            
            if not success:
                raise Exception("Failed to save hours to database")
            
            self.logger.info(
                f"Saved hours for restaurant {restaurant_id}",
                source=source
            )
            
        except Exception as e:
            self.logger.error(f"Error saving hours for restaurant {restaurant_id}: {e}")
            raise
    
    def _generate_report(self):
        """Generate backfill report."""
        try:
            # Print summary
            print(f"\n📊 Backfill Summary:")
            print(f"  Total restaurants: {self.stats['total_restaurants']}")
            print(f"  Processed: {self.stats['processed']}")
            print(f"  Google success: {self.stats['google_success']}")
            print(f"  Google failed: {self.stats['google_failed']}")
            print(f"  ORB success: {self.stats['orb_success']}")
            print(f"  ORB failed: {self.stats['orb_failed']}")
            print(f"  Errors: {self.stats['errors']}")
            print(f"  Skipped: {self.stats['skipped']}")
            
            # Calculate success rate
            total_attempted = self.stats["processed"]
            total_success = self.stats["google_success"] + self.stats["orb_success"]
            success_rate = (total_success / total_attempted * 100) if total_attempted > 0 else 0
            
            print(f"  Success rate: {success_rate:.1f}%")
            
            # Save failures to CSV
            if self.failures:
                self._save_failures_csv()
            
            # Log final stats
            self.logger.info(
                "Hours backfill completed",
                stats=self.stats,
                success_rate=success_rate
            )
            
        except Exception as e:
            self.logger.error(f"Error generating report: {e}")
    
    def _save_failures_csv(self):
        """Save failures to CSV file."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"hours_backfill_failures_{timestamp}.csv"
            
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['restaurant_id', 'name', 'reason', 'google_place_id', 'website']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                for failure in self.failures:
                    writer.writerow(failure)
            
            print(f"  📄 Failures saved to: {filename}")
            
        except Exception as e:
            self.logger.error(f"Error saving failures CSV: {e}")


def main():
    """Main entry point."""
    try:
        backfill = HoursBackfill()
        success = backfill.run()
        
        if success:
            print("\n🎉 Hours backfill completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Hours backfill failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️  Backfill interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
