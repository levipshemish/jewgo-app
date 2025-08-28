#!/usr/bin/env python3
"""Decorators Module.

This module provides a compatibility layer for decorator functions,
importing them from other modules as needed.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-08-28
"""

# Define safe_route decorator locally to avoid circular imports
def safe_route(path, methods=None, **kwargs):
    """Safe route decorator that works with any blueprint."""
    def route_decorator(f):
        return f
    return route_decorator

__all__ = ["safe_route"]
