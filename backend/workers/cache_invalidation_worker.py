"""
PostgreSQL LISTEN/NOTIFY worker for Redis cache invalidation.

Listens for database changes via LISTEN/NOTIFY and invalidates relevant cache
entries, supporting multiple notification channels, intelligent cache key pattern
matching, and integration with Redis cache service patterns.
"""

from __future__ import annotations

import json
import re
import signal
import sys
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Callable

import psycopg2
import psycopg2.extensions

from utils.logging_config import get_logger

logger = get_logger(__name__)


class CacheInvalidationWorker:
    """PostgreSQL LISTEN/NOTIFY worker for cache invalidation."""
    
    # Notification channels to listen on
    NOTIFICATION_CHANNELS = [
        'restaurant_change',
        'synagogue_change',
        'mikvah_change',
        'store_change',
        'user_change',
        'review_change',
        'order_change',
        'cache_invalidate'
    ]
    
    # Cache key patterns for different entity types
    CACHE_KEY_PATTERNS = {
        'restaurant': [
            'restaurants:*',
            'entity_v5:restaurants:*',
            'search:*restaurants*',
            'etag_v5:watermark:restaurants',
            'etag_v5:entity:restaurants:*',
            'restaurant_hours:*',
            'restaurant_reviews:*'
        ],
        'synagogue': [
            'synagogues:*',
            'entity_v5:synagogues:*',
            'search:*synagogues*',
            'etag_v5:watermark:synagogues',
            'etag_v5:entity:synagogues:*',
            'synagogue_hours:*'
        ],
        'mikvah': [
            'mikvahs:*',
            'entity_v5:mikvahs:*',
            'search:*mikvahs*',
            'etag_v5:watermark:mikvahs',
            'etag_v5:entity:mikvahs:*',
            'mikvah_hours:*'
        ],
        'store': [
            'stores:*',
            'entity_v5:stores:*',
            'search:*stores*',
            'etag_v5:watermark:stores',
            'etag_v5:entity:stores:*',
            'store_hours:*'
        ],
        'user': [
            'user:*',
            'user_sessions:*',
            'user_preferences:*'
        ],
        'review': [
            'reviews:*',
            'restaurant_reviews:*',
            'review_stats:*'
        ],
        'order': [
            'orders:*',
            'order_stats:*'
        ],
        'general': [
            'search:*',
            'statistics:*',
            'aggregated_data:*'
        ]
    }
    
    def __init__(
        self,
        database_url: str,
        redis_client=None,
        invalidation_strategies: Optional[Dict[str, Callable]] = None
    ):
        self.database_url = database_url
        self.redis_client = redis_client
        self.invalidation_strategies = invalidation_strategies or {}
        
        # Worker state
        self.connection = None
        self.running = False
        self.worker_thread = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        self.reconnect_delay = 5  # seconds
        
        # Statistics
        self.stats = {
            'notifications_received': 0,
            'cache_keys_invalidated': 0,
            'errors': 0,
            'reconnections': 0,
            'uptime_start': None
        }
        
        # Initialize Redis client
        if not self.redis_client:
            self._init_redis_client()
        
        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
    
    def _init_redis_client(self):
        """Initialize Redis client for cache operations."""
        try:
            from cache.redis_manager_v5 import get_redis_manager_v5
            redis_manager = get_redis_manager_v5()
            self.redis_client = redis_manager.get_client()
            
            if self.redis_client:
                # Test connection
                self.redis_client.ping()
                logger.info("Cache invalidation worker connected to Redis v5")
            else:
                logger.warning("Cache invalidation worker: Redis not available")
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            self.redis_client = None
    
    def start(self):
        """Start the cache invalidation worker."""
        if self.running:
            logger.warning("Cache invalidation worker is already running")
            return
        
        self.running = True
        self.stats['uptime_start'] = datetime.now()
        
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=False)
        self.worker_thread.start()
        
        logger.info("Cache invalidation worker started")
    
    def stop(self, timeout: int = 30):
        """Stop the cache invalidation worker."""
        if not self.running:
            return
        
        logger.info("Stopping cache invalidation worker...")
        self.running = False
        
        if self.connection:
            try:
                self.connection.close()
            except Exception as e:
                logger.error(f"Error closing database connection: {e}")
        
        if self.worker_thread and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=timeout)
            if self.worker_thread.is_alive():
                logger.warning("Cache invalidation worker did not stop gracefully")
        
        logger.info("Cache invalidation worker stopped")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down cache invalidation worker")
        self.stop()
        sys.exit(0)
    
    def _worker_loop(self):
        """Main worker loop."""
        while self.running:
            try:
                self._connect_to_database()
                self._listen_for_notifications()
                
            except psycopg2.OperationalError as e:
                logger.error(f"Database connection error: {e}")
                self._handle_connection_error()
                
            except Exception as e:
                logger.error(f"Unexpected error in cache invalidation worker: {e}")
                self.stats['errors'] += 1
                time.sleep(5)  # Brief pause before retry
    
    def _connect_to_database(self):
        """Connect to PostgreSQL and set up LISTEN statements."""
        try:
            # Close existing connection if any
            if self.connection:
                self.connection.close()
            
            # Create new connection
            self.connection = psycopg2.connect(
                self.database_url,
                application_name="cache_invalidation_worker"
            )
            self.connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
            
            # Set up LISTEN statements for all channels
            with self.connection.cursor() as cursor:
                for channel in self.NOTIFICATION_CHANNELS:
                    cursor.execute(f"LISTEN {channel}")
                    logger.debug(f"Listening on channel: {channel}")
            
            logger.info(f"Connected to database and listening on {len(self.NOTIFICATION_CHANNELS)} channels")
            self.reconnect_attempts = 0
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def _listen_for_notifications(self):
        """Listen for PostgreSQL notifications and process them."""
        import select
        
        logger.info("Starting to listen for database notifications...")
        
        while self.running:
            try:
                # Use select to wait for socket readiness
                ready, _, _ = select.select([self.connection], [], [], 1.0)  # 1 second timeout
                
                if ready:
                    # Socket is ready, check for notifications
                    if self.connection.poll() == psycopg2.extensions.POLL_OK:
                        # Process all available notifications
                        while self.connection.notifies:
                            notification = self.connection.notifies.pop()
                            self._process_notification(notification)
                    else:
                        # Connection issue, will trigger reconnection
                        raise psycopg2.OperationalError("Connection poll failed")
                else:
                    # No notifications, continue loop
                    continue
                    
            except psycopg2.OperationalError as e:
                logger.error(f"Database connection lost: {e}")
                raise  # Will trigger reconnection
                
            except Exception as e:
                logger.error(f"Error processing notifications: {e}")
                self.stats['errors'] += 1
                time.sleep(1)
    
    def _process_notification(self, notification):
        """Process a single notification and invalidate cache entries."""
        try:
            channel = notification.channel
            payload = notification.payload
            
            logger.debug(f"Received notification on {channel}: {payload}")
            self.stats['notifications_received'] += 1
            
            # Parse payload
            try:
                data = json.loads(payload) if payload else {}
            except json.JSONDecodeError:
                data = {'raw_payload': payload}
            
            # Determine invalidation strategy
            if channel in self.invalidation_strategies:
                # Use custom strategy
                self.invalidation_strategies[channel](data)
            else:
                # Use default strategy
                self._default_invalidation_strategy(channel, data)
                
        except Exception as e:
            logger.error(f"Error processing notification {notification}: {e}")
            self.stats['errors'] += 1
    
    def _default_invalidation_strategy(self, channel: str, data: Dict[str, Any]):
        """Default cache invalidation strategy based on notification channel."""
        if not self.redis_client:
            logger.warning("Redis client not available, skipping cache invalidation")
            return
        
        try:
            # Determine entity type from channel
            entity_type = self._extract_entity_type(channel)
            
            # Get cache key patterns for this entity type
            patterns = self._get_cache_patterns(entity_type, data)
            
            # Invalidate cache keys
            invalidated_count = 0
            for pattern in patterns:
                count = self._invalidate_cache_pattern(pattern)
                invalidated_count += count
            
            if invalidated_count > 0:
                logger.info(f"Invalidated {invalidated_count} cache keys for {channel}")
                self.stats['cache_keys_invalidated'] += invalidated_count
            
            # Special handling for specific notifications
            self._handle_special_invalidations(channel, data)
            
        except Exception as e:
            logger.error(f"Error in default invalidation strategy: {e}")
            self.stats['errors'] += 1
    
    def _extract_entity_type(self, channel: str) -> str:
        """Extract entity type from notification channel."""
        if channel.startswith('restaurant'):
            return 'restaurant'
        elif channel.startswith('synagogue'):
            return 'synagogue'
        elif channel.startswith('mikvah'):
            return 'mikvah'
        elif channel.startswith('store'):
            return 'store'
        elif channel.startswith('user'):
            return 'user'
        elif channel.startswith('review'):
            return 'review'
        elif channel.startswith('order'):
            return 'order'
        else:
            return 'general'
    
    def _get_cache_patterns(self, entity_type: str, data: Dict[str, Any]) -> List[str]:
        """Get cache key patterns for invalidation."""
        patterns = self.CACHE_KEY_PATTERNS.get(entity_type, [])
        
        # Add entity-specific patterns if ID is provided
        entity_id = data.get('id') or data.get('entity_id')
        if entity_id and entity_type in ['restaurant', 'synagogue', 'mikvah', 'store']:
            patterns.extend([
                f'entity_v5:{entity_type}s:{entity_id}:*',
                f'etag_v5:entity:{entity_type}s:{entity_id}',
                f'{entity_type}_details:{entity_id}*'
            ])
        
        return patterns
    
    def _invalidate_cache_pattern(self, pattern: str) -> int:
        """Invalidate cache keys matching a pattern using SCAN to avoid blocking Redis."""
        try:
            # Use SCAN to iterate through keys matching the pattern
            cursor = 0
            deleted_count = 0
            batch_size = 100
            
            while True:
                # SCAN with cursor and pattern
                cursor, keys = self.redis_client.scan(cursor, match=pattern, count=batch_size)
                
                if keys:
                    # Delete keys in batches
                    for i in range(0, len(keys), batch_size):
                        batch = keys[i:i + batch_size]
                        deleted = self.redis_client.delete(*batch)
                        deleted_count += deleted
                
                # If cursor is 0, we've completed the iteration
                if cursor == 0:
                    break
            
            logger.debug(f"Invalidated {deleted_count} keys matching pattern: {pattern}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error invalidating cache pattern {pattern}: {e}")
            return 0
    
    def _handle_special_invalidations(self, channel: str, data: Dict[str, Any]):
        """Handle special invalidation cases."""
        try:
            # Invalidate search results when entities change
            if channel in ['restaurant_change', 'synagogue_change', 'mikvah_change', 'store_change']:
                self._invalidate_search_caches()
            
            # Invalidate watermark caches for ETag system
            if '_change' in channel:
                entity_type = self._extract_entity_type(channel)
                if entity_type != 'general':
                    watermark_key = f"etag_v5:watermark:{entity_type}s"
                    self.redis_client.delete(watermark_key)
                    logger.debug(f"Invalidated watermark cache: {watermark_key}")
            
            # Invalidate aggregated statistics
            if channel in ['restaurant_change', 'review_change', 'order_change']:
                self._invalidate_statistics_caches()
                
        except Exception as e:
            logger.error(f"Error handling special invalidations: {e}")
    
    def _invalidate_search_caches(self):
        """Invalidate search-related caches."""
        try:
            search_patterns = [
                'search:*',
                'unified_search:*',
                'entity_search:*',
                'faceted_search:*'
            ]
            
            for pattern in search_patterns:
                count = self._invalidate_cache_pattern(pattern)
                if count > 0:
                    logger.debug(f"Invalidated {count} search cache keys")
                    
        except Exception as e:
            logger.error(f"Error invalidating search caches: {e}")
    
    def _invalidate_statistics_caches(self):
        """Invalidate statistics and aggregated data caches."""
        try:
            stats_patterns = [
                'stats:*',
                'statistics:*',
                'aggregated_data:*',
                'dashboard_data:*',
                'analytics:*'
            ]
            
            for pattern in stats_patterns:
                count = self._invalidate_cache_pattern(pattern)
                if count > 0:
                    logger.debug(f"Invalidated {count} statistics cache keys")
                    
        except Exception as e:
            logger.error(f"Error invalidating statistics caches: {e}")
    
    def _handle_connection_error(self):
        """Handle database connection errors with exponential backoff."""
        self.reconnect_attempts += 1
        self.stats['reconnections'] += 1
        
        if self.reconnect_attempts > self.max_reconnect_attempts:
            logger.critical("Max reconnection attempts reached, stopping worker")
            self.running = False
            return
        
        # Exponential backoff
        delay = min(self.reconnect_delay * (2 ** (self.reconnect_attempts - 1)), 300)
        logger.warning(f"Reconnection attempt {self.reconnect_attempts} in {delay} seconds")
        
        time.sleep(delay)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get worker statistics."""
        uptime = None
        if self.stats['uptime_start']:
            uptime = (datetime.now() - self.stats['uptime_start']).total_seconds()
        
        return {
            **self.stats,
            'uptime_seconds': uptime,
            'running': self.running,
            'redis_connected': self.redis_client is not None,
            'database_connected': self.connection is not None and not self.connection.closed,
            'listening_channels': self.NOTIFICATION_CHANNELS,
            'reconnect_attempts': self.reconnect_attempts,
        }
    
    def add_custom_strategy(self, channel: str, strategy_func: Callable):
        """Add a custom invalidation strategy for a notification channel."""
        self.invalidation_strategies[channel] = strategy_func
        logger.info(f"Added custom invalidation strategy for channel: {channel}")
    
    def trigger_manual_invalidation(self, pattern: str):
        """Manually trigger cache invalidation for a pattern."""
        try:
            count = self._invalidate_cache_pattern(pattern)
            logger.info(f"Manual invalidation: removed {count} keys matching {pattern}")
            return count
        except Exception as e:
            logger.error(f"Manual invalidation failed for pattern {pattern}: {e}")
            return 0


# Global worker instance
cache_worker = None

def start_cache_invalidation_worker(database_url: str, redis_client=None) -> CacheInvalidationWorker:
    """Start the global cache invalidation worker."""
    global cache_worker
    
    if cache_worker and cache_worker.running:
        logger.warning("Cache invalidation worker is already running")
        return cache_worker
    
    cache_worker = CacheInvalidationWorker(database_url, redis_client)
    cache_worker.start()
    
    return cache_worker

def stop_cache_invalidation_worker():
    """Stop the global cache invalidation worker."""
    global cache_worker
    
    if cache_worker:
        cache_worker.stop()
        cache_worker = None

def get_cache_worker_stats() -> Optional[Dict[str, Any]]:
    """Get cache worker statistics."""
    if cache_worker:
        return cache_worker.get_stats()
    return None

def trigger_cache_invalidation(pattern: str) -> int:
    """Trigger manual cache invalidation."""
    if cache_worker:
        return cache_worker.trigger_manual_invalidation(pattern)
    return 0