"""
Unified Redis operations manager for v5 with enhanced features.

Provides comprehensive Redis operations for caching, rate limiting, and sessions
with connection pooling, failover support, Redis cluster support, advanced cache
strategies, and memory usage optimization.
"""

from __future__ import annotations

import json
import pickle
import time
import zlib
from datetime import datetime
from typing import Any, Dict, List, Optional

import redis
import redis.sentinel
from redis.connection import ConnectionPool

from utils.logging_config import get_logger

logger = get_logger(__name__)


class RedisManagerV5:
    """Enhanced Redis operations manager for v5 with enterprise features."""
    
    # Default configuration
    DEFAULT_CONFIG = {
        'host': 'localhost',
        'port': 6379,
        'password': None,
        'db': 0,
        'socket_timeout': 5.0,
        'socket_connect_timeout': 5.0,
        'socket_keepalive': True,
        'socket_keepalive_options': {},
        'health_check_interval': 30,
        'retry_on_timeout': True,
        'decode_responses': False,  # Set to False for binary (pickle/compression) support
        'max_connections': 100,
        'connection_pool_kwargs': {}
    }
    
    # Compression settings
    COMPRESSION_THRESHOLD = 1024  # Compress values larger than 1KB
    COMPRESSION_LEVEL = 6  # zlib compression level
    
    # Cache key prefixes for organization
    KEY_PREFIXES = {
        'cache': 'cache_v5:',
        'session': 'session_v5:',
        'rate_limit': 'rate_limit_v5:',
        'etag': 'etag_v5:',
        'cursor': 'cursor_v5:',
        'idempotency': 'idempotency_v5:',
        'feature_flags': 'flags_v5:',
        'metrics': 'metrics_v5:',
        'locks': 'lock_v5:',
        'queues': 'queue_v5:',
        'list': 'list_v5:'
    }
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = self._load_config(config)
        self.connection_pool = None
        self.redis_client = None
        self.sentinel_client = None
        self.cluster_client = None
        self.is_cluster = False
        self.is_sentinel = False
        
        # Statistics
        self.stats = {
            'connections_created': 0,
            'commands_executed': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'errors': 0,
            'bytes_written': 0,
            'bytes_read': 0,
            'compressed_operations': 0,
            'list_operations': 0,
        }
        
        self._initialize_client()
    
    def _load_config(self, config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Load and validate Redis configuration."""
        import os
        
        # Start with defaults
        final_config = self.DEFAULT_CONFIG.copy()
        
        # Override with environment variables
        env_config = {
            'host': os.getenv('REDIS_HOST', final_config['host']),
            'port': int(os.getenv('REDIS_PORT', final_config['port'])),
            'password': os.getenv('REDIS_PASSWORD', final_config['password']),
            'db': int(os.getenv('REDIS_DB', final_config['db'])),
        }
        final_config.update(env_config)
        
        # Override with provided config
        if config:
            final_config.update(config)
        
        # Handle Redis URL if provided
        redis_url = os.getenv('REDIS_URL')
        if redis_url and redis_url != 'memory://':
            final_config['url'] = redis_url
        
        # Sentinel configuration
        sentinel_hosts = os.getenv('REDIS_SENTINEL_HOSTS')
        if sentinel_hosts:
            final_config['sentinel_hosts'] = [
                tuple(host.split(':')) for host in sentinel_hosts.split(',')
            ]
            final_config['sentinel_service'] = os.getenv('REDIS_SENTINEL_SERVICE', 'mymaster')
        
        # Cluster configuration
        cluster_hosts = os.getenv('REDIS_CLUSTER_HOSTS')
        if cluster_hosts:
            final_config['cluster_hosts'] = [
                tuple(host.split(':')) for host in cluster_hosts.split(',')
            ]
        
        return final_config
    
    def _is_redis_available(self) -> bool:
        """Check if Redis is available and configured."""
        return self.redis_client is not None
    
    def _initialize_client(self):
        """Initialize Redis client based on configuration."""
        try:
            # Check if Redis is disabled (memory:// URL)
            redis_url = self.config.get('url', '')
            if redis_url == 'memory://' or (not self.config.get('url') and not self.config.get('host')):
                logger.info("Redis disabled (memory:// URL), skipping initialization")
                return
                
            if self.config.get('cluster_hosts'):
                self._initialize_cluster_client()
            elif self.config.get('sentinel_hosts'):
                self._initialize_sentinel_client()
            else:
                self._initialize_single_client()
                
            # Test connection with timeout
            if self.redis_client:
                self.redis_client.ping()
                logger.info("Redis v5 manager initialized successfully")
            else:
                logger.warning("Redis client not available, using fallback mode")
            
        except Exception as e:
            logger.warning(f"Failed to initialize Redis v5 manager: {e}")
            # Don't raise - allow fallback to memory mode
            self.redis_client = None
    
    def _initialize_single_client(self):
        """Initialize single Redis instance client."""
        if self.config.get('url'):
            self.redis_client = redis.from_url(
                self.config['url'],
                decode_responses=self.config['decode_responses'],
                socket_timeout=self.config['socket_timeout'],
                socket_connect_timeout=self.config['socket_connect_timeout'],
                socket_keepalive=self.config['socket_keepalive'],
                socket_keepalive_options=self.config['socket_keepalive_options'],
                retry_on_timeout=self.config['retry_on_timeout'],
                health_check_interval=self.config['health_check_interval'],
                max_connections=self.config['max_connections']
            )
        else:
            # Create connection pool
            self.connection_pool = ConnectionPool(
                host=self.config['host'],
                port=self.config['port'],
                password=self.config['password'],
                db=self.config['db'],
                decode_responses=self.config['decode_responses'],
                socket_timeout=self.config['socket_timeout'],
                socket_connect_timeout=self.config['socket_connect_timeout'],
                socket_keepalive=self.config['socket_keepalive'],
                socket_keepalive_options=self.config['socket_keepalive_options'],
                retry_on_timeout=self.config['retry_on_timeout'],
                health_check_interval=self.config['health_check_interval'],
                max_connections=self.config['max_connections']
            )
            
            self.redis_client = redis.Redis(connection_pool=self.connection_pool)
    
    def _initialize_sentinel_client(self):
        """Initialize Redis Sentinel client for high availability."""
        try:
            self.sentinel_client = redis.sentinel.Sentinel(
                self.config['sentinel_hosts'],
                socket_timeout=self.config['socket_timeout'],
                socket_connect_timeout=self.config['socket_connect_timeout']
            )
            
            self.redis_client = self.sentinel_client.master_for(
                self.config['sentinel_service'],
                password=self.config['password'],
                db=self.config['db'],
                decode_responses=self.config['decode_responses']
            )
            
            self.is_sentinel = True
            logger.info("Redis Sentinel client initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis Sentinel client: {e}")
            raise
    
    def _initialize_cluster_client(self):
        """Initialize Redis Cluster client for horizontal scaling."""
        try:
            try:
                import rediscluster
            except ImportError as e:
                logger.error("rediscluster package not installed. Install with: pip install redis-py-cluster")
                raise ImportError(f"Redis cluster support requires redis-py-cluster package: {e}")
            
            startup_nodes = [
                {"host": host, "port": int(port)}
                for host, port in self.config['cluster_hosts']
            ]
            
            self.cluster_client = rediscluster.RedisCluster(
                startup_nodes=startup_nodes,
                password=self.config['password'],
                decode_responses=self.config['decode_responses'],
                socket_timeout=self.config['socket_timeout'],
                socket_connect_timeout=self.config['socket_connect_timeout'],
                skip_full_coverage_check=True
            )
            
            self.redis_client = self.cluster_client
            self.is_cluster = True
            logger.info("Redis Cluster client initialized")
            
        except ImportError:
            logger.error("redis-py-cluster not installed, falling back to single instance")
            self._initialize_single_client()
        except Exception as e:
            logger.error(f"Failed to initialize Redis Cluster client: {e}")
            raise
    
    def get_client(self) -> redis.Redis:
        """Get the Redis client instance."""
        return self.redis_client
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        prefix: str = 'cache',
        compress: bool = True,
        pickle_protocol: int = pickle.HIGHEST_PROTOCOL
    ) -> bool:
        """
        Set a value in Redis with optional compression and TTL.
        
        Args:
            key: Cache key
            value: Value to store
            ttl: Time to live in seconds
            prefix: Key prefix category
            compress: Whether to compress large values
            pickle_protocol: Pickle protocol version
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self._is_redis_available():
                return True  # Return True for no-op when Redis is disabled
                
            full_key = self._build_key(prefix, key)
            
            # Serialize value
            if isinstance(value, (str, int, float, bool)):
                serialized_value = value
            else:
                serialized_value = pickle.dumps(value, protocol=pickle_protocol)
            
            # Compress if value is large enough and compression is enabled
            if compress and isinstance(serialized_value, bytes) and len(serialized_value) > self.COMPRESSION_THRESHOLD:
                compressed_value = zlib.compress(serialized_value, self.COMPRESSION_LEVEL)
                if len(compressed_value) < len(serialized_value):
                    serialized_value = b'COMPRESSED:' + compressed_value
                    self.stats['compressed_operations'] += 1
            
            # Set value with TTL
            if ttl:
                result = self.redis_client.setex(full_key, ttl, serialized_value)
            else:
                result = self.redis_client.set(full_key, serialized_value)
            
            # Update statistics
            self.stats['commands_executed'] += 1
            self.stats['bytes_written'] += len(str(serialized_value))
            
            return bool(result)
            
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            self.stats['errors'] += 1
            return False
    
    def get(
        self,
        key: str,
        prefix: str = 'cache',
        default: Any = None
    ) -> Any:
        """
        Get a value from Redis with automatic decompression.
        
        Args:
            key: Cache key
            prefix: Key prefix category
            default: Default value if key not found
            
        Returns:
            Stored value or default
        """
        try:
            if not self._is_redis_available():
                return default
                
            full_key = self._build_key(prefix, key)
            value = self.redis_client.get(full_key)
            
            self.stats['commands_executed'] += 1
            
            if value is None:
                self.stats['cache_misses'] += 1
                return default
            
            self.stats['cache_hits'] += 1
            self.stats['bytes_read'] += len(str(value))
            
            # Handle decompression
            if isinstance(value, bytes) and value.startswith(b'COMPRESSED:'):
                value = zlib.decompress(value[11:])  # Remove 'COMPRESSED:' prefix
                self.stats['compressed_operations'] += 1
            
            # Deserialize if needed
            if isinstance(value, bytes):
                try:
                    return pickle.loads(value)
                except (pickle.UnpicklingError, ValueError):
                    # If pickle fails, return as bytes
                    return value
            
            return value
            
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            self.stats['errors'] += 1
            return default
    
    def delete(self, key: str, prefix: str = 'cache') -> bool:
        """Delete a key from Redis."""
        try:
            full_key = self._build_key(prefix, key)
            result = self.redis_client.delete(full_key)
            
            self.stats['commands_executed'] += 1
            return bool(result)
            
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            self.stats['errors'] += 1
            return False
    
    def exists(self, key: str, prefix: str = 'cache') -> bool:
        """Check if a key exists in Redis."""
        try:
            full_key = self._build_key(prefix, key)
            result = self.redis_client.exists(full_key)
            
            self.stats['commands_executed'] += 1
            return bool(result)
            
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            self.stats['errors'] += 1
            return False
    
    def expire(self, key: str, ttl: int, prefix: str = 'cache') -> bool:
        """Set TTL for an existing key."""
        try:
            full_key = self._build_key(prefix, key)
            result = self.redis_client.expire(full_key, ttl)
            
            self.stats['commands_executed'] += 1
            return bool(result)
            
        except Exception as e:
            logger.error(f"Redis EXPIRE error for key {key}: {e}")
            self.stats['errors'] += 1
            return False
    
    def keys(self, pattern: str, prefix: str = 'cache') -> List[str]:
        """Get keys matching a pattern."""
        try:
            full_pattern = self._build_key(prefix, pattern)
            keys = self.redis_client.keys(full_pattern)
            
            self.stats['commands_executed'] += 1
            
            # Remove prefix from returned keys
            prefix_len = len(self.KEY_PREFIXES[prefix])
            return [key[prefix_len:] for key in keys if isinstance(key, str)]
            
        except Exception as e:
            logger.error(f"Redis KEYS error for pattern {pattern}: {e}")
            self.stats['errors'] += 1
            return []
    
    def scan_keys(self, pattern: str, prefix: str = 'cache', count: int = 100) -> List[str]:
        """Get keys matching a pattern using SCAN to avoid blocking Redis."""
        try:
            full_pattern = self._build_key(prefix, pattern)
            keys = []
            cursor = 0
            
            while True:
                cursor, batch_keys = self.redis_client.scan(cursor, match=full_pattern, count=count)
                keys.extend(batch_keys)
                
                if cursor == 0:
                    break
            
            self.stats['commands_executed'] += 1
            
            # Remove prefix from returned keys
            prefix_len = len(self.KEY_PREFIXES[prefix])
            return [key[prefix_len:] for key in keys if isinstance(key, str)]
            
        except Exception as e:
            logger.error(f"Redis SCAN error for pattern {pattern}: {e}")
            self.stats['errors'] += 1
            return []
    
    def mget(self, keys: List[str], prefix: str = 'cache') -> Dict[str, Any]:
        """Get multiple values at once."""
        try:
            if not keys:
                return {}
            
            full_keys = [self._build_key(prefix, key) for key in keys]
            values = self.redis_client.mget(full_keys)
            
            self.stats['commands_executed'] += 1
            
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    # Handle decompression and deserialization
                    if isinstance(value, bytes) and value.startswith(b'COMPRESSED:'):
                        value = zlib.decompress(value[11:])
                        
                    if isinstance(value, bytes):
                        try:
                            value = pickle.loads(value)
                        except (pickle.UnpicklingError, ValueError):
                            pass
                    
                    result[key] = value
                    self.stats['cache_hits'] += 1
                else:
                    self.stats['cache_misses'] += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Redis MGET error: {e}")
            self.stats['errors'] += 1
            return {}
    
    def mset(
        self,
        mapping: Dict[str, Any],
        ttl: Optional[int] = None,
        prefix: str = 'cache',
        compress: bool = True
    ) -> bool:
        """Set multiple key-value pairs at once."""
        try:
            if not mapping:
                return True
            
            # Prepare data
            redis_mapping = {}
            for key, value in mapping.items():
                full_key = self._build_key(prefix, key)
                
                # Serialize value
                if isinstance(value, (str, int, float, bool)):
                    serialized_value = value
                else:
                    serialized_value = pickle.dumps(value)
                
                # Compress if needed
                if compress and isinstance(serialized_value, bytes) and len(serialized_value) > self.COMPRESSION_THRESHOLD:
                    compressed_value = zlib.compress(serialized_value, self.COMPRESSION_LEVEL)
                    if len(compressed_value) < len(serialized_value):
                        serialized_value = b'COMPRESSED:' + compressed_value
                        self.stats['compressed_operations'] += 1
                
                redis_mapping[full_key] = serialized_value
            
            # Use pipeline for atomic operation
            with self.redis_client.pipeline() as pipe:
                pipe.mset(redis_mapping)
                
                # Set TTL for all keys if specified
                if ttl:
                    for full_key in redis_mapping.keys():
                        pipe.expire(full_key, ttl)
                
                pipe.execute()
            
            self.stats['commands_executed'] += len(redis_mapping) * (2 if ttl else 1)
            return True
            
        except Exception as e:
            logger.error(f"Redis MSET error: {e}")
            self.stats['errors'] += 1
            return False
    
    def incr(self, key: str, amount: int = 1, prefix: str = 'cache') -> Optional[int]:
        """Increment a numeric value."""
        try:
            full_key = self._build_key(prefix, key)
            result = self.redis_client.incr(full_key, amount)
            
            self.stats['commands_executed'] += 1
            return result
            
        except Exception as e:
            logger.error(f"Redis INCR error for key {key}: {e}")
            self.stats['errors'] += 1
            return None
    
    def decr(self, key: str, amount: int = 1, prefix: str = 'cache') -> Optional[int]:
        """Decrement a numeric value."""
        try:
            full_key = self._build_key(prefix, key)
            result = self.redis_client.decr(full_key, amount)
            
            self.stats['commands_executed'] += 1
            return result
            
        except Exception as e:
            logger.error(f"Redis DECR error for key {key}: {e}")
            self.stats['errors'] += 1
            return None
    
    def acquire_lock(
        self,
        key: str,
        timeout: int = 10,
        sleep_interval: float = 0.1,
        blocking_timeout: Optional[float] = None
    ) -> Optional[redis.lock.Lock]:
        """Acquire a distributed lock."""
        try:
            full_key = self._build_key('locks', key)
            lock = self.redis_client.lock(
                full_key,
                timeout=timeout,
                sleep=sleep_interval,
                blocking_timeout=blocking_timeout
            )
            
            if lock.acquire():
                return lock
            else:
                return None
                
        except Exception as e:
            logger.error(f"Redis LOCK error for key {key}: {e}")
            self.stats['errors'] += 1
            return None
    
    def push_to_queue(self, queue_name: str, item: Any, prefix: str = 'queues') -> bool:
        """Push an item to a queue (list)."""
        try:
            full_key = self._build_key(prefix, queue_name)
            serialized_item = pickle.dumps(item) if not isinstance(item, (str, int, float, bool)) else item
            
            result = self.redis_client.lpush(full_key, serialized_item)
            self.stats['commands_executed'] += 1
            return bool(result)
            
        except Exception as e:
            logger.error(f"Redis LPUSH error for queue {queue_name}: {e}")
            self.stats['errors'] += 1
            return False
    
    def pop_from_queue(
        self,
        queue_name: str,
        timeout: Optional[int] = None,
        prefix: str = 'queues'
    ) -> Any:
        """Pop an item from a queue (blocking or non-blocking)."""
        try:
            full_key = self._build_key(prefix, queue_name)
            
            if timeout:
                result = self.redis_client.brpop(full_key, timeout=timeout)
                if result:
                    _, value = result
                else:
                    return None
            else:
                value = self.redis_client.rpop(full_key)
            
            self.stats['commands_executed'] += 1
            
            if value is None:
                return None
            
            # Deserialize if needed
            if isinstance(value, bytes):
                try:
                    return pickle.loads(value)
                except (pickle.UnpicklingError, ValueError):
                    return value
            
            return value
            
        except Exception as e:
            logger.error(f"Redis POP error for queue {queue_name}: {e}")
            self.stats['errors'] += 1
            return None
    
    def _build_key(self, prefix: str, key: str) -> str:
        """Build full Redis key with prefix."""
        key_prefix = self.KEY_PREFIXES.get(prefix, f"{prefix}_v5:")
        return f"{key_prefix}{key}"
    
    def get_info(self) -> Dict[str, Any]:
        """Get Redis server information."""
        try:
            info = self.redis_client.info()
            return info
        except Exception as e:
            logger.error(f"Redis INFO error: {e}")
            return {}
    
    def get_stats(self) -> Dict[str, Any]:
        """Get Redis manager statistics."""
        redis_info = self.get_info()
        
        # Calculate derived metrics
        cache_hit_rate = 0.0
        total_cache_ops = self.stats['cache_hits'] + self.stats['cache_misses']
        if total_cache_ops > 0:
            cache_hit_rate = (self.stats['cache_hits'] / total_cache_ops) * 100
        
        return {
            **self.stats,
            'cache_hit_rate_percent': round(cache_hit_rate, 2),
            'redis_memory_usage': redis_info.get('used_memory_human', 'unknown'),
            'redis_connected_clients': redis_info.get('connected_clients', 0),
            'redis_keyspace_hits': redis_info.get('keyspace_hits', 0),
            'redis_keyspace_misses': redis_info.get('keyspace_misses', 0),
            'is_cluster': self.is_cluster,
            'is_sentinel': self.is_sentinel,
            'compression_enabled': True,
            'compression_threshold': self.COMPRESSION_THRESHOLD
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Perform Redis health check."""
        try:
            start_time = time.time()
            self.redis_client.ping()
            ping_time = (time.time() - start_time) * 1000
            
            return {
                'status': 'healthy',
                'ping_time_ms': round(ping_time, 2),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def flush_all(self, pattern: Optional[str] = None):
        """Flush all keys or keys matching a pattern."""
        try:
            if pattern:
                # Delete keys matching pattern
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
                    logger.info(f"Flushed {len(keys)} keys matching pattern: {pattern}")
            else:
                # Flush entire database
                self.redis_client.flushdb()
                logger.info("Flushed all Redis keys")
                
        except Exception as e:
            logger.error(f"Redis FLUSH error: {e}")
            self.stats['errors'] += 1

    def add_to_list(self, key: str, item: Any, max_length: Optional[int] = None) -> bool:
        """
        Add item to Redis list using LPUSH.
        
        Args:
            key: Redis key for the list
            item: Item to add to the list
            max_length: Optional maximum length for the list (trims oldest items)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Serialize item if needed
            if self.config['decode_responses']:
                # For JSON mode, serialize to JSON
                serialized_item = json.dumps(item) if not isinstance(item, str) else item
            else:
                # For binary mode, use pickle
                serialized_item = pickle.dumps(item)
            
            # Add to list
            full_key = self._build_key('list', key)
            self.redis_client.lpush(full_key, serialized_item)
            
            # Trim list if max_length is specified
            if max_length is not None:
                self.redis_client.ltrim(full_key, 0, max_length - 1)
            
            self.stats['list_operations'] += 1
            return True
            
        except Exception as e:
            logger.error(f"Redis LPUSH error for key {key}: {e}")
            self.stats['errors'] += 1
            return False

    def get_from_list(self, key: str, start: int = 0, end: int = -1) -> List[Any]:
        """
        Get items from Redis list using LRANGE.
        
        Args:
            key: Redis key for the list
            start: Start index (0-based)
            end: End index (-1 for all items)
            
        Returns:
            List of items from the Redis list
        """
        try:
            full_key = self._build_key('list', key)
            items = self.redis_client.lrange(full_key, start, end)
            
            # Deserialize items
            result = []
            for item in items:
                if self.config['decode_responses']:
                    # For JSON mode, deserialize from JSON
                    try:
                        result.append(json.loads(item))
                    except (json.JSONDecodeError, TypeError):
                        result.append(item)
                else:
                    # For binary mode, use pickle
                    try:
                        result.append(pickle.loads(item))
                    except (pickle.PickleError, TypeError):
                        result.append(item)
            
            self.stats['list_operations'] += 1
            return result
            
        except Exception as e:
            logger.error(f"Redis LRANGE error for key {key}: {e}")
            self.stats['errors'] += 1
            return []

    def get_list_length(self, key: str) -> int:
        """
        Get the length of a Redis list using LLEN.
        
        Args:
            key: Redis key for the list
            
        Returns:
            Length of the list, 0 if key doesn't exist
        """
        try:
            full_key = self._build_key('list', key)
            length = self.redis_client.llen(full_key)
            self.stats['list_operations'] += 1
            return length
            
        except Exception as e:
            logger.error(f"Redis LLEN error for key {key}: {e}")
            self.stats['errors'] += 1
            return 0


# Global instance
redis_manager_v5 = None

def get_redis_manager_v5(config: Optional[Dict[str, Any]] = None) -> RedisManagerV5:
    """Get the global Redis v5 manager instance."""
    global redis_manager_v5
    
    if redis_manager_v5 is None:
        redis_manager_v5 = RedisManagerV5(config)
    
    return redis_manager_v5
