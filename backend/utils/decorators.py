#!/usr/bin/env python3
"""Decorators Module.

This module provides a compatibility layer for decorator functions,
importing them from other modules as needed.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-08-28
"""

# Import safe_route decorator from api_v4 module
try:
    from routes.api_v4 import safe_route
except ImportError:
    # Fallback: create a no-op decorator if import fails
    def safe_route(path, methods=None, **kwargs):
        """Fallback safe route decorator."""
        def no_op_decorator(f):
            return f
        return no_op_decorator

__all__ = ["safe_route"]
