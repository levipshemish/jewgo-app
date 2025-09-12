#!/usr/bin/env python3
"""Compatibility shim for the v5 connection manager.

This module aligns naming for code that imports a "v5 connection manager" by
re-exporting the actual v5 database manager implementation.
"""

from .database_manager_v5 import (
    DatabaseManagerV5 as ConnectionManagerV5,
    get_database_manager_v5 as get_connection_manager_v5,
)

__all__ = [
    "ConnectionManagerV5",
    "get_connection_manager_v5",
]

