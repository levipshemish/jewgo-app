"""
Watermark-based ETag system for v5 API efficient caching.

Implements ETag generation and validation using database watermarks for
efficient cache validation, integration with cursor pagination, support for
entity-specific and collection-level ETags, and automatic ETag header management.
"""

from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from flask import request, g

from utils.logging_config import get_logger

logger = get_logger(__name__)


class ETagV5Manager:
    """Enhanced ETag manager for v5 API with watermark-based generation."""
    
    # ETag version for format changes
    ETAG_VERSION = '5'
    
    # Cache durations (in seconds)
    ETAG_CACHE_DURATION = 300  # 5 minutes
    WATERMARK_CACHE_DURATION = 60  # 1 minute
    
    # Entity types and their watermark strategies
    ENTITY_WATERMARK_STRATEGIES = {
        'restaurants': {
            'table': 'restaurants',
            'timestamp_column': 'updated_at',
            'include_reviews': True,
            'include_hours': True,
        },
        'synagogues': {
            'table': 'synagogues',
            'timestamp_column': 'updated_at',
            'include_reviews': False,
            'include_hours': True,
        },
        'mikvahs': {
            'table': 'mikvah',
            'timestamp_column': 'updated_at',
            'include_reviews': False,
            'include_hours': True,
        },
        'stores': {
            'table': 'stores',
            'timestamp_column': 'updated_at',
            'include_reviews': False,
            'include_hours': True,
        }
    }
    
    def __init__(self):
        self.version = self.ETAG_VERSION
    
    def generate_collection_etag(
        self,
        entity_type: str,
        filters: Optional[Dict[str, Any]] = None,
        sort_key: str = 'created_at_desc',
        page_size: Optional[int] = None,
        cursor_token: Optional[str] = None,
        user_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate ETag for a collection of entities using watermark strategy.
        
        Args:
            entity_type: Type of entity (restaurants, synagogues, etc.)
            filters: Applied filters
            sort_key: Sorting strategy
            page_size: Number of items per page
            cursor_token: Pagination cursor
            user_context: User-specific context for personalization
            
        Returns:
            Strong ETag value
        """
        try:
            # Get entity watermark
            watermark = self._get_entity_watermark(entity_type)
            
            # Build ETag components
            etag_components = {
                'version': self.version,
                'entity_type': entity_type,
                'watermark': watermark,
                'sort_key': sort_key,
            }
            
            # Add normalized filters
            if filters:
                normalized_filters = self._normalize_filters(filters)
                if normalized_filters:
                    etag_components['filters'] = normalized_filters
            
            # Add pagination info
            if page_size:
                etag_components['page_size'] = page_size
                
            if cursor_token:
                # Extract cursor position for ETag (not the full token for security)
                cursor_position = self._extract_cursor_position_for_etag(cursor_token)
                if cursor_position:
                    etag_components['cursor_pos'] = cursor_position
            
            # Add user context for personalization
            if user_context:
                user_factors = self._extract_user_factors(user_context)
                if user_factors:
                    etag_components['user'] = user_factors
            
            # Generate strong ETag
            etag_value = self._compute_etag_hash(etag_components)
            strong_etag = f'"{etag_value}"'
            
            logger.debug(
                "Generated collection ETag",
                entity_type=entity_type,
                etag=strong_etag[:12] + "...",
                watermark=watermark[:8] + "..." if watermark else None
            )
            
            return strong_etag
            
        except Exception as e:
            logger.error("Failed to generate collection ETag", error=str(e), entity_type=entity_type)
            # Return fallback ETag based on timestamp
            fallback_hash = hashlib.md5(f"{entity_type}:{int(time.time() // 60)}".encode()).hexdigest()
            return f'"{fallback_hash[:16]}"'
    
    def generate_entity_etag(
        self,
        entity_type: str,
        entity_id: int,
        entity_data: Optional[Dict[str, Any]] = None,
        include_relations: bool = True
    ) -> str:
        """
        Generate ETag for a single entity.
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            entity_data: Preloaded entity data (optional)
            include_relations: Whether to include related data in ETag
            
        Returns:
            Strong ETag value
        """
        try:
            etag_components = {
                'version': self.version,
                'entity_type': entity_type,
                'entity_id': entity_id,
            }
            
            if entity_data:
                # Use provided entity data
                etag_components['updated_at'] = self._extract_timestamp(entity_data.get('updated_at'))
                
                # Include key fields that affect representation
                key_fields = ['name', 'status', 'kosher_category', 'latitude', 'longitude']
                for field in key_fields:
                    if field in entity_data:
                        etag_components[field] = entity_data[field]
                
                # Include relations if requested
                if include_relations:
                    relations_hash = self._compute_relations_hash(entity_type, entity_id, entity_data)
                    if relations_hash:
                        etag_components['relations'] = relations_hash
            else:
                # Get entity watermark as fallback
                entity_watermark = self._get_single_entity_watermark(entity_type, entity_id)
                etag_components['watermark'] = entity_watermark
            
            etag_value = self._compute_etag_hash(etag_components)
            strong_etag = f'"{etag_value}"'
            
            logger.debug(
                "Generated entity ETag",
                entity_type=entity_type,
                entity_id=entity_id,
                etag=strong_etag[:12] + "..."
            )
            
            return strong_etag
            
        except Exception as e:
            logger.error(
                "Failed to generate entity ETag", 
                error=str(e), 
                entity_type=entity_type, 
                entity_id=entity_id
            )
            # Return fallback ETag
            fallback_hash = hashlib.md5(f"{entity_type}:{entity_id}:{int(time.time() // 300)}".encode()).hexdigest()
            return f'"{fallback_hash[:16]}"'
    
    def validate_etag(self, provided_etag: str, current_etag: str) -> bool:
        """
        Validate if provided ETag matches current ETag.
        
        Args:
            provided_etag: ETag from client request
            current_etag: Currently computed ETag
            
        Returns:
            True if ETags match, False otherwise
        """
        try:
            # Remove weak indicator and quotes for comparison
            normalized_provided = self._normalize_etag(provided_etag)
            normalized_current = self._normalize_etag(current_etag)
            
            if normalized_provided == normalized_current:
                logger.debug("ETag validation successful")
                return True
            
            logger.debug(
                "ETag validation failed",
                provided=normalized_provided[:12] + "...",
                current=normalized_current[:12] + "..."
            )
            return False
            
        except Exception as e:
            logger.error("ETag validation error", error=str(e))
            return False
    
    def process_conditional_request(
        self, 
        current_etag: str
    ) -> Tuple[bool, Optional[int]]:
        """
        Process conditional request headers (If-None-Match, If-Match).
        
        Args:
            current_etag: Currently computed ETag
            
        Returns:
            Tuple of (should_return_304, status_code)
        """
        try:
            # Handle If-None-Match (typically for GET requests)
            if_none_match = request.headers.get('If-None-Match')
            if if_none_match:
                if if_none_match == '*':
                    # Resource exists, return 304
                    return True, 304
                
                # Check if any ETag matches
                provided_etags = [etag.strip() for etag in if_none_match.split(',')]
                for etag in provided_etags:
                    if self.validate_etag(etag, current_etag):
                        return True, 304
            
            # Handle If-Match (typically for PUT/DELETE requests)
            if_match = request.headers.get('If-Match')
            if if_match:
                if if_match != '*':
                    provided_etags = [etag.strip() for etag in if_match.split(',')]
                    etag_matches = any(
                        self.validate_etag(etag, current_etag) for etag in provided_etags
                    )
                    if not etag_matches:
                        return False, 412  # Precondition Failed
            
            return False, None
            
        except Exception as e:
            logger.error("Conditional request processing error", error=str(e))
            return False, None
    
    def add_etag_headers(self, response, etag_value: str, cache_control: str = 'max-age=300'):
        """
        Add ETag and related headers to response.
        
        Args:
            response: Flask response object
            etag_value: ETag value to set
            cache_control: Cache-Control header value
        """
        try:
            response.headers['ETag'] = etag_value
            response.headers['Cache-Control'] = cache_control
            response.headers['Vary'] = 'Accept, Authorization, Accept-Encoding'
            
            # Add Last-Modified if we can determine it
            last_modified = self._extract_last_modified_from_etag(etag_value)
            if last_modified:
                response.headers['Last-Modified'] = last_modified.strftime('%a, %d %b %Y %H:%M:%S GMT')
            
        except Exception as e:
            logger.error("Failed to add ETag headers", error=str(e))
    
    def _get_entity_watermark(self, entity_type: str) -> str:
        """Get watermark timestamp for entity type."""
        try:
            # Try to get from cache first
            cache_key = f"etag_v5:watermark:{entity_type}"
            
            # Get from Redis cache if available
            cached_watermark = self._get_from_cache(cache_key)
            if cached_watermark:
                return cached_watermark
            
            # Get strategy for entity type
            strategy = self.ENTITY_WATERMARK_STRATEGIES.get(entity_type)
            if not strategy:
                logger.warning(f"No watermark strategy for entity type: {entity_type}")
                return str(int(time.time()))
            
            # Query database for watermark
            watermark = self._query_database_watermark(strategy)
            
            # Cache the result
            self._set_in_cache(cache_key, watermark, self.WATERMARK_CACHE_DURATION)
            
            return watermark
            
        except Exception as e:
            logger.error("Failed to get entity watermark", error=str(e), entity_type=entity_type)
            return str(int(time.time()))
    
    def _get_single_entity_watermark(self, entity_type: str, entity_id: int) -> str:
        """Get watermark for a single entity."""
        try:
            cache_key = f"etag_v5:entity:{entity_type}:{entity_id}"
            
            cached_watermark = self._get_from_cache(cache_key)
            if cached_watermark:
                return cached_watermark
            
            # Query single entity watermark
            strategy = self.ENTITY_WATERMARK_STRATEGIES.get(entity_type, {})
            watermark = self._query_single_entity_watermark(strategy, entity_id)
            
            # Cache with shorter TTL for single entities
            self._set_in_cache(cache_key, watermark, 60)
            
            return watermark
            
        except Exception as e:
            logger.error("Failed to get single entity watermark", error=str(e))
            return str(int(time.time()))
    
    def _query_database_watermark(self, strategy: Dict[str, Any]) -> str:
        """Query database for collection watermark."""
        try:
            from backend.database.connection_manager import get_connection_manager
            
            connection_manager = get_connection_manager()
            
            with connection_manager.session_scope() as session:
                from sqlalchemy import text
                
                table = strategy['table']
                timestamp_col = strategy['timestamp_column']
                
                # Base query for max timestamp
                query = f"SELECT MAX({timestamp_col}) as max_timestamp FROM {table}"
                conditions = ["status != 'deleted'"]  # Exclude deleted entities
                
                # Add related tables if needed
                if strategy.get('include_reviews'):
                    query += f" LEFT JOIN reviews r ON r.{table[:-1]}_id = {table}.id"
                    query += f" LEFT JOIN (SELECT MAX(updated_at) as max_review_updated FROM reviews) rv ON true"
                
                if strategy.get('include_hours'):
                    query += f" LEFT JOIN {table}_hours h ON h.{table[:-1]}_id = {table}.id"
                
                # Add conditions
                if conditions:
                    query += " WHERE " + " AND ".join(conditions)
                
                result = session.execute(text(query)).fetchone()
                
                if result and result.max_timestamp:
                    # Convert to timestamp
                    if isinstance(result.max_timestamp, datetime):
                        timestamp = int(result.max_timestamp.timestamp())
                    else:
                        timestamp = int(time.time())
                else:
                    timestamp = int(time.time())
                
                return str(timestamp)
                
        except Exception as e:
            logger.error("Database watermark query failed", error=str(e))
            return str(int(time.time()))
    
    def _query_single_entity_watermark(self, strategy: Dict[str, Any], entity_id: int) -> str:
        """Query database for single entity watermark."""
        try:
            from backend.database.connection_manager import get_connection_manager
            
            connection_manager = get_connection_manager()
            
            with connection_manager.session_scope() as session:
                from sqlalchemy import text
                
                table = strategy.get('table', 'restaurants')
                timestamp_col = strategy.get('timestamp_column', 'updated_at')
                
                query = f"SELECT {timestamp_col} FROM {table} WHERE id = :entity_id"
                result = session.execute(text(query), {'entity_id': entity_id}).fetchone()
                
                if result and getattr(result, timestamp_col):
                    timestamp_value = getattr(result, timestamp_col)
                    if isinstance(timestamp_value, datetime):
                        return str(int(timestamp_value.timestamp()))
                    else:
                        return str(timestamp_value)
                else:
                    return str(int(time.time()))
                    
        except Exception as e:
            logger.error("Single entity watermark query failed", error=str(e))
            return str(int(time.time()))
    
    def _normalize_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize filters for consistent ETag generation."""
        from backend.utils.data_version import normalize_filters
        return normalize_filters(filters)
    
    def _extract_cursor_position_for_etag(self, cursor_token: str) -> Optional[str]:
        """Extract cursor position info for ETag (without decoding full cursor)."""
        try:
            # Just use a hash of the cursor for ETag purposes
            cursor_hash = hashlib.md5(cursor_token.encode()).hexdigest()
            return cursor_hash[:8]
        except Exception:
            return None
    
    def _extract_user_factors(self, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract user factors that affect data representation."""
        factors = {}
        
        # Role-based data filtering
        if user_context.get('user_roles'):
            roles = [role.get('role') for role in user_context['user_roles'] if role.get('role')]
            if roles:
                factors['roles'] = sorted(roles)
        
        # Location-based personalization
        if user_context.get('latitude') and user_context.get('longitude'):
            # Round location for ETag consistency
            lat = round(float(user_context['latitude']), 2)
            lng = round(float(user_context['longitude']), 2)
            factors['location'] = f"{lat},{lng}"
        
        return factors
    
    def _compute_relations_hash(
        self, 
        entity_type: str, 
        entity_id: int, 
        entity_data: Dict[str, Any]
    ) -> Optional[str]:
        """Compute hash for related data (reviews, hours, etc.)."""
        try:
            relations_data = {}
            
            # Include reviews count and latest review timestamp
            if entity_data.get('review_count'):
                relations_data['review_count'] = entity_data['review_count']
            
            if entity_data.get('latest_review_at'):
                relations_data['latest_review'] = self._extract_timestamp(entity_data['latest_review_at'])
            
            # Include hours data if present
            if entity_data.get('hours'):
                # Create a simple hash of hours data
                hours_str = json.dumps(entity_data['hours'], sort_keys=True)
                relations_data['hours'] = hashlib.md5(hours_str.encode()).hexdigest()[:8]
            
            if relations_data:
                relations_json = json.dumps(relations_data, sort_keys=True)
                return hashlib.md5(relations_json.encode()).hexdigest()[:8]
            
            return None
            
        except Exception as e:
            logger.error("Failed to compute relations hash", error=str(e))
            return None
    
    def _extract_timestamp(self, timestamp_value: Any) -> Optional[str]:
        """Extract and normalize timestamp value."""
        try:
            if isinstance(timestamp_value, datetime):
                return str(int(timestamp_value.timestamp()))
            elif isinstance(timestamp_value, (int, float)):
                return str(int(timestamp_value))
            elif isinstance(timestamp_value, str):
                try:
                    dt = datetime.fromisoformat(timestamp_value.replace('Z', '+00:00'))
                    return str(int(dt.timestamp()))
                except ValueError:
                    return str(int(time.time()))
            else:
                return None
        except Exception:
            return None
    
    def _compute_etag_hash(self, components: Dict[str, Any]) -> str:
        """Compute ETag hash from components."""
        try:
            components_json = json.dumps(components, sort_keys=True, separators=(',', ':'), default=str)
            hash_value = hashlib.sha256(components_json.encode('utf-8')).hexdigest()
            return hash_value[:20]  # Use first 20 characters for reasonable length
        except Exception as e:
            logger.error("Failed to compute ETag hash", error=str(e))
            return hashlib.md5(str(time.time()).encode()).hexdigest()[:20]
    
    def _normalize_etag(self, etag: str) -> str:
        """Normalize ETag by removing quotes and weak indicators."""
        if not etag:
            return ''
        
        # Remove W/ prefix for weak ETags
        if etag.startswith('W/'):
            etag = etag[2:]
        
        # Remove surrounding quotes
        if etag.startswith('"') and etag.endswith('"'):
            etag = etag[1:-1]
        
        return etag
    
    def _extract_last_modified_from_etag(self, etag: str) -> Optional[datetime]:
        """Try to extract last modified time from ETag (if watermark-based)."""
        try:
            # This is a simplified approach - in practice, you might embed
            # timestamp info in the ETag for this purpose
            return None  # Could implement if needed
        except Exception:
            return None
    
    def _get_from_cache(self, key: str) -> Optional[str]:
        """Get value from cache (Redis)."""
        try:
            from backend.services.redis_cache_service import RedisCacheService
            cache_service = RedisCacheService()
            return cache_service.get(key)
        except Exception:
            return None
    
    def _set_in_cache(self, key: str, value: str, ttl: int):
        """Set value in cache (Redis)."""
        try:
            from backend.services.redis_cache_service import RedisCacheService
            cache_service = RedisCacheService()
            cache_service.set(key, value, ttl=ttl)
        except Exception:
            pass


# Global instance
etag_manager_v5 = ETagV5Manager()

# Convenience functions
def generate_collection_etag_v5(**kwargs) -> str:
    """Generate collection ETag for v5 API."""
    return etag_manager_v5.generate_collection_etag(**kwargs)

def generate_entity_etag_v5(**kwargs) -> str:
    """Generate entity ETag for v5 API."""
    return etag_manager_v5.generate_entity_etag(**kwargs)

def validate_etag_v5(provided_etag: str, current_etag: str) -> bool:
    """Validate ETag for v5 API."""
    return etag_manager_v5.validate_etag(provided_etag, current_etag)

def process_conditional_request_v5(current_etag: str) -> Tuple[bool, Optional[int]]:
    """Process conditional request for v5 API."""
    return etag_manager_v5.process_conditional_request(current_etag)

def add_etag_headers_v5(response, etag_value: str, **kwargs):
    """Add ETag headers to v5 API response."""
    etag_manager_v5.add_etag_headers(response, etag_value, **kwargs)

def get_etag_v5_stats() -> Dict[str, Any]:
    """Get ETag system statistics."""
    return {
        'version': etag_manager_v5.version,
        'supported_entities': list(etag_manager_v5.ENTITY_WATERMARK_STRATEGIES.keys()),
        'cache_durations': {
            'etag_cache': etag_manager_v5.ETAG_CACHE_DURATION,
            'watermark_cache': etag_manager_v5.WATERMARK_CACHE_DURATION,
        }
    }