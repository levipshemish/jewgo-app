#!/usr/bin/env python3
"""
Advanced Multi-Layer Cache Manager for JewGo Backend
====================================================

This module implements a sophisticated multi-layer caching strategy with:
- L1: In-memory cache (fastest, limited capacity)
- L2: Redis cache (distributed, medium capacity)
- L3: Database query result cache (persistent, large capacity)
- Intelligent cache invalidation patterns
- Performance monitoring and metrics
- Cache warming and preloading strategies

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

import hashlib
import pickle
import time
import threading
from collections import OrderedDict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, asdict
from functools import wraps

from utils.logging_config import get_logger
from cache.redis_manager_v5 import get_redis_manager_v5
from sqlalchemy import text

logger = get_logger(__name__)


@dataclass
class CacheMetrics:
    """Cache performance metrics."""
    l1_hits: int = 0
    l1_misses: int = 0
    l2_hits: int = 0
    l2_misses: int = 0
    l3_hits: int = 0
    l3_misses: int = 0
    cache_writes: int = 0
    cache_invalidations: int = 0
    cache_warming_operations: int = 0
    total_operations: int = 0
    average_response_time_ms: float = 0.0
    last_reset: datetime = None

    def __post_init__(self):
        if self.last_reset is None:
            self.last_reset = datetime.now()

    def get_hit_rate(self, layer: str) -> float:
        """Get hit rate for a specific layer."""
        if layer == 'l1':
            total = self.l1_hits + self.l1_misses
            return (self.l1_hits / total * 100) if total > 0 else 0.0
        elif layer == 'l2':
            total = self.l2_hits + self.l2_misses
            return (self.l2_hits / total * 100) if total > 0 else 0.0
        elif layer == 'l3':
            total = self.l3_hits + self.l3_misses
            return (self.l3_hits / total * 100) if total > 0 else 0.0
        return 0.0

    def get_overall_hit_rate(self) -> float:
        """Get overall cache hit rate."""
        total_hits = self.l1_hits + self.l2_hits + self.l3_hits
        total_requests = total_hits + self.l1_misses + self.l2_misses + self.l3_misses
        return (total_hits / total_requests * 100) if total_requests > 0 else 0.0


@dataclass
class CacheEntry:
    """Cache entry with metadata."""
    value: Any
    created_at: datetime
    expires_at: Optional[datetime] = None
    access_count: int = 0
    last_accessed: datetime = None
    tags: List[str] = None
    size_bytes: int = 0

    def __post_init__(self):
        if self.last_accessed is None:
            self.last_accessed = self.created_at
        if self.tags is None:
            self.tags = []
        if self.size_bytes == 0:
            self.size_bytes = len(pickle.dumps(self.value))


class L1MemoryCache:
    """L1: In-memory cache with LRU eviction."""
    
    def __init__(self, max_size: int = 1000, max_memory_mb: int = 100):
        self.max_size = max_size
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self.current_memory_bytes = 0
        self.lock = threading.RLock()
        self.stats = {'hits': 0, 'misses': 0, 'evictions': 0}

    def get(self, key: str) -> Optional[Any]:
        """Get value from L1 cache."""
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                
                # Check expiration
                if entry.expires_at and datetime.now() > entry.expires_at:
                    del self.cache[key]
                    self.current_memory_bytes -= entry.size_bytes
                    self.stats['misses'] += 1
                    return None
                
                # Update access info and move to end (LRU)
                entry.access_count += 1
                entry.last_accessed = datetime.now()
                self.cache.move_to_end(key)
                self.stats['hits'] += 1
                return entry.value
            
            self.stats['misses'] += 1
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None, tags: List[str] = None) -> bool:
        """Set value in L1 cache."""
        with self.lock:
            # Remove existing entry if present
            if key in self.cache:
                old_entry = self.cache[key]
                self.current_memory_bytes -= old_entry.size_bytes
                del self.cache[key]
            
            # Create new entry
            expires_at = datetime.now() + timedelta(seconds=ttl) if ttl else None
            entry = CacheEntry(
                value=value,
                created_at=datetime.now(),
                expires_at=expires_at,
                tags=tags or []
            )
            
            # Check if we need to evict
            while (len(self.cache) >= self.max_size or 
                   self.current_memory_bytes + entry.size_bytes > self.max_memory_bytes):
                if not self.cache:
                    break
                # Remove least recently used
                oldest_key, oldest_entry = self.cache.popitem(last=False)
                self.current_memory_bytes -= oldest_entry.size_bytes
                self.stats['evictions'] += 1
            
            # Add new entry
            self.cache[key] = entry
            self.current_memory_bytes += entry.size_bytes
            return True

    def delete(self, key: str) -> bool:
        """Delete key from L1 cache."""
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                self.current_memory_bytes -= entry.size_bytes
                del self.cache[key]
                return True
            return False

    def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate entries matching any of the given tags."""
        with self.lock:
            keys_to_remove = []
            for key, entry in self.cache.items():
                if any(tag in entry.tags for tag in tags):
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                entry = self.cache[key]
                self.current_memory_bytes -= entry.size_bytes
                del self.cache[key]
            
            return len(keys_to_remove)

    def clear(self):
        """Clear all entries from L1 cache."""
        with self.lock:
            self.cache.clear()
            self.current_memory_bytes = 0

    def get_stats(self) -> Dict[str, Any]:
        """Get L1 cache statistics."""
        with self.lock:
            total_requests = self.stats['hits'] + self.stats['misses']
            hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0.0
            
            return {
                'size': len(self.cache),
                'max_size': self.max_size,
                'memory_used_mb': round(self.current_memory_bytes / 1024 / 1024, 2),
                'memory_max_mb': round(self.max_memory_bytes / 1024 / 1024, 2),
                'hit_rate_percent': round(hit_rate, 2),
                'evictions': self.stats['evictions'],
                'hits': self.stats['hits'],
                'misses': self.stats['misses']
            }


