#!/usr/bin/env python3
"""Database connection manager for JewGo App.
This module provides backward compatibility while delegating to the unified connection manager.
"""
import warnings
from typing import Optional, Dict, Any
from utils.logging_config import get_logger

# Import the unified connection manager
from .unified_connection_manager import (
    UnifiedConnectionManager,
    get_unified_connection_manager
)

logger = get_logger(__name__)

# Issue deprecation warning
warnings.warn(
    "DatabaseConnectionManager is deprecated. Use UnifiedConnectionManager instead.",
    DeprecationWarning,
    stacklevel=2
)


class DatabaseConnectionManager:
    """
    Backward compatibility wrapper for the unified connection manager.
    
    This class delegates all operations to the UnifiedConnectionManager
    while maintaining the same interface for existing code.
    """
    
    def __init__(self, database_url: Optional[str] = None) -> None:
        """Initialize connection manager with connection string."""
        self._unified_manager = UnifiedConnectionManager(database_url)
        logger.warning(
            "DatabaseConnectionManager is deprecated. "
            "Consider migrating to UnifiedConnectionManager for better features."
        )
    
    def connect(self) -> bool:
        """Establish database connection."""
        return self._unified_manager.connect()
    
    def disconnect(self):
        """Disconnect from database."""
        self._unified_manager.disconnect()
    
    def is_connected(self) -> bool:
        """Check if connected to database."""
        return self._unified_manager.is_connected()
    
    def get_session(self):
        """Get a database session."""
        return self._unified_manager.get_session()
    
    def session_scope(self):
        """Get session context manager."""
        return self._unified_manager.session_scope()
    
    def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None):
        """Execute a query."""
        return self._unified_manager.execute_query(query, params)
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check."""
        return self._unified_manager.health_check()


# Global instance for backward compatibility
_connection_manager = None


def get_connection_manager() -> DatabaseConnectionManager:
    """
    Get the global connection manager instance (backward compatibility).
    
    Note: This function is deprecated. Use get_unified_connection_manager() instead.
    """
    global _connection_manager
    
    if _connection_manager is None:
        _connection_manager = DatabaseConnectionManager()
    
    return _connection_manager


# Export the unified manager functions as well
__all__ = [
    'DatabaseConnectionManager',
    'get_connection_manager',
    'UnifiedConnectionManager', 
    'get_unified_connection_manager'
]