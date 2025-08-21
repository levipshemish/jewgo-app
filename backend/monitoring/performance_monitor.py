"""
Performance Monitor for JewGo Backend
====================================

This module provides comprehensive performance monitoring for the JewGo backend,
with specific focus on distance filtering and "open now" filtering performance.

Features:
- Query execution time tracking
- Distance filtering performance metrics
- Open now filtering performance metrics
- Database query optimization monitoring
- Cache hit/miss ratio tracking
- Performance alerting

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import time
import logging
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict, deque
import threading

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Individual performance metric."""
    operation: str
    duration_ms: float
    timestamp: datetime
    success: bool
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class DistanceFilteringMetrics:
    """Metrics specific to distance filtering."""
    total_queries: int
    avg_query_time_ms: float
    max_query_time_ms: float
    min_query_time_ms: float
    cache_hit_ratio: float
    avg_distance_miles: float
    max_distance_miles: float
    restaurants_returned: int


@dataclass
class OpenNowFilteringMetrics:
    """Metrics specific to open now filtering."""
    total_queries: int
    avg_query_time_ms: float
    max_query_time_ms: float
    min_query_time_ms: float
    open_restaurants_ratio: float
    timezone_errors: int
    parsing_errors: int


class PerformanceMonitor:
    """Main performance monitoring class."""
    
    def __init__(self, max_metrics: int = 10000):
        """Initialize the performance monitor."""
        self.max_metrics = max_metrics
        self.metrics: deque = deque(maxlen=max_metrics)
        self.distance_metrics: deque = deque(maxlen=max_metrics)
        self.open_now_metrics: deque = deque(maxlen=max_metrics)
        self.cache_stats = defaultdict(int)
        self.lock = threading.Lock()
        
        # Performance thresholds
        self.distance_query_threshold_ms = 1000  # 1 second
        self.open_now_query_threshold_ms = 500   # 500ms
        self.cache_hit_threshold = 0.8  # 80%
    
    def record_metric(
        self, 
        operation: str, 
        duration_ms: float, 
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Record a performance metric."""
        metric = PerformanceMetric(
            operation=operation,
            duration_ms=duration_ms,
            timestamp=datetime.now(),
            success=success,
            error_message=error_message,
            metadata=metadata
        )
        
        with self.lock:
            self.metrics.append(metric)
            
            # Check for performance alerts
            self._check_performance_alerts(metric)
    
    def record_distance_filtering(
        self,
        duration_ms: float,
        success: bool,
        distance_miles: float,
        restaurants_count: int,
        cache_hit: bool = False,
        error_message: Optional[str] = None
    ):
        """Record distance filtering specific metrics."""
        metadata = {
            'distance_miles': distance_miles,
            'restaurants_count': restaurants_count,
            'cache_hit': cache_hit
        }
        
        self.record_metric(
            operation='distance_filtering',
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            metadata=metadata
        )
        
        # Store detailed distance metrics
        distance_metric = {
            'duration_ms': duration_ms,
            'success': success,
            'distance_miles': distance_miles,
            'restaurants_count': restaurants_count,
            'cache_hit': cache_hit,
            'timestamp': datetime.now(),
            'error_message': error_message
        }
        
        with self.lock:
            self.distance_metrics.append(distance_metric)
    
    def record_open_now_filtering(
        self,
        duration_ms: float,
        success: bool,
        total_restaurants: int,
        open_restaurants: int,
        timezone_error: bool = False,
        parsing_error: bool = False,
        error_message: Optional[str] = None
    ):
        """Record open now filtering specific metrics."""
        metadata = {
            'total_restaurants': total_restaurants,
            'open_restaurants': open_restaurants,
            'timezone_error': timezone_error,
            'parsing_error': parsing_error
        }
        
        self.record_metric(
            operation='open_now_filtering',
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            metadata=metadata
        )
        
        # Store detailed open now metrics
        open_now_metric = {
            'duration_ms': duration_ms,
            'success': success,
            'total_restaurants': total_restaurants,
            'open_restaurants': open_restaurants,
            'timezone_error': timezone_error,
            'parsing_error': parsing_error,
            'timestamp': datetime.now(),
            'error_message': error_message
        }
        
        with self.lock:
            self.open_now_metrics.append(open_now_metric)
    
    def record_cache_hit(self, cache_type: str):
        """Record a cache hit."""
        with self.lock:
            self.cache_stats[f"{cache_type}_hits"] += 1
    
    def record_cache_miss(self, cache_type: str):
        """Record a cache miss."""
        with self.lock:
            self.cache_stats[f"{cache_type}_misses"] += 1
    
    def _check_performance_alerts(self, metric: PerformanceMetric):
        """Check for performance alerts and log warnings."""
        if metric.operation == 'distance_filtering' and metric.duration_ms > self.distance_query_threshold_ms:
            logger.warning(
                f"Slow distance filtering query: {metric.duration_ms:.2f}ms "
                f"(threshold: {self.distance_query_threshold_ms}ms)"
            )
        
        elif metric.operation == 'open_now_filtering' and metric.duration_ms > self.open_now_query_threshold_ms:
            logger.warning(
                f"Slow open now filtering query: {metric.duration_ms:.2f}ms "
                f"(threshold: {self.open_now_query_threshold_ms}ms)"
            )
        
        if not metric.success:
            logger.error(
                f"Performance metric failure: {metric.operation} - {metric.error_message}"
            )
    
    def get_distance_filtering_stats(self, hours: int = 24) -> DistanceFilteringMetrics:
        """Get distance filtering statistics for the specified time period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        with self.lock:
            recent_metrics = [
                m for m in self.distance_metrics 
                if m['timestamp'] >= cutoff_time
            ]
        
        if not recent_metrics:
            return DistanceFilteringMetrics(
                total_queries=0,
                avg_query_time_ms=0.0,
                max_query_time_ms=0.0,
                min_query_time_ms=0.0,
                cache_hit_ratio=0.0,
                avg_distance_miles=0.0,
                max_distance_miles=0.0,
                restaurants_returned=0
            )
        
        # Calculate statistics
        total_queries = len(recent_metrics)
        durations = [m['duration_ms'] for m in recent_metrics]
        distances = [m['distance_miles'] for m in recent_metrics if m['distance_miles']]
        restaurants_counts = [m['restaurants_count'] for m in recent_metrics]
        cache_hits = sum(1 for m in recent_metrics if m['cache_hit'])
        
        return DistanceFilteringMetrics(
            total_queries=total_queries,
            avg_query_time_ms=sum(durations) / len(durations),
            max_query_time_ms=max(durations),
            min_query_time_ms=min(durations),
            cache_hit_ratio=cache_hits / total_queries if total_queries > 0 else 0.0,
            avg_distance_miles=sum(distances) / len(distances) if distances else 0.0,
            max_distance_miles=max(distances) if distances else 0.0,
            restaurants_returned=sum(restaurants_counts) / len(restaurants_counts) if restaurants_counts else 0
        )
    
    def get_open_now_filtering_stats(self, hours: int = 24) -> OpenNowFilteringMetrics:
        """Get open now filtering statistics for the specified time period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        with self.lock:
            recent_metrics = [
                m for m in self.open_now_metrics 
                if m['timestamp'] >= cutoff_time
            ]
        
        if not recent_metrics:
            return OpenNowFilteringMetrics(
                total_queries=0,
                avg_query_time_ms=0.0,
                max_query_time_ms=0.0,
                min_query_time_ms=0.0,
                open_restaurants_ratio=0.0,
                timezone_errors=0,
                parsing_errors=0
            )
        
        # Calculate statistics
        total_queries = len(recent_metrics)
        durations = [m['duration_ms'] for m in recent_metrics]
        total_restaurants = sum(m['total_restaurants'] for m in recent_metrics)
        open_restaurants = sum(m['open_restaurants'] for m in recent_metrics)
        timezone_errors = sum(1 for m in recent_metrics if m['timezone_error'])
        parsing_errors = sum(1 for m in recent_metrics if m['parsing_error'])
        
        return OpenNowFilteringMetrics(
            total_queries=total_queries,
            avg_query_time_ms=sum(durations) / len(durations),
            max_query_time_ms=max(durations),
            min_query_time_ms=min(durations),
            open_restaurants_ratio=open_restaurants / total_restaurants if total_restaurants > 0 else 0.0,
            timezone_errors=timezone_errors,
            parsing_errors=parsing_errors
        )
    
    def get_cache_stats(self) -> Dict[str, float]:
        """Get cache hit/miss statistics."""
        with self.lock:
            stats = {}
            for cache_type in ['restaurants', 'distance', 'open_now']:
                hits = self.cache_stats.get(f"{cache_type}_hits", 0)
                misses = self.cache_stats.get(f"{cache_type}_misses", 0)
                total = hits + misses
                
                if total > 0:
                    stats[f"{cache_type}_hit_ratio"] = hits / total
                    stats[f"{cache_type}_total_requests"] = total
                else:
                    stats[f"{cache_type}_hit_ratio"] = 0.0
                    stats[f"{cache_type}_total_requests"] = 0
            
            return stats
    
    def get_overall_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get overall performance statistics."""
        distance_stats = self.get_distance_filtering_stats(hours)
        open_now_stats = self.get_open_now_filtering_stats(hours)
        cache_stats = self.get_cache_stats()
        
        return {
            'distance_filtering': asdict(distance_stats),
            'open_now_filtering': asdict(open_now_stats),
            'cache_performance': cache_stats,
            'monitoring_period_hours': hours,
            'timestamp': datetime.now().isoformat()
        }
    
    def export_metrics(self, filepath: str):
        """Export metrics to JSON file."""
        try:
            with self.lock:
                data = {
                    'metrics': list(self.metrics),
                    'distance_metrics': list(self.distance_metrics),
                    'open_now_metrics': list(self.open_now_metrics),
                    'cache_stats': dict(self.cache_stats),
                    'export_timestamp': datetime.now().isoformat()
                }
            
            with open(filepath, 'w') as f:
                json.dump(data, f, default=str, indent=2)
            
            logger.info(f"Metrics exported to {filepath}")
            
        except Exception as e:
            logger.error(f"Failed to export metrics: {e}")
    
    def clear_old_metrics(self, hours: int = 24):
        """Clear metrics older than specified hours."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        with self.lock:
            # Clear old metrics
            self.metrics = deque(
                [m for m in self.metrics if m.timestamp >= cutoff_time],
                maxlen=self.max_metrics
            )
            
            self.distance_metrics = deque(
                [m for m in self.distance_metrics if m['timestamp'] >= cutoff_time],
                maxlen=self.max_metrics
            )
            
            self.open_now_metrics = deque(
                [m for m in self.open_now_metrics if m['timestamp'] >= cutoff_time],
                maxlen=self.max_metrics
            )
        
        logger.info(f"Cleared metrics older than {hours} hours")


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


def performance_decorator(operation: str):
    """Decorator to automatically record performance metrics."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            error_message = None
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                error_message = str(e)
                raise
            finally:
                duration_ms = (time.time() - start_time) * 1000
                performance_monitor.record_metric(
                    operation=operation,
                    duration_ms=duration_ms,
                    success=success,
                    error_message=error_message
                )
        
        return wrapper
    return decorator
