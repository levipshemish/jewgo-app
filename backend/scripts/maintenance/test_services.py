import os
import sys

    from app_factory import create_app
    from config.config import Config
    from database.database_manager_v3 import EnhancedDatabaseManager
    from services import GooglePlacesService, HealthService, RestaurantService
        import traceback





#!/usr/bin/env python3
"""Test script for the service layer architecture."""
# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
except ImportError as e:
    sys.exit(1)


def test_services() -> bool:
    """Test the service layer functionality."""
    try:
        # Create app to get configuration
        app = create_app()

        # Get database manager from app context
        with app.app_context():
            # Get the services from the app context
            services = app.config.get("SERVICES", {})
            db_manager = app.config.get("DB_MANAGER")

            # Test health service
            try:
                health_service = services.get("health_service")
                if health_service:
                    health_status = health_service.get_health_status()
                else:
                    pass
            except Exception as e:
                pass

            # Test restaurant service
            try:
                restaurant_service = services.get("restaurant_service")
                if restaurant_service:
                    # Get all restaurants
                    restaurants = restaurant_service.get_all_restaurants()

                    if restaurants:
                        # Test getting a specific restaurant
                        first_restaurant = restaurants[0]
                        restaurant_id = first_restaurant["id"]

                        restaurant = restaurant_service.get_restaurant_by_id(
                            restaurant_id,
                        )
                    else:
                        pass
                else:
                    pass
            except Exception as e:
                pass

            # Test Google Places service
            try:
                google_places_service = services.get("google_places_service")
                if google_places_service:
                    # Test getting restaurants without websites
                    if (
                        hasattr(google_places_service, "db_manager")
                        and google_places_service.db_manager
                    ):
                        restaurants_without_websites = google_places_service.db_manager.get_restaurants_without_websites(
                            limit=5,
                        )

                        if restaurants_without_websites:
                            for _restaurant in restaurants_without_websites[:3]:
                                pass
                        else:
                            pass
                    else:
                        pass
                else:
                    pass
            except Exception as e:
                pass

    except Exception as e:
        traceback.print_exc()
        return False

    return True


if __name__ == "__main__":
    success = test_services()
    sys.exit(0 if success else 1)
