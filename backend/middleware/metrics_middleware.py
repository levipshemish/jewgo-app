"""
Metrics middleware for automatic metric collection
Integrates with Flask to automatically record HTTP metrics
"""

import time
from functools import wraps
from flask import request, g
from routes.metrics import record_http_request, record_error, record_user_action

class MetricsMiddleware:
    """Middleware for automatic metrics collection"""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with Flask app"""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        app.teardown_appcontext(self.teardown_request)
    
    def before_request(self):
        """Called before each request"""
        g.start_time = time.time()
        g.request_id = f"{request.method}_{request.endpoint}_{int(g.start_time)}"
    
    def after_request(self, response):
        """Called after each request"""
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            
            # Record HTTP metrics
            record_http_request(
                method=request.method,
                endpoint=request.endpoint or 'unknown',
                status=response.status_code,
                duration=duration
            )
            
            # Record user actions for authenticated requests
            if hasattr(g, 'user_id') and g.user_id:
                action_type = self._determine_action_type(request)
                if action_type:
                    record_user_action(action_type)
            
            # Record errors
            if response.status_code >= 400:
                error_type = self._categorize_error(response.status_code)
                record_error(error_type, 'http')
        
        return response
    
    def teardown_request(self, exception):
        """Called when request is torn down"""
        if exception:
            record_error('unhandled_exception', 'http')
    
    def _determine_action_type(self, request):
        """Determine the type of user action based on request"""
        endpoint = request.endpoint or ''
        method = request.method
        
        # Map endpoints to action types
        action_mapping = {
            'auth.login': 'login',
            'auth.logout': 'logout',
            'auth.register': 'register',
            'restaurants.search': 'restaurant_search',
            'synagogues.search': 'synagogue_search',
            'restaurants.get': 'restaurant_view',
            'synagogues.get': 'synagogue_view',
            'reviews.create': 'review_create',
            'reviews.update': 'review_update',
            'favorites.add': 'favorite_add',
            'favorites.remove': 'favorite_remove'
        }
        
        return action_mapping.get(endpoint)
    
    def _categorize_error(self, status_code):
        """Categorize HTTP error codes"""
        if 400 <= status_code < 500:
            return 'client_error'
        elif 500 <= status_code < 600:
            return 'server_error'
        else:
            return 'unknown_error'

def metrics_timer(metric_name: str, labels: dict = None):
    """Decorator to time function execution and record metrics"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                record_error('function_error', metric_name)
                raise
            finally:
                duration = time.time() - start_time
                # Record custom timing metric here if needed
        return wrapper
    return decorator

def record_database_operation(operation: str, table: str):
    """Decorator to record database operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            from routes.metrics import record_database_query
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                is_slow = duration > 1.0  # Consider queries > 1s as slow
                record_database_query(operation, table, duration, is_slow)
                return result
            except Exception as e:
                from routes.metrics import record_error
                record_error('database_error', f"{operation}_{table}")
                raise
        return wrapper
    return decorator

def record_search_operation(provider: str, search_type: str):
    """Decorator to record search operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            from routes.metrics import record_search_request
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                has_results = bool(result and len(result) > 0)
                record_search_request(provider, search_type, 'success', duration, has_results)
                return result
            except Exception as e:
                from routes.metrics import record_search_request, record_error
                duration = time.time() - start_time
                record_search_request(provider, search_type, 'error', duration, False)
                record_error('search_error', f"{provider}_{search_type}")
                raise
        return wrapper
    return decorator

def record_cache_operation(operation: str):
    """Decorator to record cache operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            from routes.metrics import record_cache_operation
            try:
                result = func(*args, **kwargs)
                hit = result is not None
                record_cache_operation(operation, hit)
                return result
            except Exception as e:
                from routes.metrics import record_cache_operation, record_error
                record_cache_operation(operation, False, str(type(e).__name__))
                record_error('cache_error', operation)
                raise
        return wrapper
    return decorator
