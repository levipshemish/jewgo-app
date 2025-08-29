import os
from typing import Any, Dict, Optional, Type

from utils.logging_config import get_logger

from . import SERVICE_REGISTRY
from .base_service import BaseService

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Service Manager for JewGo Backend.
================================

Manages service lifecycle, dependency injection, and service health monitoring.
Provides a centralized way to access and manage all services.

Author: JewGo Development Team
Version: 1.0
"""


class ServiceManager:
    """Manages service instances and their dependencies."""

    def __init__(self, db_manager=None, config=None, cache_manager=None):
        """Initialize service manager with core dependencies.

        Args:
            db_manager: Database manager instance
            config: Configuration object
            cache_manager: Cache manager instance
        """
        self.db_manager = db_manager
        self.config = config
        self.cache_manager = cache_manager
        self.logger = logger.bind(component="ServiceManager")

        # Service instances cache
        self._services: Dict[str, BaseService] = {}

        # Service health tracking
        self._health_status: Dict[str, Dict[str, Any]] = {}

    def get_service(self, service_name: str) -> BaseService:
        """Get or create a service instance.

        Args:
            service_name: Name of the service to get

        Returns:
            Service instance

        Raises:
            ValueError: If service name is not registered
        """
        if service_name not in SERVICE_REGISTRY:
            raise ValueError(f"Service '{service_name}' not found in registry")

        if service_name not in self._services:
            self._services[service_name] = self._create_service(service_name)

        return self._services[service_name]

    def _create_service(self, service_name: str) -> BaseService:
        """Create a new service instance with dependencies.

        Args:
            service_name: Name of the service to create

        Returns:
            New service instance
        """
        service_class = SERVICE_REGISTRY[service_name]

        try:
            service = service_class(
                db_manager=self.db_manager,
                config=self.config,
                cache_manager=self.cache_manager,
            )
            self.logger.info("Service created", service=service_name)
            return service
        except Exception as error:
            self.logger.error(
                "Failed to create service",
                service=service_name,
                error=str(error),
            )
            raise

    def get_all_services(self) -> Dict[str, BaseService]:
        """Get all registered service instances.

        Returns:
            Dictionary of all service instances
        """
        # Create instances for all registered services
        for service_name in SERVICE_REGISTRY:
            if service_name not in self._services:
                self._services[service_name] = self._create_service(service_name)

        return self._services.copy()

    def get_health_status(self) -> Dict[str, Any]:
        """Get health status for all services.

        Returns:
            Dictionary with health information for all services
        """
        health_status = {
            "manager_healthy": True,
            "services": {},
            "summary": {
                "total_services": len(SERVICE_REGISTRY),
                "healthy_services": 0,
                "unhealthy_services": 0,
            },
        }

        for service_name in SERVICE_REGISTRY:
            try:
                service = self.get_service(service_name)
                service_health = service.get_health_status()
                health_status["services"][service_name] = service_health

                if service_health.get("healthy", True):
                    health_status["summary"]["healthy_services"] += 1
                else:
                    health_status["summary"]["unhealthy_services"] += 1

            except Exception as error:
                health_status["services"][service_name] = {
                    "healthy": False,
                    "error": str(error),
                }
                health_status["summary"]["unhealthy_services"] += 1
                health_status["manager_healthy"] = False

        return health_status

    def reset_all_services(self) -> None:
        """Reset all service instances (useful for testing)."""
        self._services.clear()
        self.logger.info("All services reset")

    def shutdown(self) -> None:
        """Shutdown all services and cleanup resources."""
        for service_name, service in self._services.items():
            try:
                if hasattr(service, "shutdown"):
                    service.shutdown()
                self.logger.info("Service shutdown", service=service_name)
            except Exception as error:
                self.logger.error(
                    "Error shutting down service",
                    service=service_name,
                    error=str(error),
                )

        self._services.clear()
        self.logger.info("Service manager shutdown complete")


# Global service manager instance
_service_manager: Optional[ServiceManager] = None


def get_service_manager() -> ServiceManager:
    """Get the global service manager instance.

    Returns:
        Service manager instance
    """
    if _service_manager is None:
        raise RuntimeError(
            "Service manager not initialized. Call initialize_service_manager() first."
        )
    return _service_manager


def initialize_service_manager(
    db_manager=None, config=None, cache_manager=None
) -> ServiceManager:
    """Initialize the global service manager.

    Args:
        db_manager: Database manager instance
        config: Configuration object
        cache_manager: Cache manager instance

    Returns:
        Initialized service manager
    """
    global _service_manager
    _service_manager = ServiceManager(db_manager, config, cache_manager)
    logger.info("Service manager initialized")
    return _service_manager


def shutdown_service_manager() -> None:
    """Shutdown the global service manager."""
    global _service_manager
    if _service_manager:
        _service_manager.shutdown()
        _service_manager = None
        logger.info("Service manager shutdown")
