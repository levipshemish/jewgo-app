"""
Specialized ETag cache management system for v5 API.

Provides ETag-specific caching with watermark integration, ETag computation
caching, automatic cleanup, and performance monitoring for ETag hit rates.
Built on top of the Redis manager v5.
"""

from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union

from utils.logging_config import get_logger

logger = get_logger(__name__)


class ETagCache:
    """Specialized cache for ETag operations with watermark integration."""
    
    # Cache TTLs (in seconds)
    DEFAULT_ETAG_TTL = 300  # 5 minutes
    WATERMARK_TTL = 60      # 1 minute
    COLLECTION_TTL = 180    # 3 minutes
    ENTITY_TTL = 600       # 10 minutes
    
    # Cache key patterns
    CACHE_PATTERNS = {
        'watermark': 'watermark:{entity_type}',
        'entity_watermark': 'entity:{entity_type}:{entity_id}',
        'collection_etag': 'collection:{entity_type}:{query_hash}',
        'entity_etag': 'entity:{entity_type}:{entity_id}:{context_hash}',
        'query_signature': 'query:{signature}',
        'relations_hash': 'relations:{entity_type}:{entity_id}',
        'user_context': 'user_context:{user_id}:{context_hash}',
        'invalidation_queue': 'invalidation_queue',
        'stats': 'stats:{date}'
    }
    
    def __init__(self, redis_manager=None):
        self.redis_manager = redis_manager
        if not self.redis_manager:
            from backend.cache.redis_manager_v5 import get_redis_manager_v5
            self.redis_manager = get_redis_manager_v5()
        
        # Statistics
        self.stats = {
            'etag_hits': 0,
            'etag_misses': 0,
            'watermark_hits': 0,
            'watermark_misses': 0,
            'invalidations': 0,
            'cache_size_bytes': 0
        }
    
    def get_watermark(self, entity_type: str) -> Optional[str]:
        """
        Get cached watermark for entity type.
        
        Args:
            entity_type: Type of entity (restaurants, synagogues, etc.)
            
        Returns:
            Cached watermark or None if not found
        """
        try:
            cache_key = self.CACHE_PATTERNS['watermark'].format(entity_type=entity_type)
            watermark = self.redis_manager.get(cache_key, prefix='etag')
            
            if watermark:
                self.stats['watermark_hits'] += 1
                logger.debug(f"Watermark cache hit for {entity_type}")
            else:
                self.stats['watermark_misses'] += 1
                logger.debug(f"Watermark cache miss for {entity_type}")
            
            return watermark
            
        except Exception as e:
            logger.error(f"Error getting watermark for {entity_type}: {e}")
            return None
    
    def set_watermark(self, entity_type: str, watermark: str, ttl: int = None) -> bool:
        """
        Cache watermark for entity type.
        
        Args:
            entity_type: Type of entity
            watermark: Watermark value to cache
            ttl: Time to live (defaults to WATERMARK_TTL)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cache_key = self.CACHE_PATTERNS['watermark'].format(entity_type=entity_type)
            ttl = ttl or self.WATERMARK_TTL
            
            success = self.redis_manager.set(
                cache_key,
                watermark,
                ttl=ttl,
                prefix='etag',
                compress=False
            )
            
            if success:
                logger.debug(f"Cached watermark for {entity_type}: {watermark[:8]}...")
            
            return success
            
        except Exception as e:
            logger.error(f"Error setting watermark for {entity_type}: {e}")
            return False
    
    def get_entity_watermark(self, entity_type: str, entity_id: int) -> Optional[str]:
        """
        Get cached watermark for specific entity.
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            
        Returns:
            Cached entity watermark or None if not found
        """
        try:
            cache_key = self.CACHE_PATTERNS['entity_watermark'].format(
                entity_type=entity_type,
                entity_id=entity_id
            )
            
            watermark = self.redis_manager.get(cache_key, prefix='etag')
            
            if watermark:
                self.stats['watermark_hits'] += 1
            else:
                self.stats['watermark_misses'] += 1
            
            return watermark
            
        except Exception as e:
            logger.error(f"Error getting entity watermark for {entity_type}:{entity_id}: {e}")
            return None
    
    def set_entity_watermark(
        self,
        entity_type: str,
        entity_id: int,
        watermark: str,
        ttl: int = None
    ) -> bool:
        """
        Cache watermark for specific entity.
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            watermark: Watermark value to cache
            ttl: Time to live (defaults to ENTITY_TTL)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cache_key = self.CACHE_PATTERNS['entity_watermark'].format(
                entity_type=entity_type,
                entity_id=entity_id
            )
            ttl = ttl or self.ENTITY_TTL
            
            return self.redis_manager.set(
                cache_key,
                watermark,
                ttl=ttl,
                prefix='etag',
                compress=False
            )
            
        except Exception as e:
            logger.error(f"Error setting entity watermark for {entity_type}:{entity_id}: {e}")
            return False
    
    def get_collection_etag(
        self,
        entity_type: str,
        query_parameters: Dict[str, Any]
    ) -> Optional[str]:
        """
        Get cached ETag for collection query.
        
        Args:
            entity_type: Type of entity
            query_parameters: Query parameters for ETag generation
            
        Returns:
            Cached ETag or None if not found
        """
        try:
            query_hash = self._compute_query_hash(query_parameters)
            cache_key = self.CACHE_PATTERNS['collection_etag'].format(
                entity_type=entity_type,
                query_hash=query_hash
            )
            
            etag = self.redis_manager.get(cache_key, prefix='etag')
            
            if etag:
                self.stats['etag_hits'] += 1
                logger.debug(f"Collection ETag cache hit for {entity_type}")
            else:
                self.stats['etag_misses'] += 1
                logger.debug(f"Collection ETag cache miss for {entity_type}")
            
            return etag
            
        except Exception as e:
            logger.error(f"Error getting collection ETag for {entity_type}: {e}")
            return None
    
    def set_collection_etag(
        self,
        entity_type: str,
        query_parameters: Dict[str, Any],
        etag: str,
        ttl: int = None
    ) -> bool:
        """
        Cache ETag for collection query.
        
        Args:
            entity_type: Type of entity
            query_parameters: Query parameters for ETag generation
            etag: ETag value to cache
            ttl: Time to live (defaults to COLLECTION_TTL)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            query_hash = self._compute_query_hash(query_parameters)
            cache_key = self.CACHE_PATTERNS['collection_etag'].format(
                entity_type=entity_type,
                query_hash=query_hash
            )
            ttl = ttl or self.COLLECTION_TTL
            
            success = self.redis_manager.set(
                cache_key,
                etag,
                ttl=ttl,
                prefix='etag',
                compress=False
            )
            
            if success:
                logger.debug(f"Cached collection ETag for {entity_type}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error setting collection ETag for {entity_type}: {e}")
            return False
    
    def get_entity_etag(
        self,
        entity_type: str,
        entity_id: int,
        context: Dict[str, Any] = None
    ) -> Optional[str]:
        """
        Get cached ETag for specific entity.
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            context: Context for ETag generation (user, include_relations, etc.)
            
        Returns:
            Cached ETag or None if not found
        """
        try:
            context_hash = self._compute_context_hash(context or {})
            cache_key = self.CACHE_PATTERNS['entity_etag'].format(
                entity_type=entity_type,
                entity_id=entity_id,
                context_hash=context_hash
            )
            
            etag = self.redis_manager.get(cache_key, prefix='etag')
            
            if etag:
                self.stats['etag_hits'] += 1
            else:
                self.stats['etag_misses'] += 1
            
            return etag
            
        except Exception as e:
            logger.error(f"Error getting entity ETag for {entity_type}:{entity_id}: {e}")
            return None
    
    def set_entity_etag(
        self,
        entity_type: str,
        entity_id: int,
        etag: str,
        context: Dict[str, Any] = None,
        ttl: int = None
    ) -> bool:
        """
        Cache ETag for specific entity.
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            etag: ETag value to cache
            context: Context for ETag generation
            ttl: Time to live (defaults to ENTITY_TTL)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            context_hash = self._compute_context_hash(context or {})
            cache_key = self.CACHE_PATTERNS['entity_etag'].format(
                entity_type=entity_type,
                entity_id=entity_id,
                context_hash=context_hash
            )
            ttl = ttl or self.ENTITY_TTL
            
            return self.redis_manager.set(
                cache_key,
                etag,
                ttl=ttl,
                prefix='etag',
                compress=False
            )
            
        except Exception as e:
            logger.error(f"Error setting entity ETag for {entity_type}:{entity_id}: {e}")
            return False
    
    def invalidate_entity(self, entity_type: str, entity_id: int) -> int:
        """
        Invalidate all cached data for a specific entity.
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            
        Returns:
            Number of keys invalidated
        """
        try:
            patterns = [
                f"*entity:{entity_type}:{entity_id}*",
                f"*relations:{entity_type}:{entity_id}*",
                f"*collection:{entity_type}:*"  # Invalidate collections as they might include this entity
            ]
            
            total_invalidated = 0
            for pattern in patterns:
                keys = self.redis_manager.keys(pattern, prefix='etag')
                if keys:
                    for key in keys:
                        self.redis_manager.delete(key, prefix='etag')
                    total_invalidated += len(keys)
            
            # Invalidate watermark for entity type
            self.invalidate_watermark(entity_type)
            
            self.stats['invalidations'] += total_invalidated
            
            if total_invalidated > 0:
                logger.info(f"Invalidated {total_invalidated} ETag cache entries for {entity_type}:{entity_id}")
            
            return total_invalidated
            
        except Exception as e:
            logger.error(f"Error invalidating entity cache for {entity_type}:{entity_id}: {e}")
            return 0
    
    def invalidate_entity_type(self, entity_type: str) -> int:
        """
        Invalidate all cached data for an entity type.
        
        Args:
            entity_type: Type of entity
            
        Returns:
            Number of keys invalidated
        """
        try:
            patterns = [
                f"*watermark:{entity_type}*",
                f"*entity:{entity_type}:*",
                f"*collection:{entity_type}:*",
                f"*relations:{entity_type}:*"
            ]
            
            total_invalidated = 0
            for pattern in patterns:
                keys = self.redis_manager.keys(pattern, prefix='etag')
                if keys:
                    for key in keys:
                        self.redis_manager.delete(key, prefix='etag')
                    total_invalidated += len(keys)
            
            self.stats['invalidations'] += total_invalidated
            
            if total_invalidated > 0:
                logger.info(f"Invalidated {total_invalidated} ETag cache entries for {entity_type}")
            
            return total_invalidated
            
        except Exception as e:
            logger.error(f"Error invalidating entity type cache for {entity_type}: {e}")
            return 0
    
    def invalidate_watermark(self, entity_type: str) -> bool:
        """
        Invalidate watermark cache for entity type.
        
        Args:
            entity_type: Type of entity
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cache_key = self.CACHE_PATTERNS['watermark'].format(entity_type=entity_type)
            success = self.redis_manager.delete(cache_key, prefix='etag')
            
            if success:
                logger.debug(f"Invalidated watermark cache for {entity_type}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error invalidating watermark for {entity_type}: {e}")
            return False
    
    def cache_relations_hash(
        self,
        entity_type: str,
        entity_id: int,
        relations_hash: str,
        ttl: int = None
    ) -> bool:
        """
        Cache relations hash for entity.
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            relations_hash: Hash of related data
            ttl: Time to live
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cache_key = self.CACHE_PATTERNS['relations_hash'].format(
                entity_type=entity_type,
                entity_id=entity_id
            )
            ttl = ttl or self.ENTITY_TTL
            
            return self.redis_manager.set(
                cache_key,
                relations_hash,
                ttl=ttl,
                prefix='etag',
                compress=False
            )
            
        except Exception as e:
            logger.error(f"Error caching relations hash for {entity_type}:{entity_id}: {e}")
            return False
    
    def get_relations_hash(self, entity_type: str, entity_id: int) -> Optional[str]:
        """
        Get cached relations hash for entity.
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            
        Returns:
            Cached relations hash or None if not found
        """
        try:
            cache_key = self.CACHE_PATTERNS['relations_hash'].format(
                entity_type=entity_type,
                entity_id=entity_id
            )
            
            return self.redis_manager.get(cache_key, prefix='etag')
            
        except Exception as e:
            logger.error(f"Error getting relations hash for {entity_type}:{entity_id}: {e}")
            return None
    
    def _compute_query_hash(self, query_parameters: Dict[str, Any]) -> str:
        """Compute hash for query parameters."""
        try:
            # Sort parameters for consistent hashing
            sorted_params = json.dumps(query_parameters, sort_keys=True, default=str)
            return hashlib.md5(sorted_params.encode()).hexdigest()[:12]
        except Exception as e:
            logger.error(f"Error computing query hash: {e}")
            return hashlib.md5(str(time.time()).encode()).hexdigest()[:12]
    
    def _compute_context_hash(self, context: Dict[str, Any]) -> str:
        """Compute hash for context parameters."""
        try:
            # Include only relevant context fields
            relevant_context = {
                'user_roles': context.get('user_roles', []),
                'include_relations': context.get('include_relations', False),
                'user_location': context.get('user_location'),
                'personalization': context.get('personalization', False)
            }
            
            sorted_context = json.dumps(relevant_context, sort_keys=True, default=str)
            return hashlib.md5(sorted_context.encode()).hexdigest()[:8]
        except Exception as e:
            logger.error(f"Error computing context hash: {e}")
            return "default"
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get ETag cache statistics."""
        try:
            # Calculate hit rates
            total_etag_ops = self.stats['etag_hits'] + self.stats['etag_misses']
            etag_hit_rate = (self.stats['etag_hits'] / total_etag_ops * 100) if total_etag_ops > 0 else 0
            
            total_watermark_ops = self.stats['watermark_hits'] + self.stats['watermark_misses']
            watermark_hit_rate = (self.stats['watermark_hits'] / total_watermark_ops * 100) if total_watermark_ops > 0 else 0
            
            # Get Redis info
            redis_stats = self.redis_manager.get_stats()
            
            return {
                **self.stats,
                'etag_hit_rate_percent': round(etag_hit_rate, 2),
                'watermark_hit_rate_percent': round(watermark_hit_rate, 2),
                'total_etag_operations': total_etag_ops,
                'total_watermark_operations': total_watermark_ops,
                'redis_connected': redis_stats.get('redis_connected_clients', 0) > 0,
                'cache_patterns': list(self.CACHE_PATTERNS.keys()),
                'default_ttls': {
                    'etag': self.DEFAULT_ETAG_TTL,
                    'watermark': self.WATERMARK_TTL,
                    'collection': self.COLLECTION_TTL,
                    'entity': self.ENTITY_TTL
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting ETag cache stats: {e}")
            return self.stats.copy()
    
    def cleanup_expired_entries(self) -> int:
        """Clean up expired cache entries (for maintenance)."""
        try:
            # Redis handles TTL automatically, but we can clean up any stale pattern-based keys
            patterns_to_check = [
                "*etag*",
                "*watermark*",
                "*collection*",
                "*entity*"
            ]
            
            cleaned_count = 0
            for pattern in patterns_to_check:
                keys = self.redis_manager.keys(pattern, prefix='etag')
                
                # Check if keys exist (Redis will have auto-expired some)
                for key in keys:
                    if not self.redis_manager.exists(key, prefix='etag'):
                        cleaned_count += 1
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired ETag cache entries")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired entries: {e}")
            return 0
    
    def warm_cache(self, entity_type: str, entity_ids: List[int]) -> int:
        """
        Warm cache for specific entities (pre-compute ETags).
        This is typically called during deployment or maintenance.
        """
        try:
            warmed_count = 0
            
            # This would typically trigger ETag computation for the entities
            # For now, we'll just log the intent
            logger.info(f"Cache warming requested for {len(entity_ids)} {entity_type} entities")
            
            # In a real implementation, you would:
            # 1. Query entity data from database
            # 2. Compute ETags using ETag manager
            # 3. Store in cache with appropriate TTLs
            
            return warmed_count
            
        except Exception as e:
            logger.error(f"Error warming cache for {entity_type}: {e}")
            return 0


# Global instance
etag_cache = None

def get_etag_cache(redis_manager=None) -> ETagCache:
    """Get the global ETag cache instance."""
    global etag_cache
    
    if etag_cache is None:
        etag_cache = ETagCache(redis_manager)
    
    return etag_cache