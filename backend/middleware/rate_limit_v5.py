"""
Enhanced token bucket rate limiting middleware for v5 API.

Provides comprehensive rate limiting with Redis backend, token bucket algorithm,
per-user/IP/endpoint controls, configurable limits based on user roles, and
graceful degradation capabilities. Built upon existing rate limiting patterns.
"""

from __future__ import annotations

import time
import json
import hashlib
from typing import Dict, Optional, Tuple, Any, List
from functools import wraps

from flask import g, request, jsonify

from utils.logging_config import get_logger

logger = get_logger(__name__)


class RateLimitV5Middleware:
    """Enhanced token bucket rate limiting middleware for v5 API."""
    
    # Rate limit configurations by user tier
    RATE_LIMIT_CONFIGS = {
        'anonymous': {
            'requests_per_minute': 60,
            'requests_per_hour': 1000,
            'burst_allowance': 100,  # Increased for local testing
            'sliding_window_minutes': 5
        },
        'guest': {
            'requests_per_minute': 100,
            'requests_per_hour': 2000,
            'burst_allowance': 20,
            'sliding_window_minutes': 5
        },
        'standard': {
            'requests_per_minute': 200,
            'requests_per_hour': 5000,
            'burst_allowance': 50,
            'sliding_window_minutes': 10
        },
        'premium': {
            'requests_per_minute': 500,
            'requests_per_hour': 15000,
            'burst_allowance': 100,
            'sliding_window_minutes': 15
        },
        'moderator': {
            'requests_per_minute': 1000,
            'requests_per_hour': 30000,
            'burst_allowance': 200,
            'sliding_window_minutes': 30
        },
        'admin': {
            'requests_per_minute': 2000,
            'requests_per_hour': 60000,
            'burst_allowance': 500,
            'sliding_window_minutes': 60
        },
        'unlimited': {
            'requests_per_minute': 10000,
            'requests_per_hour': 1000000,
            'burst_allowance': 1000,
            'sliding_window_minutes': 60
        }
    }
    
    # Endpoint-specific multipliers
    ENDPOINT_MULTIPLIERS = {
        'search': 0.5,      # Search endpoints get 50% of base limit
        'upload': 0.1,      # Upload endpoints get 10% of base limit
        'export': 0.2,      # Export endpoints get 20% of base limit
        'admin': 2.0,       # Admin endpoints get 200% of base limit
        'auth': 0.3,        # Auth endpoints get 30% of base limit (prevent brute force)
        'public': 1.0,      # Public endpoints get 100% of base limit
    }
    
    def __init__(self, app=None):
        self.app = app
        self.redis_client = None
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with Flask app."""
        self.app = app
        self._init_redis()
        self._register_middleware()
    
    def _init_redis(self):
        """Initialize Redis connection for rate limiting."""
        try:
            from cache.redis_manager_v5 import RedisManagerV5
            redis_manager = RedisManagerV5()
            self.redis_client = redis_manager.get_client()
            
            # Test connection
            self.redis_client.ping()
            logger.info("Rate limiting v5 middleware initialized with Redis")
        except Exception as e:
            logger.warning(f"Rate limiting v5 middleware will operate without Redis: {e}")
            self.redis_client = None
    
    def _register_middleware(self):
        """Register before request hook for rate limiting."""
        
        @self.app.before_request
        def _v5_rate_limit_check():
            """Check rate limits for v5 API requests."""
            # Skip rate limiting for non-v5 endpoints unless enabled
            if not self._should_apply_v5_rate_limiting():
                return
            
            try:
                # Get rate limit configuration
                client_key = self._get_client_key()
                rate_tier = getattr(g, 'rate_limit_tier', 'anonymous')
                endpoint_type = self._classify_endpoint()
                
                # Check token bucket rate limit
                is_allowed, rate_info = self._check_token_bucket_limit(
                    client_key, rate_tier, endpoint_type
                )
                
                if not is_allowed:
                    return self._create_rate_limit_response(rate_info)
                
                # Store rate limit info in request context
                g.rate_limit_info = rate_info
                
            except Exception as e:
                logger.error(f"Rate limiting v5 error: {e}")
                # Continue on error to avoid blocking requests
    
    def _should_apply_v5_rate_limiting(self) -> bool:
        """Determine if v5 rate limiting should be applied."""
        # Apply to v5 endpoints
        if request.path.startswith('/api/v5/'):
            return True
        
        # Apply to endpoints with v5 feature flag enabled
        try:
            from utils.feature_flags_v5 import FeatureFlagsV5
            feature_flags = FeatureFlagsV5()
            return feature_flags.is_enabled('rate_limit_v5_for_legacy', default=False)
        except ImportError:
            return False
    
    def _get_client_key(self) -> str:
        """Get unique client identifier for rate limiting."""
        # Use rate limit key from auth middleware if available
        if hasattr(g, 'rate_limit_key'):
            return g.rate_limit_key
        
        # Fallback to user ID or IP
        if hasattr(g, 'user_id') and g.user_id:
            return f"user:{g.user_id}"
        
        return f"ip:{self._get_client_ip()}"
    
    def _classify_endpoint(self) -> str:
        """Classify endpoint type for rate limiting multipliers."""
        path = request.path.lower()
        method = request.method.upper()
        
        # Admin endpoints
        if '/admin/' in path:
            return 'admin'
        
        # Auth endpoints
        if '/auth/' in path or path.endswith('/login') or path.endswith('/register'):
            return 'auth'
        
        # Search endpoints
        if '/search' in path or 'search' in request.args:
            return 'search'
        
        # Upload endpoints
        if method in ['POST', 'PUT', 'PATCH'] and ('upload' in path or 'file' in path):
            return 'upload'
        
        # Export endpoints
        if '/export' in path or 'export' in request.args:
            return 'export'
        
        return 'public'
    
    def _check_token_bucket_limit(self, client_key: str, rate_tier: str, endpoint_type: str) -> Tuple[bool, Dict[str, Any]]:
        """Check token bucket rate limit with Redis backend."""
        if not self.redis_client:
            # If Redis is unavailable, allow all requests
            return True, self._create_fallback_rate_info(rate_tier)
        
        try:
            config = self.RATE_LIMIT_CONFIGS.get(rate_tier, self.RATE_LIMIT_CONFIGS['anonymous'])
            multiplier = self.ENDPOINT_MULTIPLIERS.get(endpoint_type, 1.0)
            
            # Adjust limits based on endpoint type
            minute_limit = int(config['requests_per_minute'] * multiplier)
            hour_limit = int(config['requests_per_hour'] * multiplier)
            burst_allowance = int(config['burst_allowance'] * multiplier)
            
            # Token bucket keys
            minute_key = f"rate_limit_v5:minute:{client_key}"
            hour_key = f"rate_limit_v5:hour:{client_key}"
            burst_key = f"rate_limit_v5:burst:{client_key}"
            
            now = time.time()
            current_minute = int(now // 60)
            current_hour = int(now // 3600)
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Check and update minute bucket
            minute_bucket_key = f"{minute_key}:{current_minute}"
            pipe.incr(minute_bucket_key)
            pipe.expire(minute_bucket_key, 60)
            
            # Check and update hour bucket
            hour_bucket_key = f"{hour_key}:{current_hour}"
            pipe.incr(hour_bucket_key)
            pipe.expire(hour_bucket_key, 3600)
            
            # Check burst bucket (sliding window)
            pipe.get(burst_key)
            
            results = pipe.execute()
            minute_count = results[0]
            hour_count = results[2]
            burst_data = results[4]
            
            # Parse burst bucket data
            burst_requests = []
            if burst_data:
                try:
                    burst_requests = json.loads(burst_data)
                except (json.JSONDecodeError, TypeError):
                    burst_requests = []
            
            # Clean old burst entries (older than sliding window)
            sliding_window_seconds = config['sliding_window_minutes'] * 60
            cutoff_time = now - sliding_window_seconds
            burst_requests = [req_time for req_time in burst_requests if req_time > cutoff_time]
            
            # Check limits
            if minute_count > minute_limit:
                return False, self._create_rate_limit_info(
                    'minute', minute_limit, minute_count, 60 - (now % 60), config
                )
            
            if hour_count > hour_limit:
                return False, self._create_rate_limit_info(
                    'hour', hour_limit, hour_count, 3600 - (now % 3600), config
                )
            
            if len(burst_requests) >= burst_allowance:
                return False, self._create_rate_limit_info(
                    'burst', burst_allowance, len(burst_requests), 
                    sliding_window_seconds - (now - min(burst_requests)), config
                )
            
            # Update burst bucket
            burst_requests.append(now)
            self.redis_client.setex(
                burst_key, 
                sliding_window_seconds, 
                json.dumps(burst_requests)
            )
            
            # Request allowed
            return True, {
                'allowed': True,
                'tier': rate_tier,
                'endpoint_type': endpoint_type,
                'limits': {
                    'minute': {'limit': minute_limit, 'remaining': minute_limit - minute_count},
                    'hour': {'limit': hour_limit, 'remaining': hour_limit - hour_count},
                    'burst': {'limit': burst_allowance, 'remaining': burst_allowance - len(burst_requests)},
                },
                'reset_times': {
                    'minute': int(now + (60 - (now % 60))),
                    'hour': int(now + (3600 - (now % 3600))),
                    'burst': int(now + sliding_window_seconds)
                }
            }
            
        except Exception as e:
            logger.error(f"Token bucket rate limit check error: {e}")
            return True, self._create_fallback_rate_info(rate_tier)
    
    def _create_rate_limit_info(self, limit_type: str, limit: int, current: int, reset_seconds: float, config: Dict) -> Dict[str, Any]:
        """Create rate limit info for exceeded limits."""
        return {
            'allowed': False,
            'limit_type': limit_type,
            'limit': limit,
            'current': current,
            'reset_in': int(reset_seconds),
            'retry_after': int(reset_seconds),
            'config': config
        }
    
    def _create_fallback_rate_info(self, rate_tier: str) -> Dict[str, Any]:
        """Create fallback rate info when Redis is unavailable."""
        config = self.RATE_LIMIT_CONFIGS.get(rate_tier, self.RATE_LIMIT_CONFIGS['anonymous'])
        return {
            'allowed': True,
            'tier': rate_tier,
            'fallback_mode': True,
            'limits': config
        }
    
    def _create_rate_limit_response(self, rate_info: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
        """Create HTTP response for rate limit exceeded."""
        response_data = {
            'error': 'Rate limit exceeded',
            'code': 'RATE_LIMIT_EXCEEDED',
            'message': f'Too many requests for {rate_info.get("limit_type", "unknown")} window',
            'rate_limit': {
                'limit': rate_info.get('limit'),
                'current': rate_info.get('current'),
                'reset_in': rate_info.get('reset_in'),
                'retry_after': rate_info.get('retry_after')
            },
            'correlation_id': getattr(g, 'correlation_id', None)
        }
        
        response = jsonify(response_data)
        
        # Add rate limit headers
        response.headers['X-RateLimit-Limit'] = str(rate_info.get('limit', 0))
        response.headers['X-RateLimit-Remaining'] = '0'
        response.headers['X-RateLimit-Reset'] = str(int(time.time() + rate_info.get('reset_in', 60)))
        response.headers['Retry-After'] = str(rate_info.get('retry_after', 60))
        
        return response, 429
    
    def _get_client_ip(self) -> str:
        """Get client IP address."""
        # Check X-Forwarded-For header
        xff = request.headers.get('X-Forwarded-For')
        if xff:
            return xff.split(',')[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.remote_addr or 'unknown'
    
    def check_rate_limit(self, request, rate_tier: str = 'standard') -> Dict[str, Any]:
        """Check rate limit for a request (for BlueprintFactoryV5 compatibility)."""
        try:
            if not self._should_apply_v5_rate_limiting():
                return {'allowed': True, 'retry_after': 0}
            
            client_key = self._get_client_key()
            endpoint_type = self._classify_endpoint()
            
            allowed, rate_info = self._check_token_bucket_limit(
                client_key, rate_tier, endpoint_type
            )
            
            if not allowed:
                return {
                    'allowed': False,
                    'retry_after': rate_info.get('retry_after', 60),
                    'rate_info': rate_info
                }
            
            return {'allowed': True, 'retry_after': 0, 'rate_info': rate_info}
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            # Fail open - allow request if rate limiting fails
            return {'allowed': True, 'retry_after': 0}


def register_rate_limit_v5_middleware(app) -> None:
    """Register v5 rate limiting middleware with Flask app."""
    rate_limit_middleware = RateLimitV5Middleware(app)
    logger.info("V5 rate limiting middleware registered successfully")


def add_rate_limit_headers_v5(response, rate_info: Optional[Dict[str, Any]] = None):
    """Add rate limit headers to response."""
    if not rate_info:
        rate_info = getattr(g, 'rate_limit_info', {})
    
    if not rate_info.get('allowed', True):
        return
    
    limits = rate_info.get('limits', {})
    reset_times = rate_info.get('reset_times', {})
    
    # Add minute limit headers
    minute_limit = limits.get('minute', {})
    if minute_limit:
        response.headers['X-RateLimit-Limit-Minute'] = str(minute_limit.get('limit', 0))
        response.headers['X-RateLimit-Remaining-Minute'] = str(minute_limit.get('remaining', 0))
    
    # Add hour limit headers
    hour_limit = limits.get('hour', {})
    if hour_limit:
        response.headers['X-RateLimit-Limit-Hour'] = str(hour_limit.get('limit', 0))
        response.headers['X-RateLimit-Remaining-Hour'] = str(hour_limit.get('remaining', 0))
    
    # Add reset times
    if reset_times.get('minute'):
        response.headers['X-RateLimit-Reset-Minute'] = str(reset_times['minute'])
    if reset_times.get('hour'):
        response.headers['X-RateLimit-Reset-Hour'] = str(reset_times['hour'])
    
    # Add tier info
    response.headers['X-RateLimit-Tier'] = rate_info.get('tier', 'unknown')


# Enhanced decorators for v5 rate limiting
def rate_limit_v5(tier_override: str = None, endpoint_type_override: str = None):
    """Enhanced rate limiting decorator for v5 API."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Rate limiting is handled by middleware, just add headers to response
            result = f(*args, **kwargs)
            
            # Add rate limit headers if result is a Flask response
            if hasattr(result, 'headers'):
                add_rate_limit_headers_v5(result)
            
            return result
        return decorated_function
    return decorator


def get_rate_limit_stats_v5() -> Dict[str, Any]:
    """Get rate limiting statistics for v5."""
    try:
        from cache.redis_manager_v5 import RedisManagerV5
        redis_manager = RedisManagerV5()
        redis_client = redis_manager.get_client()
        
        # Get Redis info
        redis_info = redis_client.info()
        
        return {
            'redis_connected': True,
            'redis_memory_usage': redis_info.get('used_memory_human', 'unknown'),
            'redis_keyspace_hits': redis_info.get('keyspace_hits', 0),
            'redis_keyspace_misses': redis_info.get('keyspace_misses', 0),
            'rate_limit_configs': RateLimitV5Middleware.RATE_LIMIT_CONFIGS,
            'endpoint_multipliers': RateLimitV5Middleware.ENDPOINT_MULTIPLIERS
        }
    except Exception as e:
        return {
            'redis_connected': False,
            'error': str(e),
            'rate_limit_configs': RateLimitV5Middleware.RATE_LIMIT_CONFIGS,
            'endpoint_multipliers': RateLimitV5Middleware.ENDPOINT_MULTIPLIERS
        }