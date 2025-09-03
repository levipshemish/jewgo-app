"""
Rate limiting utility for API endpoints.

This module provides rate limiting functionality to protect against abuse
and ensure fair usage of API resources.
"""

import time
import hashlib
from functools import wraps
from typing import Optional, Dict, Any
from flask import request, jsonify
from utils.logging_config import get_logger

logger = get_logger(__name__)


class InMemoryRateLimiter:
    """
    Simple in-memory rate limiter using sliding window.
    For production, consider using Redis for distributed rate limiting.
    """
    
    def __init__(self):
        self.requests = {}  # {key: [(timestamp, count), ...]}
        self.cleanup_interval = 300  # Clean up old entries every 5 minutes
        self.last_cleanup = time.time()
    
    def _cleanup_old_entries(self):
        """Remove old entries to prevent memory leaks."""
        current_time = time.time()
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        # Remove entries older than 1 hour
        cutoff_time = current_time - 3600
        keys_to_remove = []
        
        for key, timestamps in self.requests.items():
            # Filter out old timestamps
            self.requests[key] = [ts for ts in timestamps if ts > cutoff_time]
            
            # Mark empty keys for removal
            if not self.requests[key]:
                keys_to_remove.append(key)
        
        # Remove empty keys
        for key in keys_to_remove:
            del self.requests[key]
        
        self.last_cleanup = current_time
        logger.debug(f"Rate limiter cleanup: removed {len(keys_to_remove)} empty keys")
    
    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        """
        Check if request is allowed under rate limit.
        
        Args:
            key: Unique identifier for rate limiting (e.g., IP address, user ID)
            max_requests: Maximum number of requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            True if request is allowed, False otherwise
        """
        current_time = time.time()
        window_start = current_time - window_seconds
        
        # Clean up old entries periodically
        self._cleanup_old_entries()
        
        # Get existing requests for this key
        if key not in self.requests:
            self.requests[key] = []
        
        # Filter requests within the current window
        recent_requests = [ts for ts in self.requests[key] if ts > window_start]
        
        # Check if we're under the limit
        if len(recent_requests) < max_requests:
            # Add current request timestamp
            recent_requests.append(current_time)
            self.requests[key] = recent_requests
            return True
        
        # Update the list (remove old timestamps)
        self.requests[key] = recent_requests
        return False
    
    def get_remaining_requests(self, key: str, max_requests: int, window_seconds: int) -> int:
        """Get number of remaining requests in current window."""
        current_time = time.time()
        window_start = current_time - window_seconds
        
        if key not in self.requests:
            return max_requests
        
        recent_requests = [ts for ts in self.requests[key] if ts > window_start]
        return max(0, max_requests - len(recent_requests))
    
    def get_reset_time(self, key: str, window_seconds: int) -> Optional[float]:
        """Get timestamp when the rate limit resets."""
        if key not in self.requests or not self.requests[key]:
            return None
        
        # Find the oldest request in the current window
        current_time = time.time()
        window_start = current_time - window_seconds
        recent_requests = [ts for ts in self.requests[key] if ts > window_start]
        
        if not recent_requests:
            return None
        
        # The limit resets when the oldest request falls out of the window
        oldest_request = min(recent_requests)
        return oldest_request + window_seconds


# Global rate limiter instance
rate_limiter = InMemoryRateLimiter()


def get_rate_limit_key(identifier: str = None) -> str:
    """
    Generate rate limit key based on request context.
    
    Args:
        identifier: Custom identifier (e.g., user ID)
        
    Returns:
        Hashed key for rate limiting
    """
    if identifier:
        key_parts = [identifier]
    else:
        # Use IP address and endpoint as default
        ip_address = request.remote_addr
        if request.headers.get('X-Forwarded-For'):
            ip_address = request.headers.get('X-Forwarded-For').split(',')[0].strip()
        elif request.headers.get('X-Real-IP'):
            ip_address = request.headers.get('X-Real-IP')
        
        endpoint = request.endpoint or 'unknown'
        key_parts = [ip_address, endpoint]
    
    # Create hash of the key parts for consistent length
    key_string = '|'.join(key_parts)
    return hashlib.sha256(key_string.encode()).hexdigest()[:32]


