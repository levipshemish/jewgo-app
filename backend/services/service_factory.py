"""
Service Factory

This module provides a centralized factory for creating service instances,
reducing circular dependencies and improving dependency management.
"""

from typing import Optional, Dict, Any
from utils.logging_config import get_logger

logger = get_logger(__name__)


class ServiceFactory:
    """Factory for creating and managing service instances."""
    
    def __init__(self):
        self._services = {}
        self._db_manager = None
        self._cache_manager = None
        self._config_manager = None
    
    def set_dependencies(self, db_manager, cache_manager, config_manager):
        """Set the core dependencies for all services."""
        self._db_manager = db_manager
        self._cache_manager = cache_manager
        self._config_manager = config_manager
        logger.info("Service factory dependencies set")
    
    def get_restaurant_service(self) -> Optional[Any]:
        """Get or create RestaurantServiceV4 instance."""
        if 'restaurant' not in self._services:
            try:
                from services.restaurant_service_v4 import RestaurantServiceV4
                self._services['restaurant'] = RestaurantServiceV4(
                    db_manager=self._db_manager,
                    cache_manager=self._cache_manager,
                    config=self._config_manager
                )
                logger.info("RestaurantServiceV4 created successfully")
            except ImportError as e:
                logger.error(f"Could not import RestaurantServiceV4: {e}")
                return None
            except Exception as e:
                logger.error(f"Error creating RestaurantServiceV4: {e}")
                return None
        
        return self._services['restaurant']
    
    def get_review_service(self) -> Optional[Any]:
        """Get or create ReviewServiceV4 instance."""
        if 'review' not in self._services:
            try:
                from services.review_service_v4 import ReviewServiceV4
                self._services['review'] = ReviewServiceV4(
                    db_manager=self._db_manager,
                    cache_manager=self._cache_manager,
                    config=self._config_manager
                )
                logger.info("ReviewServiceV4 created successfully")
            except ImportError as e:
                logger.error(f"Could not import ReviewServiceV4: {e}")
                return None
            except Exception as e:
                logger.error(f"Error creating ReviewServiceV4: {e}")
                return None
        
        return self._services['review']
    
    def get_user_service(self) -> Optional[Any]:
        """Get or create UserServiceV4 instance."""
        if 'user' not in self._services:
            try:
                from services.user_service_v4 import UserServiceV4
                self._services['user'] = UserServiceV4(
                    db_manager=self._db_manager,
                    cache_manager=self._cache_manager,
                    config=self._config_manager
                )
                logger.info("UserServiceV4 created successfully")
            except ImportError as e:
                logger.error(f"Could not import UserServiceV4: {e}")
                return None
            except Exception as e:
                logger.error(f"Error creating UserServiceV4: {e}")
                return None
        
        return self._services['user']
    
    def get_marketplace_service(self) -> Optional[Any]:
        """Get or create MarketplaceServiceV4 instance."""
        if 'marketplace' not in self._services:
            try:
                from services.marketplace_service_v4 import MarketplaceServiceV4
                self._services['marketplace'] = MarketplaceServiceV4(
                    db_manager=self._db_manager,
                    cache_manager=self._cache_manager,
                    config=self._config_manager
                )
                logger.info("MarketplaceServiceV4 created successfully")
            except ImportError as e:
                logger.error(f"Could not import MarketplaceServiceV4: {e}")
                return None
            except Exception as e:
                logger.error(f"Error creating MarketplaceServiceV4: {e}")
                return None
        
        return self._services['marketplace']
    
    def get_search_service(self) -> Optional[Any]:
        """Get or create UnifiedSearchService instance."""
        if 'search' not in self._services:
            try:
                from utils.unified_search_service import UnifiedSearchService
                self._services['search'] = UnifiedSearchService(
                    self._db_manager, 
                    self._cache_manager
                )
                logger.info("UnifiedSearchService created successfully")
            except ImportError as e:
                logger.error(f"Could not import UnifiedSearchService: {e}")
                return None
            except Exception as e:
                logger.error(f"Error creating UnifiedSearchService: {e}")
                return None
        
        return self._services['search']
    
    def get_service(self, service_name: str) -> Optional[Any]:
        """Get a service by name."""
        service_map = {
            'restaurant': self.get_restaurant_service,
            'review': self.get_review_service,
            'user': self.get_user_service,
            'marketplace': self.get_marketplace_service,
            'search': self.get_search_service,
        }
        
        if service_name not in service_map:
            logger.error(f"Unknown service: {service_name}")
            return None
        
        return service_map[service_name]()
    
    def clear_services(self):
        """Clear all cached service instances."""
        self._services.clear()
        logger.info("Service factory cache cleared")
    
    def get_service_status(self) -> Dict[str, bool]:
        """Get status of all services."""
        status = {}
        for service_name in ['restaurant', 'review', 'user', 'marketplace', 'search']:
            service = self.get_service(service_name)
            status[service_name] = service is not None
        return status


# Global service factory instance
service_factory = ServiceFactory()


def get_service_factory() -> ServiceFactory:
    """Get the global service factory instance."""
    return service_factory


def initialize_service_factory(db_manager, cache_manager, config_manager):
    """Initialize the service factory with dependencies."""
    service_factory.set_dependencies(db_manager, cache_manager, config_manager)
    return service_factory
