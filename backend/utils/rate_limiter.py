#!/usr/bin/env python3
"""
Enhanced Rate Limiting for JewGo API
===================================
This module provides comprehensive rate limiting with:
- Per-user rate limiting
- Per-IP rate limiting
- Endpoint-specific limits
- Redis-based distributed rate limiting
- Graceful degradation
"""

import time
from typing import Dict, Tuple
from functools import wraps
from flask import request, jsonify, g
import redis
from utils.logging_config import get_logger

logger = get_logger(__name__)


class RateLimiter:
    """Advanced rate limiter with Redis backend."""
    
    def __init__(self, redis_url: str = None):
        """Initialize the rate limiter."""
        try:
            if redis_url:
                self.redis = redis.from_url(redis_url)
            else:
                # Use environment variables
                import os
                redis_host = os.getenv("REDIS_HOST", "localhost")
                redis_port = int(os.getenv("REDIS_PORT", 6379))
                redis_password = os.getenv("REDIS_PASSWORD")
                redis_db = int(os.getenv("REDIS_DB", 0))
                
                self.redis = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    password=redis_password,
                    db=redis_db,
                    decode_responses=True
                )
            
            # Test connection
            self.redis.ping()
            self.connected = True
            logger.info("Rate limiter initialized with Redis")
        except Exception as e:
            logger.warning(f"Redis not available for rate limiting: {e}")
            self.redis = None
            self.connected = False
    
    def _get_client_id(self) -> str:
        """Get unique client identifier (user ID or IP)."""
        # Try to get user ID from Flask g context
        if hasattr(g, 'user_id') and g.user_id:
            return f"user:{g.user_id}"
        
        # Fallback to IP address
        return f"ip:{request.remote_addr}"
    
    def _get_rate_limit_key(self, endpoint: str, client_id: str, window: int) -> str:
        """Generate rate limit key."""
        # Create time window
        current_window = int(time.time() // window)
        return f"rate_limit:{endpoint}:{client_id}:{current_window}"
    
    def check_rate_limit(
        self, 
        endpoint: str, 
        limit: int, 
        window: int = 60,
        client_id: str = None
    ) -> Tuple[bool, Dict[str, int]]:
        """
        Check if request is within rate limit.
        
        Args:
            endpoint: API endpoint name
            limit: Maximum requests per window
            window: Time window in seconds
            client_id: Optional client ID (defaults to user/IP)
        
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        if not self.connected:
            # If Redis is not available, allow all requests
            return True, {'limit': limit, 'remaining': limit, 'reset': int(time.time() + window)}
        
        client_id = client_id or self._get_client_id()
        key = self._get_rate_limit_key(endpoint, client_id, window)
        
        try:
            # Use Redis pipeline for atomic operations
            pipe = self.redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, window)
            results = pipe.execute()
            
            current_count = results[0]
            
            if current_count > limit:
                # Rate limit exceeded
                return False, {
                    'limit': limit,
                    'remaining': 0,
                    'reset': int(time.time() + window),
                    'current': current_count
                }
            
            return True, {
                'limit': limit,
                'remaining': max(0, limit - current_count),
                'reset': int(time.time() + window),
                'current': current_count
            }
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            # On error, allow the request
            return True, {'limit': limit, 'remaining': limit, 'reset': int(time.time() + window)}


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(limit: int, window: int = 60, per: str = 'user'):
    """
    Decorator for rate limiting API endpoints.
    
    Args:
        limit: Maximum requests per window
        window: Time window in seconds
        per: Rate limit per 'user' or 'ip'
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get client identifier
            if per == 'user' and hasattr(g, 'user_id') and g.user_id:
                client_id = f"user:{g.user_id}"
            else:
                client_id = f"ip:{request.remote_addr}"
            
            # Check rate limit
            endpoint = f"{request.endpoint}:{request.method}"
            is_allowed, rate_info = rate_limiter.check_rate_limit(
                endpoint, limit, window, client_id
            )
            
            if not is_allowed:
                logger.warning(
                    f"Rate limit exceeded for {client_id} on {endpoint}",
                    client_id=client_id,
                    endpoint=endpoint,
                    rate_info=rate_info
                )
                
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests. Limit: {rate_info["limit"]} per {window} seconds',
                    'rate_limit': rate_info
                }), 429
            
            # Add rate limit headers to response
            response = func(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Limit'] = str(rate_info['limit'])
                response.headers['X-RateLimit-Remaining'] = str(rate_info['remaining'])
                response.headers['X-RateLimit-Reset'] = str(rate_info['reset'])
            
            return response
        
        return wrapper
    return decorator


# Predefined rate limits for different endpoint types
RATE_LIMITS = {
    'public_read': {'limit': 100, 'window': 60, 'per': 'ip'},      # 100/min per IP
    'authenticated_read': {'limit': 500, 'window': 60, 'per': 'user'},  # 500/min per user
    'public_write': {'limit': 10, 'window': 60, 'per': 'ip'},      # 10/min per IP
    'authenticated_write': {'limit': 60, 'window': 60, 'per': 'user'},  # 60/min per user
    'search': {'limit': 30, 'window': 60, 'per': 'ip'},           # 30/min per IP
    'admin': {'limit': 1000, 'window': 60, 'per': 'user'},        # 1000/min per user
}


def public_read_limit():
    """Rate limit for public read operations."""
    return rate_limit(**RATE_LIMITS['public_read'])


def authenticated_read_limit():
    """Rate limit for authenticated read operations."""
    return rate_limit(**RATE_LIMITS['authenticated_read'])


def public_write_limit():
    """Rate limit for public write operations."""
    return rate_limit(**RATE_LIMITS['public_write'])


def authenticated_write_limit():
    """Rate limit for authenticated write operations."""
    return rate_limit(**RATE_LIMITS['authenticated_write'])


def search_limit():
    """Rate limit for search operations."""
    return rate_limit(**RATE_LIMITS['search'])


def admin_limit():
    """Rate limit for admin operations."""
    return rate_limit(**RATE_LIMITS['admin'])


def get_rate_limit_stats() -> Dict[str, any]:
    """Get rate limiting statistics."""
    return {
        'redis_connected': rate_limiter.connected,
        'limits': RATE_LIMITS
    }