def rate_limit(max_requests: int, window_seconds: int, identifier: str = None, skip_if_auth: bool = False):
    """
    Decorator for rate limiting API endpoints.
    
    Args:
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds
        identifier: Custom identifier for rate limiting (default: IP + endpoint)
        skip_if_auth: Skip rate limiting for authenticated users
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Skip rate limiting for authenticated users if requested
                if skip_if_auth:
                    auth_header = request.headers.get('Authorization')
                    if auth_header and auth_header.startswith('Bearer '):
                        # Let authentication decorator handle token validation
                        return f(*args, **kwargs)
                
                # Generate rate limit key
                key = get_rate_limit_key(identifier)
                
                # Check rate limit
                if not rate_limiter.is_allowed(key, max_requests, window_seconds):
                    # Get additional info for response headers
                    remaining = rate_limiter.get_remaining_requests(key, max_requests, window_seconds)
                    reset_time = rate_limiter.get_reset_time(key, window_seconds)
                    
                    response = jsonify({
                        'error': 'Rate limit exceeded',
                        'message': f'Maximum {max_requests} requests per {window_seconds} seconds',
                        'retry_after': int(reset_time - time.time()) if reset_time else window_seconds
                    })
                    
                    # Add rate limit headers
                    response.headers['X-RateLimit-Limit'] = str(max_requests)
                    response.headers['X-RateLimit-Remaining'] = str(remaining)
                    response.headers['X-RateLimit-Window'] = str(window_seconds)
                    
                    if reset_time:
                        response.headers['X-RateLimit-Reset'] = str(int(reset_time))
                        response.headers['Retry-After'] = str(int(reset_time - time.time()))
                    
                    logger.warning(f"Rate limit exceeded for key: {key[:8]}...")
                    return response, 429
                
                # Add rate limit headers to successful responses
                remaining = rate_limiter.get_remaining_requests(key, max_requests, window_seconds)
                reset_time = rate_limiter.get_reset_time(key, window_seconds)
                
                # Call the original function
                response = f(*args, **kwargs)
                
                # Add headers to response if it's a tuple (response, status_code)
                if isinstance(response, tuple):
                    response_obj, status_code = response
                    if hasattr(response_obj, 'headers'):
                        response_obj.headers['X-RateLimit-Limit'] = str(max_requests)
                        response_obj.headers['X-RateLimit-Remaining'] = str(remaining)
                        response_obj.headers['X-RateLimit-Window'] = str(window_seconds)
                        if reset_time:
                            response_obj.headers['X-RateLimit-Reset'] = str(int(reset_time))
                    return response_obj, status_code
                elif hasattr(response, 'headers'):
                    response.headers['X-RateLimit-Limit'] = str(max_requests)
                    response.headers['X-RateLimit-Remaining'] = str(remaining)
                    response.headers['X-RateLimit-Window'] = str(window_seconds)
                    if reset_time:
                        response.headers['X-RateLimit-Reset'] = str(int(reset_time))
                
                return response
                
            except Exception as e:
                logger.error(f"Rate limiting error: {e}")
                # Don't block request if rate limiting fails
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def rate_limit_by_user(max_requests: int, window_seconds: int):
    """
    Rate limit by authenticated user ID.
    Requires authentication decorator to be applied first.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                from flask import g
                user_id = getattr(g, 'user_id', None)
                
                if not user_id:
                    # Fall back to IP-based rate limiting
                    return rate_limit(max_requests, window_seconds)(f)(*args, **kwargs)
                
                # Use user ID as identifier
                key = get_rate_limit_key(user_id)
                
                if not rate_limiter.is_allowed(key, max_requests, window_seconds):
                    remaining = rate_limiter.get_remaining_requests(key, max_requests, window_seconds)
                    reset_time = rate_limiter.get_reset_time(key, window_seconds)
                    
                    response = jsonify({
                        'error': 'Rate limit exceeded',
                        'message': f'Maximum {max_requests} requests per {window_seconds} seconds per user'
                    })
                    
                    response.headers['X-RateLimit-Limit'] = str(max_requests)
                    response.headers['X-RateLimit-Remaining'] = str(remaining)
                    response.headers['X-RateLimit-Window'] = str(window_seconds)
                    
                    if reset_time:
                        response.headers['X-RateLimit-Reset'] = str(int(reset_time))
                        response.headers['Retry-After'] = str(int(reset_time - time.time()))
                    
                    logger.warning(f"User rate limit exceeded: {user_id}")
                    return response, 429
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"User rate limiting error: {e}")
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def get_rate_limit_status(identifier: str = None) -> Dict[str, Any]:
    """
    Get current rate limit status for debugging/monitoring.
    
    Args:
        identifier: Custom identifier (default: current request context)
        
    Returns:
        Dictionary with rate limit information
    """
    try:
        key = get_rate_limit_key(identifier)
        current_time = time.time()
        
        # Get info for common limits (this is just for debugging)
        limits = [
            {'name': 'auth_login', 'max_requests': 10, 'window_seconds': 900},
            {'name': 'auth_register', 'max_requests': 5, 'window_seconds': 3600},
            {'name': 'default', 'max_requests': 100, 'window_seconds': 3600}
        ]
        
        status = {
            'key': key[:8] + '...',  # Truncated for security
            'current_time': current_time,
            'limits': []
        }
        
        for limit in limits:
            remaining = rate_limiter.get_remaining_requests(
                key, limit['max_requests'], limit['window_seconds']
            )
            reset_time = rate_limiter.get_reset_time(key, limit['window_seconds'])
            
            status['limits'].append({
                'name': limit['name'],
                'max_requests': limit['max_requests'],
                'window_seconds': limit['window_seconds'],
                'remaining': remaining,
                'reset_time': reset_time,
                'seconds_until_reset': int(reset_time - current_time) if reset_time else None
            })
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting rate limit status: {e}")
        return {'error': str(e)}