"""Services module for JewGo Backend.
===============================

Provides service layer abstraction for business logic, separating concerns
from route handlers and improving maintainability.

Author: JewGo Development Team
Version: 2.0
"""

from typing import Dict, Type

from .base_service import BaseService
from .google_places_service import GooglePlacesService
from .health_service import HealthService
from .restaurant_service import RestaurantService
from .restaurant_status_service import RestaurantStatusService
from .scraper_service import ScraperService

# hours_compute doesn't export a service class, it's just functions
# # hours_compute doesn't export a service class, it's just functions
# from .hours_compute import HoursComputeService
# hours_normalizer doesn't export a service class, it's just functions
# from .hours_normalizer import HoursNormalizerService
# hours_sources doesn't export a service class, it's just functions
# from .hours_sources import HoursSourcesService

# Service registry for dependency injection
SERVICE_REGISTRY: Dict[str, Type[BaseService]] = {
    "restaurant": RestaurantService,
    "google_places": GooglePlacesService,
    "restaurant_status": RestaurantStatusService,
    "scraper": ScraperService,
    "health": HealthService,
    # "hours_compute": HoursComputeService,  # hours_compute is just functions
    # "hours_normalizer": HoursNormalizerService,  # hours_normalizer is just functions
    # "hours_sources": HoursSourcesService,  # hours_sources is just functions
}

__all__ = [
    "BaseService",
    "RestaurantService",
    "GooglePlacesService",
    "RestaurantStatusService",
    "ScraperService",
    "HealthService",
    # "HoursComputeService",  # hours_compute is just functions
    # "HoursNormalizerService",  # hours_normalizer is just functions
    # "HoursSourcesService",  # hours_sources is just functions
    "SERVICE_REGISTRY",
]