class L2RedisCache:
    """L2: Redis cache with compression and advanced features."""
    
    def __init__(self, redis_manager=None):
        self.redis_manager = redis_manager or get_redis_manager_v5()
        self.prefix = 'l2_cache:'
        self.compression_threshold = 1024  # Compress values > 1KB
        self.stats = {'hits': 0, 'misses': 0, 'errors': 0}

    def get(self, key: str) -> Optional[Any]:
        """Get value from L2 cache."""
        try:
            value = self.redis_manager.get(key, prefix=self.prefix)
            if value is not None:
                self.stats['hits'] += 1
                return value
            else:
                self.stats['misses'] += 1
                return None
        except Exception as e:
            logger.error(f"L2 cache GET error for key {key}: {e}")
            self.stats['errors'] += 1
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None, tags: List[str] = None) -> bool:
        """Set value in L2 cache."""
        try:
            # Add tags as metadata
            if tags:
                metadata = {'tags': tags, 'created_at': datetime.now().isoformat()}
                # Store metadata separately
                self.redis_manager.set(f"{key}:meta", metadata, ttl=ttl, prefix=self.prefix)
            
            return self.redis_manager.set(key, value, ttl=ttl, prefix=self.prefix, compress=True)
        except Exception as e:
            logger.error(f"L2 cache SET error for key {key}: {e}")
            self.stats['errors'] += 1
            return False

    def delete(self, key: str) -> bool:
        """Delete key from L2 cache."""
        try:
            # Also delete metadata
            self.redis_manager.delete(f"{key}:meta", prefix=self.prefix)
            return self.redis_manager.delete(key, prefix=self.prefix)
        except Exception as e:
            logger.error(f"L2 cache DELETE error for key {key}: {e}")
            self.stats['errors'] += 1
            return False

    def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate entries matching any of the given tags."""
        try:
            # This is expensive - scan all keys with metadata
            # In production, consider using Redis sets to track keys by tag
            pattern = f"{self.prefix}*:meta"
            keys = self.redis_manager.scan_keys(pattern, prefix='')
            
            keys_to_delete = []
            for key in keys:
                try:
                    metadata = self.redis_manager.get(key, prefix='')
                    if metadata and 'tags' in metadata:
                        if any(tag in metadata['tags'] for tag in tags):
                            # Remove :meta suffix to get the actual key
                            actual_key = key.replace(':meta', '')
                            keys_to_delete.append(actual_key)
                except Exception:
                    continue
            
            # Delete all matching keys
            for key in keys_to_delete:
                self.delete(key)
            
            return len(keys_to_delete)
        except Exception as e:
            logger.error(f"L2 cache tag invalidation error: {e}")
            self.stats['errors'] += 1
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get L2 cache statistics."""
        total_requests = self.stats['hits'] + self.stats['misses']
        hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0.0
        
        redis_stats = self.redis_manager.get_stats()
        
        return {
            'hit_rate_percent': round(hit_rate, 2),
            'hits': self.stats['hits'],
            'misses': self.stats['misses'],
            'errors': self.stats['errors'],
            'redis_stats': redis_stats
        }


