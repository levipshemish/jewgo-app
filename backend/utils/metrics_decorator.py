"""
Performance metrics decorator for API endpoints.
Automatically records API call metrics.
"""

import time
from functools import wraps
from typing import Callable, Any
from flask import request, g
from utils.performance_metrics import record_api_metric
from utils.logging_config import get_logger

logger = get_logger(__name__)

def track_api_performance(endpoint_name: str = None):
    """
    Decorator to automatically track API performance metrics.
    
    Args:
        endpoint_name: Custom endpoint name (defaults to function name)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Determine endpoint name
            name = endpoint_name or func.__name__
            method = request.method
            
            # Record start time
            start_time = time.time()
            
            try:
                # Execute the function
                result = func(*args, **kwargs)
                
                # Calculate response time
                response_time_ms = (time.time() - start_time) * 1000
                
                # Extract status code from Flask response
                status_code = 200
                if hasattr(result, 'status_code'):
                    status_code = result.status_code
                elif hasattr(result, 'get_json'):
                    # Try to extract status from JSON response
                    try:
                        json_data = result.get_json()
                        if isinstance(json_data, dict) and 'success' in json_data:
                            status_code = 200 if json_data['success'] else 500
                    except:
                        pass
                
                # Check if this was a cache hit
                cache_hit = getattr(g, 'cache_hit', False)
                
                # Record the metric
                record_api_metric(
                    endpoint=name,
                    method=method,
                    response_time_ms=response_time_ms,
                    status_code=status_code,
                    user_id=getattr(g, 'user_id', None),
                    cache_hit=cache_hit
                )
                
                return result
                
            except Exception as e:
                # Calculate response time even for errors
                response_time_ms = (time.time() - start_time) * 1000
                
                # Record error metric
                record_api_metric(
                    endpoint=name,
                    method=method,
                    response_time_ms=response_time_ms,
                    status_code=500,
                    user_id=getattr(g, 'user_id', None),
                    cache_hit=False,
                    error_message=str(e)
                )
                
                # Re-raise the exception
                raise
                
        return wrapper
    return decorator
