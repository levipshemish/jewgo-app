#!/usr/bin/env python3
"""
Data version utility for v5 API cursor validation.

Provides data version management for cursor pagination to ensure
cursor compatibility across API versions and data schema changes.
"""

from __future__ import annotations

import hashlib
import os
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from backend.utils.logging_config import get_logger

logger = get_logger(__name__)


class DataVersionManager:
    """Manages data versioning for cursor validation and API compatibility."""
    
    def __init__(self):
        self._version_cache: Dict[str, str] = {}
        self._cache_ttl = 300  # 5 minutes
        self._last_cache_update = 0
    
    def get_current_data_version(self, entity_type: Optional[str] = None) -> str:
        """
        Get the current data version for cursor validation.
        
        Args:
            entity_type: Optional entity type for entity-specific versioning
            
        Returns:
            Current data version string
        """
        try:
            # Check cache first
            cache_key = entity_type or 'global'
            current_time = time.time()
            
            if (cache_key in self._version_cache and 
                current_time - self._last_cache_update < self._cache_ttl):
                return self._version_cache[cache_key]
            
            # Generate or retrieve version
            version = self._generate_data_version(entity_type)
            
            # Update cache
            self._version_cache[cache_key] = version
            self._last_cache_update = current_time
            
            logger.debug(f"Generated data version for {cache_key}: {version}")
            return version
            
        except Exception as e:
            logger.error(f"Error getting data version: {e}")
            return self._get_fallback_version()
    
    def _generate_data_version(self, entity_type: Optional[str] = None) -> str:
        """Generate a data version based on current system state."""
        try:
            # Base version components
            version_components = []
            
            # API version
            version_components.append('v5.0')
            
            # Environment
            env = os.getenv('ENVIRONMENT', 'development')
            version_components.append(env)
            
            # Entity type if specified
            if entity_type:
                version_components.append(entity_type)
            
            # Schema version (could be based on migration state)
            schema_version = self._get_schema_version(entity_type)
            if schema_version:
                version_components.append(schema_version)
            
            # Build version string
            base_version = '.'.join(version_components)
            
            # Add hash for uniqueness
            timestamp = datetime.now(timezone.utc).isoformat()
            hash_input = f"{base_version}:{timestamp}"
            version_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8]
            
            return f"{base_version}.{version_hash}"
            
        except Exception as e:
            logger.error(f"Error generating data version: {e}")
            return self._get_fallback_version()
    
    def _get_schema_version(self, entity_type: Optional[str] = None) -> Optional[str]:
        """Get schema version for the entity type."""
        try:
            # This could be enhanced to check actual database schema versions
            # For now, return a static version based on entity type
            
            schema_versions = {
                'restaurants': 'schema_v1',
                'synagogues': 'schema_v1', 
                'mikvahs': 'schema_v1',
                'stores': 'schema_v1',
                'reviews': 'schema_v1',
                'orders': 'schema_v1'
            }
            
            if entity_type:
                return schema_versions.get(entity_type, 'schema_v1')
            
            return 'schema_v1'
            
        except Exception as e:
            logger.error(f"Error getting schema version: {e}")
            return None
    
    def _get_fallback_version(self) -> str:
        """Get a fallback version when generation fails."""
        return 'v5.0.fallback'
    
    def validate_cursor_version(
        self, 
        cursor_version: str, 
        entity_type: Optional[str] = None,
        strict: bool = False
    ) -> bool:
        """
        Validate if a cursor version is compatible with current data version.
        
        Args:
            cursor_version: Version from cursor
            entity_type: Entity type for validation
            strict: If True, requires exact match; if False, allows compatible versions
            
        Returns:
            True if compatible, False otherwise
        """
        try:
            current_version = self.get_current_data_version(entity_type)
            
            if strict:
                return cursor_version == current_version
            
            # Non-strict validation - check major version compatibility
            cursor_parts = cursor_version.split('.')
            current_parts = current_version.split('.')
            
            # Check major version (v5)
            if len(cursor_parts) >= 1 and len(current_parts) >= 1:
                if cursor_parts[0] != current_parts[0]:
                    logger.warning(
                        f"Cursor version incompatible: {cursor_version} vs {current_version}"
                    )
                    return False
            
            # Check minor version compatibility
            if len(cursor_parts) >= 2 and len(current_parts) >= 2:
                cursor_minor = cursor_parts[1]
                current_minor = current_parts[1]
                
                # Allow backward compatibility within same minor version
                if cursor_minor != current_minor:
                    logger.info(
                        f"Cursor minor version differs: {cursor_version} vs {current_version}"
                    )
                    # Could implement more sophisticated compatibility logic here
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating cursor version: {e}")
            return False
    
    def get_version_info(self) -> Dict[str, Any]:
        """Get comprehensive version information."""
        try:
            return {
                'current_global_version': self.get_current_data_version(),
                'entity_versions': {
                    entity: self.get_current_data_version(entity)
                    for entity in ['restaurants', 'synagogues', 'mikvahs', 'stores']
                },
                'cache_info': {
                    'cached_versions': list(self._version_cache.keys()),
                    'cache_ttl': self._cache_ttl,
                    'last_update': self._last_cache_update
                },
                'environment': os.getenv('ENVIRONMENT', 'development'),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting version info: {e}")
            return {
                'error': str(e),
                'fallback_version': self._get_fallback_version()
            }
    
    def clear_cache(self):
        """Clear the version cache."""
        self._version_cache.clear()
        self._last_cache_update = 0
        logger.info("Data version cache cleared")


# Global instance
data_version_manager = DataVersionManager()


# Convenience functions
def get_current_data_version(entity_type: Optional[str] = None) -> str:
    """Get the current data version."""
    return data_version_manager.get_current_data_version(entity_type)


def validate_cursor_version(
    cursor_version: str, 
    entity_type: Optional[str] = None,
    strict: bool = False
) -> bool:
    """Validate cursor version compatibility."""
    return data_version_manager.validate_cursor_version(cursor_version, entity_type, strict)


def get_version_info() -> Dict[str, Any]:
    """Get version information."""
    return data_version_manager.get_version_info()


def clear_version_cache():
    """Clear version cache."""
    data_version_manager.clear_cache()


# Version constants for common use cases
V5_DATA_VERSION = 'v5.0'
FALLBACK_VERSION = 'v5.0.fallback'

# Entity-specific version getters
def get_restaurant_data_version() -> str:
    """Get data version for restaurants."""
    return get_current_data_version('restaurants')


def get_synagogue_data_version() -> str:
    """Get data version for synagogues."""
    return get_current_data_version('synagogues')


def get_mikvah_data_version() -> str:
    """Get data version for mikvahs."""
    return get_current_data_version('mikvahs')


def get_store_data_version() -> str:
    """Get data version for stores."""
    return get_current_data_version('stores')