"""
Idempotency middleware for v5 API request deduplication.

Provides idempotency key handling for POST/PUT/DELETE operations using Redis,
automatic response replay for duplicate requests, TTL-based cleanup, and
integration with existing Redis cache service patterns.
"""

from __future__ import annotations

import json
import hashlib
import time
from typing import Optional, Dict, Any, Tuple
from functools import wraps

from flask import request, jsonify, g, make_response

from backend.utils.logging_config import get_logger

logger = get_logger(__name__)


class IdempotencyV5Middleware:
    """Idempotency middleware for request deduplication using Redis."""
    
    # Default TTL for idempotency records (24 hours)
    DEFAULT_TTL_SECONDS = 24 * 60 * 60
    
    # Methods that support idempotency
    IDEMPOTENT_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
    
    # Headers to exclude from request fingerprinting
    EXCLUDED_HEADERS = {
        'authorization', 'cookie', 'user-agent', 'accept-encoding',
        'connection', 'host', 'content-length', 'date', 'x-forwarded-for',
        'x-real-ip', 'x-correlation-id', 'x-request-id'
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
        """Initialize Redis connection for idempotency storage."""
        try:
            from backend.cache.redis_manager_v5 import get_redis_manager_v5
            redis_manager = get_redis_manager_v5()
            self.redis_client = redis_manager.get_client()
            
            if self.redis_client:
                # Test connection
                self.redis_client.ping()
                logger.info("Idempotency v5 middleware initialized with Redis v5")
            else:
                logger.warning("Redis not available for idempotency middleware")
        except Exception as e:
            logger.warning(f"Idempotency v5 middleware will operate without Redis: {e}")
            self.redis_client = None
    
    def _register_middleware(self):
        """Register before/after request hooks for idempotency."""
        
        @self.app.before_request
        def _v5_idempotency_check():
            """Check for duplicate requests using idempotency keys."""
            # Skip if not applicable
            if not self._should_apply_idempotency():
                return
            
            try:
                idempotency_key = self._get_idempotency_key()
                if not idempotency_key:
                    # No idempotency key provided, continue normally
                    return
                
                # Check for existing request
                existing_response = self._get_existing_response(idempotency_key)
                if existing_response:
                    logger.debug(f"Replaying idempotent response for key: {self._mask_key(idempotency_key)}")
                    return self._replay_response(existing_response)
                
                # Store request info for later storage
                g.idempotency_key = idempotency_key
                g.idempotency_fingerprint = self._generate_request_fingerprint()
                
            except Exception as e:
                logger.error(f"Idempotency v5 check error: {e}")
                # Continue on error to avoid blocking requests
        
        @self.app.after_request
        def _v5_idempotency_store(response):
            """Store response for idempotency replay."""
            try:
                if hasattr(g, 'idempotency_key') and self.redis_client:
                    self._store_response(g.idempotency_key, response)
            except Exception as e:
                logger.error(f"Idempotency v5 storage error: {e}")
            
            return response
    
    def _should_apply_idempotency(self) -> bool:
        """Determine if idempotency should be applied to current request."""
        # Only apply to supported HTTP methods
        if request.method not in self.IDEMPOTENT_METHODS:
            return False
        
        # Apply to v5 endpoints
        if request.path.startswith('/api/v5/'):
            return True
        
        # Apply to endpoints with v5 feature flag enabled
        try:
            from backend.utils.feature_flags_v5 import FeatureFlagsV5
            feature_flags = FeatureFlagsV5()
            return feature_flags.is_enabled('idempotency_v5_for_legacy', default=False)
        except ImportError:
            return False
    
    def _get_idempotency_key(self) -> Optional[str]:
        """Get idempotency key from request headers."""
        # Check standard idempotency header
        key = request.headers.get('Idempotency-Key')
        if key:
            return key.strip()
        
        # Check alternative headers
        key = request.headers.get('X-Idempotency-Key')
        if key:
            return key.strip()
        
        return None
    
    def _generate_request_fingerprint(self) -> str:
        """Generate request fingerprint for duplicate detection."""
        fingerprint_data = {
            'method': request.method,
            'path': request.path,
            'query': sorted(request.args.items()),
            'headers': self._get_relevant_headers(),
            'user_id': getattr(g, 'user_id', None),
        }
        
        # Include body for non-GET requests
        if request.method != 'GET' and request.is_json:
            try:
                fingerprint_data['body'] = request.get_json(silent=True)
            except Exception:
                # If we can't parse JSON, include raw data hash
                if request.data:
                    fingerprint_data['body_hash'] = hashlib.sha256(request.data).hexdigest()
        
        # Create deterministic hash
        fingerprint_json = json.dumps(fingerprint_data, sort_keys=True, default=str)
        return hashlib.sha256(fingerprint_json.encode('utf-8')).hexdigest()
    
    def _get_relevant_headers(self) -> Dict[str, str]:
        """Get headers relevant for request fingerprinting."""
        relevant_headers = {}
        
        for header_name, header_value in request.headers:
            header_lower = header_name.lower()
            
            # Skip excluded headers
            if header_lower in self.EXCLUDED_HEADERS:
                continue
            
            # Include content-type and other relevant headers
            if header_lower.startswith('content-') or header_lower.startswith('accept'):
                relevant_headers[header_lower] = header_value
        
        return relevant_headers
    
    def _get_existing_response(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        """Get existing response for idempotency key."""
        if not self.redis_client:
            return None
        
        try:
            request_fingerprint = self._generate_request_fingerprint()
            redis_key = f"idempotency_v5:{idempotency_key}:{request_fingerprint}"
            
            cached_data = self.redis_client.get(redis_key)
            if cached_data:
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving idempotent response: {e}")
            return None
    
    def _replay_response(self, cached_response: Dict[str, Any]) -> Any:
        """Replay cached response for idempotent request."""
        try:
            response_data = cached_response.get('data')
            status_code = cached_response.get('status_code', 200)
            headers = cached_response.get('headers', {})
            
            # Create response
            response = make_response(response_data, status_code)
            
            # Add cached headers (excluding some system headers)
            excluded_response_headers = {
                'date', 'server', 'connection', 'content-length',
                'transfer-encoding', 'set-cookie'
            }
            
            for header_name, header_value in headers.items():
                if header_name.lower() not in excluded_response_headers:
                    response.headers[header_name] = header_value
            
            # Add idempotency headers
            response.headers['X-Idempotency-Replayed'] = 'true'
            response.headers['X-Idempotency-Key'] = self._mask_key(g.get('idempotency_key', ''))
            
            return response
            
        except Exception as e:
            logger.error(f"Error replaying idempotent response: {e}")
            return None
    
    def _store_response(self, idempotency_key: str, response) -> None:
        """Store response for future idempotency replay."""
        try:
            # Only store successful responses (2xx and 3xx status codes)
            if not (200 <= response.status_code < 400):
                return
            
            request_fingerprint = g.get('idempotency_fingerprint')
            if not request_fingerprint:
                return
            
            redis_key = f"idempotency_v5:{idempotency_key}:{request_fingerprint}"
            
            # Prepare response data for caching
            cached_response = {
                'data': response.get_data(as_text=True) if hasattr(response, 'get_data') else str(response.data),
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'cached_at': time.time(),
                'correlation_id': getattr(g, 'correlation_id', None)
            }
            
            # Store with TTL
            ttl_seconds = int(__import__('os').getenv('IDEMPOTENCY_TTL_SECONDS', str(self.DEFAULT_TTL_SECONDS)))
            
            self.redis_client.setex(
                redis_key,
                ttl_seconds,
                json.dumps(cached_response, default=str)
            )
            
            logger.debug(f"Stored idempotent response for key: {self._mask_key(idempotency_key)}")
            
        except Exception as e:
            logger.error(f"Error storing idempotent response: {e}")
    
    def _mask_key(self, key: str) -> str:
        """Mask idempotency key for logging."""
        if len(key) <= 8:
            return key[:2] + '***' + key[-2:] if len(key) > 4 else '***'
        return key[:4] + '***' + key[-4:]
    
    def check_idempotency(self, request) -> Dict[str, Any]:
        """Check idempotency for a request (for BlueprintFactoryV5 compatibility)."""
        try:
            if not self._should_apply_idempotency():
                return {'is_duplicate': False}
            
            idempotency_key = self._get_idempotency_key()
            if not idempotency_key:
                return {'is_duplicate': False}
            
            # Check if we have a cached response
            cached_response = self._get_existing_response(idempotency_key)
            if cached_response:
                return {
                    'is_duplicate': True,
                    'response': cached_response['data'],
                    'status_code': cached_response['status_code']
                }
            
            return {'is_duplicate': False}
            
        except Exception as e:
            logger.error(f"Idempotency check error: {e}")
            # Fail open - allow request if idempotency check fails
            return {'is_duplicate': False}


def register_idempotency_v5_middleware(app) -> None:
    """Register v5 idempotency middleware with Flask app."""
    idempotency_middleware = IdempotencyV5Middleware(app)
    logger.info("V5 idempotency middleware registered successfully")


def require_idempotency_key_v5(f):
    """Decorator to require idempotency key for endpoint."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.headers.get('Idempotency-Key') and not request.headers.get('X-Idempotency-Key'):
            return jsonify({
                'error': 'Idempotency key required',
                'code': 'IDEMPOTENCY_KEY_REQUIRED',
                'message': 'This endpoint requires an Idempotency-Key header',
                'correlation_id': getattr(g, 'correlation_id', None)
            }), 400
        
        return f(*args, **kwargs)
    
    return decorated_function


def optional_idempotency_v5(f):
    """Decorator to enable optional idempotency for endpoint."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Idempotency is handled by middleware, just proceed
        result = f(*args, **kwargs)
        
        # Add idempotency headers to response if applicable
        if hasattr(result, 'headers') and hasattr(g, 'idempotency_key'):
            # Create a temporary instance just for the mask_key method
            temp_middleware = IdempotencyV5Middleware()
            result.headers['X-Idempotency-Key'] = temp_middleware._mask_key(g.idempotency_key)
            result.headers['X-Idempotency-Replayed'] = 'false'
        
        return result
    
    return decorated_function


def get_idempotency_stats_v5() -> Dict[str, Any]:
    """Get idempotency middleware statistics."""
    try:
        from backend.cache.redis_manager_v5 import get_redis_manager_v5
        redis_manager = get_redis_manager_v5()
        redis_client = redis_manager.get_client()
        
        if not redis_client:
            return {'redis_connected': False, 'error': 'Redis not available'}
        
        # Get idempotency key count
        key_pattern = "idempotency_v5:*"
        key_count = len(redis_client.keys(key_pattern))
        
        # Get Redis memory info
        redis_info = redis_client.info()
        
        return {
            'redis_connected': True,
            'active_idempotency_keys': key_count,
            'redis_memory_usage': redis_info.get('used_memory_human', 'unknown'),
            'default_ttl_seconds': IdempotencyV5Middleware.DEFAULT_TTL_SECONDS,
            'supported_methods': list(IdempotencyV5Middleware.IDEMPOTENT_METHODS)
        }
        
    except Exception as e:
        return {
            'redis_connected': False,
            'error': str(e),
            'default_ttl_seconds': IdempotencyV5Middleware.DEFAULT_TTL_SECONDS,
            'supported_methods': list(IdempotencyV5Middleware.IDEMPOTENT_METHODS)
        }