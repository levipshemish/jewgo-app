"""
Specialized rate limiting cache with token bucket implementation.

Provides Redis-based rate limiting storage with token bucket algorithm,
distributed rate limiting, sliding window calculations, and rate limit
analytics. Built on top of the Redis manager v5.
"""

from __future__ import annotations

import json
import math
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from utils.logging_config import get_logger

logger = get_logger(__name__)


class RateLimitCache:
    """Specialized cache for rate limiting with token bucket implementation."""
    
    # Token bucket configuration
    DEFAULT_BUCKET_SIZE = 100
    DEFAULT_REFILL_RATE = 10  # tokens per second
    DEFAULT_WINDOW_SIZE = 60  # seconds
    
    # Cache key patterns
    CACHE_PATTERNS = {
        'token_bucket': 'bucket:{client_key}:{window}',
        'sliding_window': 'window:{client_key}:{timestamp}',
        'rate_stats': 'stats:{client_key}',
        'global_stats': 'global_stats',
        'client_info': 'client:{client_key}',
        'tier_config': 'tier:{tier_name}',
        'endpoint_config': 'endpoint:{endpoint}',
        'burst_tracker': 'burst:{client_key}:{window}'
    }
    
    # Default rate limit configurations by tier
    DEFAULT_TIER_CONFIGS = {
        'anonymous': {
            'requests_per_minute': 60,
            'requests_per_hour': 1000,
            'burst_size': 10,
            'burst_window': 60
        },
        'guest': {
            'requests_per_minute': 100,
            'requests_per_hour': 2000,
            'burst_size': 20,
            'burst_window': 60
        },
        'standard': {
            'requests_per_minute': 200,
            'requests_per_hour': 5000,
            'burst_size': 50,
            'burst_window': 60
        },
        'premium': {
            'requests_per_minute': 500,
            'requests_per_hour': 15000,
            'burst_size': 100,
            'burst_window': 60
        },
        'admin': {
            'requests_per_minute': 2000,
            'requests_per_hour': 60000,
            'burst_size': 500,
            'burst_window': 60
        },
        'unlimited': {
            'requests_per_minute': 10000,
            'requests_per_hour': 1000000,
            'burst_size': 1000,
            'burst_window': 60
        }
    }
    
    def __init__(self, redis_manager=None):
        self.redis_manager = redis_manager
        if not self.redis_manager:
            from backend.cache.redis_manager_v5 import get_redis_manager_v5
            self.redis_manager = get_redis_manager_v5()
        
        # Statistics
        self.stats = {
            'requests_checked': 0,
            'requests_allowed': 0,
            'requests_denied': 0,
            'buckets_created': 0,
            'buckets_refilled': 0,
            'burst_requests': 0
        }
        
        # Initialize tier configurations in cache
        self._initialize_tier_configs()
    
    def _initialize_tier_configs(self):
        """Initialize default tier configurations in cache."""
        try:
            for tier_name, config in self.DEFAULT_TIER_CONFIGS.items():
                self.set_tier_config(tier_name, config)
        except Exception as e:
            logger.error(f"Error initializing tier configurations: {e}")
    
    def check_rate_limit(
        self,
        client_key: str,
        tier: str = 'anonymous',
        endpoint_type: str = 'general',
        window: str = 'minute'
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if request is within rate limit using token bucket algorithm.
        
        Args:
            client_key: Unique client identifier
            tier: Rate limit tier
            endpoint_type: Type of endpoint (affects multipliers)
            window: Time window ('minute' or 'hour')
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        try:
            self.stats['requests_checked'] += 1
            
            # Get tier configuration
            tier_config = self.get_tier_config(tier)
            if not tier_config:
                logger.warning(f"Unknown tier: {tier}, using anonymous")
                tier_config = self.DEFAULT_TIER_CONFIGS['anonymous']
            
            # Get endpoint multiplier
            endpoint_multiplier = self._get_endpoint_multiplier(endpoint_type)
            
            # Calculate limits for this window
            if window == 'minute':
                base_limit = tier_config['requests_per_minute']
                window_seconds = 60
            elif window == 'hour':
                base_limit = tier_config['requests_per_hour']
                window_seconds = 3600
            else:
                raise ValueError(f"Invalid window: {window}")
            
            actual_limit = int(base_limit * endpoint_multiplier)
            burst_size = int(tier_config['burst_size'] * endpoint_multiplier)
            
            # Check token bucket
            is_allowed, bucket_info = self._check_token_bucket(
                client_key, actual_limit, window_seconds, burst_size
            )
            
            # Update statistics
            if is_allowed:
                self.stats['requests_allowed'] += 1
            else:
                self.stats['requests_denied'] += 1
            
            # Prepare response info
            rate_info = {
                'allowed': is_allowed,
                'tier': tier,
                'endpoint_type': endpoint_type,
                'limit': actual_limit,
                'remaining': bucket_info.get('tokens_remaining', 0),
                'reset_time': bucket_info.get('reset_time', int(time.time() + window_seconds)),
                'window': window,
                'window_seconds': window_seconds,
                'retry_after': bucket_info.get('retry_after', window_seconds) if not is_allowed else None
            }
            
            return is_allowed, rate_info
            
        except Exception as e:
            logger.error(f"Error checking rate limit for {client_key}: {e}")
            # On error, allow the request but log it
            return True, {
                'allowed': True,
                'error': str(e),
                'fallback_mode': True
            }
    
    def _check_token_bucket(
        self,
        client_key: str,
        limit: int,
        window_seconds: int,
        burst_size: int
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check token bucket for rate limiting.
        
        Args:
            client_key: Client identifier
            limit: Request limit for window
            window_seconds: Window size in seconds
            burst_size: Maximum burst size
            
        Returns:
            Tuple of (is_allowed, bucket_info)
        """
        try:
            now = time.time()
            current_window = int(now // window_seconds)
            
            bucket_key = self.CACHE_PATTERNS['token_bucket'].format(
                client_key=client_key,
                window=current_window
            )
            
            # Get current bucket state or create new one
            bucket_data = self.redis_manager.get(bucket_key, prefix='rate_limit')
            
            if not bucket_data:
                # Create new bucket
                bucket_data = {
                    'tokens': limit,
                    'last_refill': now,
                    'created_at': now,
                    'requests_made': 0
                }
                self.stats['buckets_created'] += 1
            else:
                # Refill tokens based on time elapsed
                bucket_data = self._refill_bucket(bucket_data, limit, window_seconds, now)
            
            # Check if request can be served
            if bucket_data['tokens'] >= 1:
                # Allow request - consume token
                bucket_data['tokens'] -= 1
                bucket_data['requests_made'] += 1
                bucket_data['last_request'] = now
                
                # Check burst limits
                is_burst = self._check_burst_limit(client_key, burst_size, window_seconds)
                if is_burst:
                    self.stats['burst_requests'] += 1
                
                # Save updated bucket state
                self.redis_manager.set(
                    bucket_key,
                    bucket_data,
                    ttl=window_seconds * 2,  # Keep bucket for 2 windows
                    prefix='rate_limit'
                )
                
                return True, {
                    'tokens_remaining': max(0, int(bucket_data['tokens'])),
                    'requests_made': bucket_data['requests_made'],
                    'reset_time': int((current_window + 1) * window_seconds),
                    'is_burst': is_burst
                }
            else:
                # Deny request - no tokens available
                retry_after = int((current_window + 1) * window_seconds - now)
                
                return False, {
                    'tokens_remaining': 0,
                    'requests_made': bucket_data['requests_made'],
                    'reset_time': int((current_window + 1) * window_seconds),
                    'retry_after': retry_after
                }
                
        except Exception as e:
            logger.error(f"Error in token bucket check: {e}")
            return True, {'error': str(e)}
    
    def _refill_bucket(
        self,
        bucket_data: Dict[str, Any],
        limit: int,
        window_seconds: int,
        now: float
    ) -> Dict[str, Any]:
        """Refill token bucket based on elapsed time."""
        try:
            last_refill = bucket_data.get('last_refill', now)
            elapsed = now - last_refill
            
            if elapsed > 0:
                # Calculate tokens to add based on refill rate
                refill_rate = limit / window_seconds  # tokens per second
                tokens_to_add = elapsed * refill_rate
                
                # Add tokens but don't exceed limit
                new_token_count = min(limit, bucket_data['tokens'] + tokens_to_add)
                
                bucket_data['tokens'] = new_token_count
                bucket_data['last_refill'] = now
                
                if tokens_to_add > 0:
                    self.stats['buckets_refilled'] += 1
            
            return bucket_data
            
        except Exception as e:
            logger.error(f"Error refilling bucket: {e}")
            return bucket_data
    
    def _check_burst_limit(
        self,
        client_key: str,
        burst_size: int,
        window_seconds: int
    ) -> bool:
        """Check if request is within burst limits."""
        try:
            now = time.time()
            burst_window = 60  # 1-minute burst window
            current_burst_window = int(now // burst_window)
            
            burst_key = self.CACHE_PATTERNS['burst_tracker'].format(
                client_key=client_key,
                window=current_burst_window
            )
            
            burst_count = self.redis_manager.get(burst_key, prefix='rate_limit') or 0
            burst_count = int(burst_count) + 1
            
            # Update burst counter
            self.redis_manager.set(
                burst_key,
                burst_count,
                ttl=burst_window * 2,
                prefix='rate_limit'
            )
            
            return burst_count <= burst_size
            
        except Exception as e:
            logger.error(f"Error checking burst limit: {e}")
            return True  # Allow on error
    
    def _get_endpoint_multiplier(self, endpoint_type: str) -> float:
        """Get rate limit multiplier for endpoint type."""
        multipliers = {
            'general': 1.0,
            'search': 0.7,      # Search is more expensive
            'upload': 0.2,      # Uploads are very expensive
            'export': 0.3,      # Exports are expensive
            'admin': 2.0,       # Admin gets higher limits
            'auth': 0.5,        # Auth endpoints get lower limits (prevent brute force)
            'webhook': 1.5      # Webhooks get slightly higher limits
        }
        
        return multipliers.get(endpoint_type, 1.0)
    
    def get_client_stats(self, client_key: str) -> Dict[str, Any]:
        """Get rate limiting statistics for a specific client."""
        try:
            stats_key = self.CACHE_PATTERNS['rate_stats'].format(client_key=client_key)
            stats = self.redis_manager.get(stats_key, prefix='rate_limit') or {}
            
            # Add current bucket information
            now = time.time()
            current_minute = int(now // 60)
            current_hour = int(now // 3600)
            
            minute_bucket_key = self.CACHE_PATTERNS['token_bucket'].format(
                client_key=client_key,
                window=current_minute
            )
            hour_bucket_key = self.CACHE_PATTERNS['token_bucket'].format(
                client_key=client_key,
                window=current_hour
            )
            
            minute_bucket = self.redis_manager.get(minute_bucket_key, prefix='rate_limit') or {}
            hour_bucket = self.redis_manager.get(hour_bucket_key, prefix='rate_limit') or {}
            
            return {
                **stats,
                'client_key': client_key,
                'current_minute_bucket': {
                    'tokens_remaining': minute_bucket.get('tokens', 0),
                    'requests_made': minute_bucket.get('requests_made', 0)
                },
                'current_hour_bucket': {
                    'tokens_remaining': hour_bucket.get('tokens', 0),
                    'requests_made': hour_bucket.get('requests_made', 0)
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting client stats for {client_key}: {e}")
            return {'client_key': client_key, 'error': str(e)}
    
    def update_client_stats(self, client_key: str, stats_update: Dict[str, Any]):
        """Update rate limiting statistics for a client."""
        try:
            stats_key = self.CACHE_PATTERNS['rate_stats'].format(client_key=client_key)
            current_stats = self.redis_manager.get(stats_key, prefix='rate_limit') or {}
            
            # Merge stats
            for key, value in stats_update.items():
                if key in current_stats and isinstance(current_stats[key], (int, float)):
                    current_stats[key] += value
                else:
                    current_stats[key] = value
            
            current_stats['last_updated'] = time.time()
            
            self.redis_manager.set(
                stats_key,
                current_stats,
                ttl=24 * 3600,  # Keep stats for 24 hours
                prefix='rate_limit'
            )
            
        except Exception as e:
            logger.error(f"Error updating client stats for {client_key}: {e}")
    
    def set_tier_config(self, tier_name: str, config: Dict[str, Any]) -> bool:
        """Set configuration for a rate limit tier."""
        try:
            tier_key = self.CACHE_PATTERNS['tier_config'].format(tier_name=tier_name)
            return self.redis_manager.set(
                tier_key,
                config,
                ttl=24 * 3600,  # Keep config for 24 hours
                prefix='rate_limit'
            )
        except Exception as e:
            logger.error(f"Error setting tier config for {tier_name}: {e}")
            return False
    
    def get_tier_config(self, tier_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a rate limit tier."""
        try:
            tier_key = self.CACHE_PATTERNS['tier_config'].format(tier_name=tier_name)
            config = self.redis_manager.get(tier_key, prefix='rate_limit')
            
            if config:
                return config
            else:
                # Fallback to default config
                return self.DEFAULT_TIER_CONFIGS.get(tier_name)
                
        except Exception as e:
            logger.error(f"Error getting tier config for {tier_name}: {e}")
            return self.DEFAULT_TIER_CONFIGS.get(tier_name)
    
    def get_global_stats(self) -> Dict[str, Any]:
        """Get global rate limiting statistics."""
        try:
            global_stats_key = self.CACHE_PATTERNS['global_stats']
            cached_stats = self.redis_manager.get(global_stats_key, prefix='rate_limit') or {}
            
            # Merge with current stats
            current_stats = {
                **cached_stats,
                **self.stats,
                'timestamp': datetime.now().isoformat(),
                'available_tiers': list(self.DEFAULT_TIER_CONFIGS.keys()),
                'cache_connected': self.redis_manager is not None
            }
            
            # Calculate derived metrics
            if self.stats['requests_checked'] > 0:
                current_stats['allow_rate_percent'] = (
                    self.stats['requests_allowed'] / self.stats['requests_checked'] * 100
                )
                current_stats['deny_rate_percent'] = (
                    self.stats['requests_denied'] / self.stats['requests_checked'] * 100
                )
            else:
                current_stats['allow_rate_percent'] = 0
                current_stats['deny_rate_percent'] = 0
            
            # Update cached stats periodically
            self.redis_manager.set(
                global_stats_key,
                current_stats,
                ttl=300,  # 5 minutes
                prefix='rate_limit'
            )
            
            return current_stats
            
        except Exception as e:
            logger.error(f"Error getting global stats: {e}")
            return {**self.stats, 'error': str(e)}
    
    def reset_client_limits(self, client_key: str) -> bool:
        """Reset rate limits for a specific client."""
        try:
            patterns = [
                f"bucket:{client_key}:*",
                f"window:{client_key}:*",
                f"burst:{client_key}:*",
                f"stats:{client_key}"
            ]
            
            total_deleted = 0
            for pattern in patterns:
                keys = self.redis_manager.keys(pattern, prefix='rate_limit')
                for key in keys:
                    if self.redis_manager.delete(key, prefix='rate_limit'):
                        total_deleted += 1
            
            logger.info(f"Reset rate limits for {client_key}, cleared {total_deleted} keys")
            return total_deleted > 0
            
        except Exception as e:
            logger.error(f"Error resetting limits for {client_key}: {e}")
            return False
    
    def cleanup_expired_buckets(self) -> int:
        """Clean up expired rate limit buckets."""
        try:
            # Get all bucket keys
            bucket_keys = self.redis_manager.keys("bucket:*", prefix='rate_limit')
            
            cleaned_count = 0
            now = time.time()
            
            for key in bucket_keys:
                bucket_data = self.redis_manager.get(key, prefix='rate_limit')
                if bucket_data:
                    created_at = bucket_data.get('created_at', now)
                    # Clean buckets older than 2 hours
                    if now - created_at > 7200:
                        self.redis_manager.delete(key, prefix='rate_limit')
                        cleaned_count += 1
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired rate limit buckets")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired buckets: {e}")
            return 0
    
    def get_top_clients(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top clients by request volume."""
        try:
            # This is a simplified implementation
            # In a real system, you'd aggregate data from multiple sources
            
            stats_keys = self.redis_manager.keys("stats:*", prefix='rate_limit')
            client_stats = []
            
            for key in stats_keys[:limit]:  # Limit to prevent too much processing
                stats = self.redis_manager.get(key, prefix='rate_limit')
                if stats:
                    client_key = key.replace('stats:', '')
                    client_stats.append({
                        'client_key': client_key,
                        'total_requests': stats.get('total_requests', 0),
                        'requests_denied': stats.get('requests_denied', 0),
                        'last_activity': stats.get('last_updated', 0)
                    })
            
            # Sort by total requests
            client_stats.sort(key=lambda x: x['total_requests'], reverse=True)
            return client_stats[:limit]
            
        except Exception as e:
            logger.error(f"Error getting top clients: {e}")
            return []


# Global instance
rate_limit_cache = None

def get_rate_limit_cache(redis_manager=None) -> RateLimitCache:
    """Get the global rate limit cache instance."""
    global rate_limit_cache
    
    if rate_limit_cache is None:
        rate_limit_cache = RateLimitCache(redis_manager)
    
    return rate_limit_cache