class L3DatabaseCache:
    """L3: Database query result cache for persistent storage."""
    
    def __init__(self, connection_manager=None):
        self.connection_manager = connection_manager
        self.table_name = 'query_result_cache'
        self.stats = {'hits': 0, 'misses': 0, 'errors': 0}
        self._ensure_table_exists()

    def _ensure_table_exists(self):
        """Ensure the cache table exists."""
        try:
            if not self.connection_manager:
                return
            
            with self.connection_manager.get_session() as session:
                # Create table if it doesn't exist
                create_table_sql = text(f"""
                CREATE TABLE IF NOT EXISTS {self.table_name} (
                    cache_key VARCHAR(255) PRIMARY KEY,
                    cache_value BYTEA NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    access_count INTEGER DEFAULT 0,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tags TEXT[],
                    size_bytes INTEGER DEFAULT 0
                );
                
                CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON {self.table_name}(expires_at);
                CREATE INDEX IF NOT EXISTS idx_cache_tags ON {self.table_name} USING GIN(tags);
                CREATE INDEX IF NOT EXISTS idx_cache_last_accessed ON {self.table_name}(last_accessed);
                """)
                
                session.execute(create_table_sql)
                session.commit()
                logger.info("L3 database cache table ensured")
        except Exception as e:
            logger.error(f"Failed to ensure L3 cache table exists: {e}")

    def get(self, key: str) -> Optional[Any]:
        """Get value from L3 cache."""
        try:
            if not self.connection_manager:
                return None
            
            with self.connection_manager.get_session() as session:
                from sqlalchemy import text
                
                # Get and update access info
                query = text(f"""
                    SELECT cache_value, expires_at 
                    FROM {self.table_name} 
                    WHERE cache_key = :key 
                    AND (expires_at IS NULL OR expires_at > NOW())
                """)
                
                result = session.execute(query, {'key': key}).fetchone()
                
                if result:
                    # Update access info
                    update_query = text(f"""
                        UPDATE {self.table_name} 
                        SET access_count = access_count + 1, 
                            last_accessed = NOW() 
                        WHERE cache_key = :key
                    """)
                    session.execute(update_query, {'key': key})
                    session.commit()
                    
                    # Deserialize value
                    value = pickle.loads(result[0])
                    self.stats['hits'] += 1
                    return value
                else:
                    self.stats['misses'] += 1
                    return None
        except Exception as e:
            logger.error(f"L3 cache GET error for key {key}: {e}")
            self.stats['errors'] += 1
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None, tags: List[str] = None) -> bool:
        """Set value in L3 cache."""
        try:
            if not self.connection_manager:
                return False
            
            with self.connection_manager.get_session() as session:
                from sqlalchemy import text
                
                # Serialize value
                serialized_value = pickle.dumps(value)
                size_bytes = len(serialized_value)
                
                # Calculate expiration
                expires_at = None
                if ttl:
                    expires_at = datetime.now() + timedelta(seconds=ttl)
                
                # Upsert query
                query = text(f"""
                    INSERT INTO {self.table_name} 
                    (cache_key, cache_value, expires_at, tags, size_bytes, created_at, last_accessed)
                    VALUES (:key, :value, :expires_at, :tags, :size_bytes, NOW(), NOW())
                    ON CONFLICT (cache_key) 
                    DO UPDATE SET 
                        cache_value = EXCLUDED.cache_value,
                        expires_at = EXCLUDED.expires_at,
                        tags = EXCLUDED.tags,
                        size_bytes = EXCLUDED.size_bytes,
                        last_accessed = NOW()
                """)
                
                session.execute(query, {
                    'key': key,
                    'value': serialized_value,
                    'expires_at': expires_at,
                    'tags': tags or [],
                    'size_bytes': size_bytes
                })
                session.commit()
                return True
        except Exception as e:
            logger.error(f"L3 cache SET error for key {key}: {e}")
            self.stats['errors'] += 1
            return False

    def delete(self, key: str) -> bool:
        """Delete key from L3 cache."""
        try:
            if not self.connection_manager:
                return False
            
            with self.connection_manager.get_session() as session:
                from sqlalchemy import text
                
                query = text(f"DELETE FROM {self.table_name} WHERE cache_key = :key")
                result = session.execute(query, {'key': key})
                session.commit()
                return result.rowcount > 0
        except Exception as e:
            logger.error(f"L3 cache DELETE error for key {key}: {e}")
            self.stats['errors'] += 1
            return False

    def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate entries matching any of the given tags."""
        try:
            if not self.connection_manager:
                return 0
            
            with self.connection_manager.get_session() as session:
                from sqlalchemy import text
                
                # Use PostgreSQL array overlap operator
                query = text(f"""
                    DELETE FROM {self.table_name} 
                    WHERE tags && :tags
                """)
                
                result = session.execute(query, {'tags': tags})
                session.commit()
                return result.rowcount
        except Exception as e:
            logger.error(f"L3 cache tag invalidation error: {e}")
            self.stats['errors'] += 1
            return 0

    def cleanup_expired(self) -> int:
        """Clean up expired entries."""
        try:
            if not self.connection_manager:
                return 0
            
            with self.connection_manager.get_session() as session:
                from sqlalchemy import text
                
                query = text(f"""
                    DELETE FROM {self.table_name} 
                    WHERE expires_at IS NOT NULL AND expires_at < NOW()
                """)
                
                result = session.execute(query)
                session.commit()
                return result.rowcount
        except Exception as e:
            logger.error(f"L3 cache cleanup error: {e}")
            self.stats['errors'] += 1
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get L3 cache statistics."""
        try:
            if not self.connection_manager:
                return {'error': 'No connection manager'}
            
            with self.connection_manager.get_session() as session:
                from sqlalchemy import text
                
                # Get cache statistics
                stats_query = text(f"""
                    SELECT 
                        COUNT(*) as total_entries,
                        SUM(size_bytes) as total_size_bytes,
                        AVG(access_count) as avg_access_count,
                        COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END) as expired_entries
                    FROM {self.table_name}
                """)
                
                result = session.execute(stats_query).fetchone()
                
                total_requests = self.stats['hits'] + self.stats['misses']
                hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0.0
                
                return {
                    'hit_rate_percent': round(hit_rate, 2),
                    'hits': self.stats['hits'],
                    'misses': self.stats['misses'],
                    'errors': self.stats['errors'],
                    'total_entries': result[0] if result else 0,
                    'total_size_mb': round((result[1] or 0) / 1024 / 1024, 2),
                    'avg_access_count': round(result[2] or 0, 2),
                    'expired_entries': result[3] if result else 0
                }
        except Exception as e:
            logger.error(f"L3 cache stats error: {e}")
            return {'error': str(e)}


