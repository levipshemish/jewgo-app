"""Routes module for JewGo Backend.
==============================
Organizes route blueprints and provides centralized route management.
Author: JewGo Development Team
Version: 1.0
"""

# Import only the proper health routes
from . import health_proper

__all__ = [
    "health_proper",
]
