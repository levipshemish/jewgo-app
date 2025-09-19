#!/usr/bin/env python3
"""
Redis Cluster Manager for high availability and failover.
Provides automatic failover, load balancing, and cluster management.
"""

import redis
import redis.sentinel
from typing import List, Dict, Any, Optional
import time
import json
from utils.logging_config import get_logger
import os

logger = get_logger(__name__)


class RedisClusterManager:
    """Redis cluster manager with automatic failover and load balancing."""
    
    def __init__(self):
        self.sentinel_hosts = self._get_sentinel_hosts()
        self.master_name = os.environ.get('REDIS_MASTER_NAME', 'mymaster')
        self.sentinel = None
        self.master = None
        self.slaves = []
        self.current_connection = None
        self.last_failover_time = 0
        self.failover_cooldown = 30  # seconds
        
    def _get_sentinel_hosts(self) -> List[tuple]:
        """Get Redis Sentinel hosts from environment."""
        sentinel_hosts = os.environ.get('REDIS_SENTINEL_HOSTS', '')
        if not sentinel_hosts:
            # Fallback to single Redis instance
            return [('localhost', 6379)]
        
        hosts = []
        for host_port in sentinel_hosts.split(','):
            host, port = host_port.strip().split(':')
            hosts.append((host, int(port)))
        
        return hosts
    
    def connect(self) -> bool:
        """Connect to Redis cluster."""
        try:
            if len(self.sentinel_hosts) > 1:
                # Use Redis Sentinel for high availability
                self.sentinel = redis.sentinel.Sentinel(
                    self.sentinel_hosts,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                
                # Get master and slaves
                self.master = self.sentinel.master_for(
                    self.master_name,
                    socket_timeout=5,
                    socket_connect_timeout=5
                )
                
                self.slaves = self.sentinel.slave_for(
                    self.master_name,
                    socket_timeout=5,
                    socket_connect_timeout=5
                )
                
                self.current_connection = self.master
                logger.info("Connected to Redis cluster via Sentinel")
                
            else:
                # Single Redis instance
                host, port = self.sentinel_hosts[0]
                self.current_connection = redis.Redis(
                    host=host,
                    port=port,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                logger.info(f"Connected to single Redis instance at {host}:{port}")
            
            # Test connection
            self.current_connection.ping()
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis cluster: {e}")
            return False
    
    def _handle_failover(self) -> bool:
        """Handle automatic failover to slave."""
        current_time = time.time()
        
        # Prevent rapid failovers
        if current_time - self.last_failover_time < self.failover_cooldown:
            return False
        
        try:
            if self.sentinel and self.slaves:
                # Switch to slave
                old_connection = self.current_connection
                self.current_connection = self.slaves
                self.last_failover_time = current_time
                
                # Test new connection
                self.current_connection.ping()
                
                logger.warning("Redis failover: switched to slave")
                return True
                
        except Exception as e:
            logger.error(f"Failover failed: {e}")
            # Revert to master
            self.current_connection = self.master
            
        return False
    
    def _execute_with_failover(self, operation, *args, **kwargs):
        """Execute Redis operation with automatic failover."""
        try:
            return operation(*args, **kwargs)
        except (redis.ConnectionError, redis.TimeoutError) as e:
            logger.warning(f"Redis operation failed: {e}")
            
            if self._handle_failover():
                # Retry with new connection
                try:
                    return operation(*args, **kwargs)
                except Exception as retry_e:
                    logger.error(f"Retry after failover failed: {retry_e}")
                    raise
            else:
                raise
    
    def get(self, key: str, prefix: Optional[str] = None) -> Optional[Any]:
        """Get value from Redis with failover support."""
        full_key = f"{prefix}:{key}" if prefix else key
        
        def _get():
            value = self.current_connection.get(full_key)
            if value:
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return value.decode('utf-8') if isinstance(value, bytes) else value
            return None
        
        return self._execute_with_failover(_get)
    
    def set(self, key: str, value: Any, ex: Optional[int] = None, ttl: Optional[int] = None) -> bool:
        """Set value in Redis with failover support."""
        full_key = key
        
        def _set():
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            elif not isinstance(value, (str, bytes)):
                value = str(value)
            
            expire_time = ex or ttl
            if expire_time:
                return self.current_connection.setex(full_key, expire_time, value)
            else:
                return self.current_connection.set(full_key, value)
        
        return self._execute_with_failover(_set)
    
    def delete(self, key: str) -> bool:
        """Delete key from Redis with failover support."""
        def _delete():
            return bool(self.current_connection.delete(key))
        
        return self._execute_with_failover(_delete)
    
    def exists(self, key: str) -> bool:
        """Check if key exists in Redis with failover support."""
        def _exists():
            return bool(self.current_connection.exists(key))
        
        return self._execute_with_failover(_exists)
    
    def get_cluster_info(self) -> Dict[str, Any]:
        """Get Redis cluster information."""
        try:
            info = self.current_connection.info()
            
            cluster_info = {
                'connected': True,
                'redis_version': info.get('redis_version'),
                'used_memory': info.get('used_memory_human'),
                'connected_clients': info.get('connected_clients'),
                'role': info.get('role'),
                'master_host': info.get('master_host'),
                'master_port': info.get('master_port'),
                'uptime_in_seconds': info.get('uptime_in_seconds'),
                'keyspace_hits': info.get('keyspace_hits'),
                'keyspace_misses': info.get('keyspace_misses'),
                'last_failover': self.last_failover_time
            }
            
            # Add Sentinel info if available
            if self.sentinel:
                try:
                    masters = self.sentinel.discover_master(self.master_name)
                    slaves = self.sentinel.discover_slaves(self.master_name)
                    
                    cluster_info.update({
                        'sentinel_masters': len(masters) if masters else 0,
                        'sentinel_slaves': len(slaves) if slaves else 0,
                        'master_info': masters,
                        'slaves_info': slaves
                    })
                except Exception as e:
                    logger.warning(f"Failed to get Sentinel info: {e}")
            
            return cluster_info
            
        except Exception as e:
            logger.error(f"Failed to get cluster info: {e}")
            return {
                'connected': False,
                'error': str(e),
                'last_failover': self.last_failover_time
            }
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on Redis cluster."""
        try:
            start_time = time.time()
            self.current_connection.ping()
            response_time = (time.time() - start_time) * 1000  # ms
            
            return {
                'healthy': True,
                'response_time_ms': round(response_time, 2),
                'connection_type': 'sentinel' if self.sentinel else 'single',
                'last_failover': self.last_failover_time
            }
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                'healthy': False,
                'error': str(e),
                'connection_type': 'sentinel' if self.sentinel else 'single',
                'last_failover': self.last_failover_time
            }


# Global instance
redis_cluster_manager = RedisClusterManager()