class AdvancedCacheManager:
    """Advanced multi-layer cache manager with intelligent invalidation."""
    
    def __init__(self, 
                 l1_max_size: int = 1000,
                 l1_max_memory_mb: int = 100,
                 redis_manager=None,
                 connection_manager=None):
        
        # Initialize cache layers
        self.l1_cache = L1MemoryCache(l1_max_size, l1_max_memory_mb)
        self.l2_cache = L2RedisCache(redis_manager)
        self.l3_cache = L3DatabaseCache(connection_manager)
        
        # Cache configuration
        self.default_ttl = {
            'l1': 300,    # 5 minutes
            'l2': 1800,   # 30 minutes
            'l3': 3600    # 1 hour
        }
        
        # Performance tracking
        self.metrics = CacheMetrics()
        self.operation_times = []
        self.lock = threading.RLock()
        
        # Cache warming
        self.warming_strategies = {}
        
        logger.info("Advanced cache manager initialized with multi-layer strategy")

    def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache using multi-layer strategy."""
        start_time = time.time()
        
        with self.lock:
            self.metrics.total_operations += 1
            
            # Try L1 first (fastest)
            value = self.l1_cache.get(key)
            if value is not None:
                self.metrics.l1_hits += 1
                self._record_operation_time(time.time() - start_time)
                return value
            self.metrics.l1_misses += 1
            
            # Try L2 (Redis)
            value = self.l2_cache.get(key)
            if value is not None:
                self.metrics.l2_hits += 1
                # Populate L1 with the value
                self.l1_cache.set(key, value, ttl=self.default_ttl['l1'])
                self._record_operation_time(time.time() - start_time)
                return value
            self.metrics.l2_misses += 1
            
            # Try L3 (Database)
            value = self.l3_cache.get(key)
            if value is not None:
                self.metrics.l3_hits += 1
                # Populate L1 and L2 with the value
                self.l1_cache.set(key, value, ttl=self.default_ttl['l1'])
                self.l2_cache.set(key, value, ttl=self.default_ttl['l2'])
                self._record_operation_time(time.time() - start_time)
                return value
            self.metrics.l3_misses += 1
            
            self._record_operation_time(time.time() - start_time)
            return default

    def set(self, key: str, value: Any, ttl: Optional[int] = None, tags: List[str] = None) -> bool:
        """Set value in all cache layers."""
        start_time = time.time()
        
        with self.lock:
            self.metrics.cache_writes += 1
            
            # Set in all layers
            l1_success = self.l1_cache.set(key, value, ttl=ttl or self.default_ttl['l1'], tags=tags)
            l2_success = self.l2_cache.set(key, value, ttl=ttl or self.default_ttl['l2'], tags=tags)
            l3_success = self.l3_cache.set(key, value, ttl=ttl or self.default_ttl['l3'], tags=tags)
            
            self._record_operation_time(time.time() - start_time)
            return l1_success and l2_success and l3_success

    def delete(self, key: str) -> bool:
        """Delete key from all cache layers."""
        with self.lock:
            l1_success = self.l1_cache.delete(key)
            l2_success = self.l2_cache.delete(key)
            l3_success = self.l3_cache.delete(key)
            return l1_success or l2_success or l3_success

    def invalidate_by_tags(self, tags: List[str]) -> Dict[str, int]:
        """Invalidate entries matching tags across all layers."""
        with self.lock:
            self.metrics.cache_invalidations += 1
            
            results = {
                'l1': self.l1_cache.invalidate_by_tags(tags),
                'l2': self.l2_cache.invalidate_by_tags(tags),
                'l3': self.l3_cache.invalidate_by_tags(tags)
            }
            
            total_invalidated = sum(results.values())
            logger.info(f"Invalidated {total_invalidated} cache entries by tags {tags}", extra=results)
            return results

    def warm_cache(self, strategy_name: str, *args, **kwargs) -> bool:
        """Warm cache using predefined strategies."""
        if strategy_name not in self.warming_strategies:
            logger.warning(f"Unknown cache warming strategy: {strategy_name}")
            return False
        
        try:
            self.metrics.cache_warming_operations += 1
            strategy = self.warming_strategies[strategy_name]
            return strategy(*args, **kwargs)
        except Exception as e:
            logger.error(f"Cache warming strategy {strategy_name} failed: {e}")
            return False

    def register_warming_strategy(self, name: str, strategy: Callable):
        """Register a cache warming strategy."""
        self.warming_strategies[name] = strategy
        logger.info(f"Registered cache warming strategy: {name}")

    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive cache metrics."""
        with self.lock:
            # Update average response time
            if self.operation_times:
                self.metrics.average_response_time_ms = sum(self.operation_times) / len(self.operation_times) * 1000
            
            return {
                'overall': asdict(self.metrics),
                'l1': self.l1_cache.get_stats(),
                'l2': self.l2_cache.get_stats(),
                'l3': self.l3_cache.get_stats(),
                'overall_hit_rate': self.metrics.get_overall_hit_rate()
            }

    def reset_metrics(self):
        """Reset all cache metrics."""
        with self.lock:
            self.metrics = CacheMetrics()
            self.operation_times.clear()
            self.l1_cache.stats = {'hits': 0, 'misses': 0, 'evictions': 0}
            self.l2_cache.stats = {'hits': 0, 'misses': 0, 'errors': 0}
            self.l3_cache.stats = {'hits': 0, 'misses': 0, 'errors': 0}
            logger.info("Cache metrics reset")

    def cleanup_expired(self) -> Dict[str, int]:
        """Clean up expired entries from all layers."""
        with self.lock:
            results = {
                'l1': 0,  # L1 handles expiration automatically
                'l2': 0,  # Redis handles expiration automatically
                'l3': self.l3_cache.cleanup_expired()
            }
            return results

    def _record_operation_time(self, duration: float):
        """Record operation duration for metrics."""
        self.operation_times.append(duration)
        # Keep only last 1000 operations for rolling average
        if len(self.operation_times) > 1000:
            self.operation_times = self.operation_times[-1000:]


def cache_result(ttl: Optional[int] = None, tags: List[str] = None, key_prefix: str = ""):
    """Decorator for caching function results."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            key_parts = [key_prefix, func.__name__]
            if args:
                key_parts.extend([str(arg) for arg in args])
            if kwargs:
                sorted_kwargs = sorted(kwargs.items())
                key_parts.extend([f"{k}:{v}" for k, v in sorted_kwargs])
            
            cache_key = hashlib.md5("|".join(key_parts).encode()).hexdigest()
            
            # Try to get from cache
            cache_manager = get_advanced_cache_manager()
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl=ttl, tags=tags)
            return result
        
        return wrapper
    return decorator


# Global cache manager instance
_advanced_cache_manager = None


def get_advanced_cache_manager() -> AdvancedCacheManager:
    """Get the global advanced cache manager instance."""
    global _advanced_cache_manager
    
    if _advanced_cache_manager is None:
        from database.connection_manager import get_connection_manager
        _advanced_cache_manager = AdvancedCacheManager(
            connection_manager=get_connection_manager()
        )
    
    return _advanced_cache_manager
