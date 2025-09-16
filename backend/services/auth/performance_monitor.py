"""
Performance monitoring for authentication operations.

This module provides comprehensive performance monitoring and metrics
for authentication system operations.
"""

import time
import functools
from typing import Dict, Any
from collections import defaultdict, deque
from utils.logging_config import get_logger

logger = get_logger(__name__)


class AuthPerformanceMonitor:
    """Performance monitoring for authentication operations."""
    
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.metrics = defaultdict(lambda: {
            'count': 0,
            'total_time': 0.0,
            'min_time': float('inf'),
            'max_time': 0.0,
            'errors': 0,
            'recent_times': deque(maxlen=100)  # Keep last 100 measurements
        })
        
        # Performance thresholds (in seconds)
        self.thresholds = {
            'login': 0.5,      # 500ms
            'register': 1.0,   # 1 second
            'token_generation': 0.1,  # 100ms
            'token_validation': 0.05,  # 50ms
            'password_hash': 0.3,     # 300ms
            'role_query': 0.1,        # 100ms
            'cache_hit': 0.01,        # 10ms
            'cache_miss': 0.1         # 100ms
        }
        
        logger.info("AuthPerformanceMonitor initialized")
    
    def timed_operation(self, operation_name: str):
        """Decorator to time authentication operations."""
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.perf_counter()
                success = True
                error = None
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = False
                    error = str(e)
                    raise
                finally:
                    end_time = time.perf_counter()
                    duration = end_time - start_time
                    
                    self.record_metric(operation_name, duration, success, error)
                    
            return wrapper
        return decorator
    
    def record_metric(self, operation: str, duration: float, success: bool = True, error: str = None):
        """Record a performance metric."""
        try:
            metric = self.metrics[operation]
            metric['count'] += 1
            metric['total_time'] += duration
            metric['min_time'] = min(metric['min_time'], duration)
            metric['max_time'] = max(metric['max_time'], metric['max_time'])
            metric['recent_times'].append(duration)
            
            if not success:
                metric['errors'] += 1
            
            # Check if operation exceeded threshold
            threshold = self.thresholds.get(operation, 1.0)
            if duration > threshold:
                logger.warning(f"Slow {operation} operation: {duration:.3f}s (threshold: {threshold}s)")
            
            # Log performance metrics periodically
            if metric['count'] % 100 == 0:
                self._log_performance_summary(operation, metric)
                
        except Exception as e:
            logger.error(f"Failed to record metric for {operation}: {e}")
    
    def _log_performance_summary(self, operation: str, metric: Dict[str, Any]):
        """Log performance summary for an operation."""
        try:
            avg_time = metric['total_time'] / metric['count']
            error_rate = (metric['errors'] / metric['count']) * 100
            
            # Calculate percentiles from recent times
            recent_times = sorted(metric['recent_times'])
            p50 = recent_times[len(recent_times) // 2] if recent_times else 0
            p95 = recent_times[int(len(recent_times) * 0.95)] if recent_times else 0
            p99 = recent_times[int(len(recent_times) * 0.99)] if recent_times else 0
            
            logger.info(f"Performance summary for {operation}: "
                       f"count={metric['count']}, "
                       f"avg={avg_time:.3f}s, "
                       f"min={metric['min_time']:.3f}s, "
                       f"max={metric['max_time']:.3f}s, "
                       f"p50={p50:.3f}s, "
                       f"p95={p95:.3f}s, "
                       f"p99={p99:.3f}s, "
                       f"errors={metric['errors']} ({error_rate:.1f}%)")
                       
        except Exception as e:
            logger.error(f"Failed to log performance summary: {e}")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics."""
        try:
            result = {}
            
            for operation, metric in self.metrics.items():
                if metric['count'] > 0:
                    avg_time = metric['total_time'] / metric['count']
                    error_rate = (metric['errors'] / metric['count']) * 100
                    
                    # Calculate percentiles
                    recent_times = sorted(metric['recent_times'])
                    p50 = recent_times[len(recent_times) // 2] if recent_times else 0
                    p95 = recent_times[int(len(recent_times) * 0.95)] if recent_times else 0
                    p99 = recent_times[int(len(recent_times) * 0.99)] if recent_times else 0
                    
                    result[operation] = {
                        'count': metric['count'],
                        'avg_time_ms': round(avg_time * 1000, 2),
                        'min_time_ms': round(metric['min_time'] * 1000, 2),
                        'max_time_ms': round(metric['max_time'] * 1000, 2),
                        'p50_ms': round(p50 * 1000, 2),
                        'p95_ms': round(p95 * 1000, 2),
                        'p99_ms': round(p99 * 1000, 2),
                        'error_count': metric['errors'],
                        'error_rate_percent': round(error_rate, 2),
                        'threshold_ms': round(self.thresholds.get(operation, 1.0) * 1000, 2)
                    }
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return {'error': str(e)}
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status based on performance metrics."""
        try:
            health_status = {
                'overall_status': 'healthy',
                'issues': [],
                'recommendations': []
            }
            
            for operation, metric in self.metrics.items():
                if metric['count'] > 0:
                    avg_time = metric['total_time'] / metric['count']
                    error_rate = (metric['errors'] / metric['count']) * 100
                    threshold = self.thresholds.get(operation, 1.0)
                    
                    # Check for performance issues
                    if avg_time > threshold:
                        health_status['issues'].append(
                            f"{operation} average time ({avg_time:.3f}s) exceeds threshold ({threshold}s)"
                        )
                        health_status['recommendations'].append(
                            f"Consider optimizing {operation} operation"
                        )
                    
                    # Check for high error rates
                    if error_rate > 5.0:  # 5% error rate threshold
                        health_status['issues'].append(
                            f"{operation} has high error rate ({error_rate:.1f}%)"
                        )
                        health_status['recommendations'].append(
                            f"Investigate {operation} error causes"
                        )
            
            if health_status['issues']:
                health_status['overall_status'] = 'degraded'
            
            return health_status
            
        except Exception as e:
            logger.error(f"Failed to get health status: {e}")
            return {'error': str(e)}
    
    def reset_metrics(self):
        """Reset all performance metrics."""
        try:
            self.metrics.clear()
            logger.info("Performance metrics reset")
        except Exception as e:
            logger.error(f"Failed to reset metrics: {e}")
    
    def export_metrics_to_redis(self, key_prefix: str = "auth_perf"):
        """Export metrics to Redis for external monitoring."""
        if not self.redis:
            return
        
        try:
            metrics = self.get_metrics()
            health = self.get_health_status()
            
            # Store metrics with timestamp
            timestamp = int(time.time())
            
            self.redis.hset(f"{key_prefix}:metrics", mapping={
                'timestamp': timestamp,
                'data': str(metrics),
                'health_status': health['overall_status']
            })
            
            # Set expiration (1 hour)
            self.redis.expire(f"{key_prefix}:metrics", 3600)
            
            logger.debug("Metrics exported to Redis")
            
        except Exception as e:
            logger.error(f"Failed to export metrics to Redis: {e}")


# Global performance monitor instance
_performance_monitor = None


def get_performance_monitor(redis_client=None) -> AuthPerformanceMonitor:
    """Get global performance monitor instance."""
    global _performance_monitor
    
    if _performance_monitor is None:
        _performance_monitor = AuthPerformanceMonitor(redis_client)
    
    return _performance_monitor


def timed_auth_operation(operation_name: str):
    """Decorator for timing authentication operations."""
    monitor = get_performance_monitor()
    return monitor.timed_operation(operation_name)
