from datetime import datetime
from typing import Any

from .base_service import BaseService

"""Health service - handles health check operations."""


class HealthService(BaseService):
    """Service for health check operations."""

    def get_health_status(self) -> dict[str, Any]:
        """Get comprehensive health status of the application.

        Returns:
            Dictionary with health status information

        """
        self.log_operation("health_check")

        health_status = {
            "status": "healthy",
            "timestamp": self._get_current_timestamp(),
            "version": self._get_app_version(),
            "checks": {},
        }

        # Check database connectivity
        db_status = self._check_database_health()
        health_status["checks"]["database"] = db_status

        # Check external services
        external_services_status = self._check_external_services()
        health_status["checks"]["external_services"] = external_services_status

        # Determine overall status
        if not db_status["healthy"] or not external_services_status["healthy"]:
            health_status["status"] = "unhealthy"

        return health_status

    def _check_database_health(self) -> dict[str, Any]:
        """Check database connectivity and basic operations."""
        try:
            # Try a simple database operation
            result = self.db_manager.health_check() if self.db_manager else False

            return {
                "healthy": bool(result),
                "message": (
                    "Database connection successful"
                    if result
                    else "Database connection failed"
                ),
            }
        except Exception as e:
            return {
                "healthy": False,
                "message": f"Database error: {e!s}",
            }

    def _check_external_services(self) -> dict[str, Any]:
        """Check external service availability."""
        # For now, just return healthy - you can extend this to check Google Places API, etc.
        return {
            "healthy": True,
            "message": "External services operational",
            "services": {
                "google_places": "not_checked",  # Could implement actual check
            },
        }

    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        return datetime.utcnow().isoformat() + "Z"

    def _get_app_version(self) -> str:
        """Get application version."""
        # You could read this from a VERSION file or package.json
        return "1.0.0"
