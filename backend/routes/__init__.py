"""Routes module for JewGo Backend.
==============================

Organizes route blueprints and provides centralized route management.

Author: JewGo Development Team
Version: 1.0
"""

from . import restaurants, health_routes, redis_health

__all__ = [
    "restaurants",
    "health_routes", 
    "redis_health",
]
