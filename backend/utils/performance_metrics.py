"""
Performance metrics collection and monitoring utilities for the JewGo backend.
"""

import time
import psutil
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
from utils.logging_config import get_logger

logger = get_logger(__name__)

@dataclass
class APIMetric:
    """API performance metric."""
    endpoint: str
    method: str
    response_time_ms: float
    status_code: int
    timestamp: datetime
    user_id: Optional[str] = None
    cache_hit: bool = False
    error_message: Optional[str] = None

@dataclass
class DatabaseMetric:
    """Database performance metric."""
    query_type: str
    execution_time_ms: float
    rows_affected: int
    timestamp: datetime
    query_hash: Optional[str] = None
    error_message: Optional[str] = None

@dataclass
class SystemMetric:
    """System performance metric."""
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_usage_percent: float
    timestamp: datetime

class PerformanceCollector:
    """Collects and stores performance metrics."""
    
    def __init__(self, max_metrics: int = 10000):
        self.max_metrics = max_metrics
        self.api_metrics = deque(maxlen=max_metrics)
        self.db_metrics = deque(maxlen=max_metrics)
        self.system_metrics = deque(maxlen=1000)  # Less frequent system metrics
        self.lock = threading.Lock()
        self._monitoring_active = False
        self._monitor_thread = None
        
        # Start system metrics collection
        self._start_system_monitoring()
    
    def record_api_call(
        self,
        endpoint: str,
        method: str,
        response_time_ms: float,
        status_code: int,
        user_id: Optional[str] = None,
        cache_hit: bool = False,
        error_message: Optional[str] = None
    ):
        """Record an API call metric."""
        metric = APIMetric(
            endpoint=endpoint,
            method=method,
            response_time_ms=response_time_ms,
            status_code=status_code,
            timestamp=datetime.now(),
            user_id=user_id,
            cache_hit=cache_hit,
            error_message=error_message
        )
        
        with self.lock:
            self.api_metrics.append(metric)
    
    def record_db_query(
        self,
        query_type: str,
        execution_time_ms: float,
        rows_affected: int = 0,
        query_hash: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Record a database query metric."""
        metric = DatabaseMetric(
            query_type=query_type,
            execution_time_ms=execution_time_ms,
            rows_affected=rows_affected,
            timestamp=datetime.now(),
            query_hash=query_hash,
            error_message=error_message
        )
        
        with self.lock:
            self.db_metrics.append(metric)
    
    def _start_system_monitoring(self):
        """Start background system monitoring."""
        self._monitoring_active = True
        
        def monitor_system():
            while self._monitoring_active:
                try:
                    # Collect system metrics
                    cpu_percent = psutil.cpu_percent(interval=1)
                    memory = psutil.virtual_memory()
                    disk = psutil.disk_usage('/')
                    
                    metric = SystemMetric(
                        cpu_percent=cpu_percent,
                        memory_percent=memory.percent,
                        memory_used_mb=memory.used / (1024 * 1024),
                        disk_usage_percent=disk.percent,
                        timestamp=datetime.now()
                    )
                    
                    with self.lock:
                        self.system_metrics.append(metric)
                    
                    # Sleep for 30 seconds, but check for stop signal
                    for _ in range(30):
                        if not self._monitoring_active:
                            break
                        time.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error collecting system metrics: {e}")
                    # Wait longer on error, but still check for stop signal
                    for _ in range(60):
                        if not self._monitoring_active:
                            break
                        time.sleep(1)
        
        # Start monitoring thread
        self._monitor_thread = threading.Thread(target=monitor_system, daemon=True)
        self._monitor_thread.start()
    
    def get_api_stats(self, time_window_minutes: int = 60) -> Dict[str, Any]:
        """Get API performance statistics for the last N minutes."""
        cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
        
        with self.lock:
            recent_metrics = [
                m for m in self.api_metrics 
                if m.timestamp >= cutoff_time
            ]
        
        if not recent_metrics:
            return {
                'total_calls': 0,
                'avg_response_time_ms': 0,
                'p95_response_time_ms': 0,
                'p99_response_time_ms': 0,
                'error_rate': 0,
                'cache_hit_rate': 0,
                'endpoints': {}
            }
        
        # Calculate overall stats
        response_times = [m.response_time_ms for m in recent_metrics]
        response_times.sort()
        
        total_calls = len(recent_metrics)
        avg_response_time = sum(response_times) / total_calls
        p95_response_time = response_times[int(0.95 * total_calls)] if total_calls > 0 else 0
        p99_response_time = response_times[int(0.99 * total_calls)] if total_calls > 0 else 0
        
        error_count = sum(1 for m in recent_metrics if m.status_code >= 400)
        error_rate = (error_count / total_calls) * 100 if total_calls > 0 else 0
        
        cache_hit_count = sum(1 for m in recent_metrics if m.cache_hit)
        cache_hit_rate = (cache_hit_count / total_calls) * 100 if total_calls > 0 else 0
        
        # Calculate per-endpoint stats
        endpoint_stats = defaultdict(lambda: {
            'calls': 0,
            'avg_response_time_ms': 0,
            'error_count': 0,
            'cache_hits': 0
        })
        
        for metric in recent_metrics:
            endpoint_key = f"{metric.method} {metric.endpoint}"
            stats = endpoint_stats[endpoint_key]
            stats['calls'] += 1
            stats['avg_response_time_ms'] += metric.response_time_ms
            if metric.status_code >= 400:
                stats['error_count'] += 1
            if metric.cache_hit:
                stats['cache_hits'] += 1
        
        # Calculate averages for each endpoint
        for stats in endpoint_stats.values():
            if stats['calls'] > 0:
                stats['avg_response_time_ms'] /= stats['calls']
                stats['error_rate'] = (stats['error_count'] / stats['calls']) * 100
                stats['cache_hit_rate'] = (stats['cache_hits'] / stats['calls']) * 100
        
        return {
            'total_calls': total_calls,
            'avg_response_time_ms': round(avg_response_time, 2),
            'p95_response_time_ms': round(p95_response_time, 2),
            'p99_response_time_ms': round(p99_response_time, 2),
            'error_rate': round(error_rate, 2),
            'cache_hit_rate': round(cache_hit_rate, 2),
            'endpoints': dict(endpoint_stats)
        }
    
    def get_db_stats(self, time_window_minutes: int = 60) -> Dict[str, Any]:
        """Get database performance statistics for the last N minutes."""
        cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
        
        with self.lock:
            recent_metrics = [
                m for m in self.db_metrics 
                if m.timestamp >= cutoff_time
            ]
        
        if not recent_metrics:
            return {
                'total_queries': 0,
                'avg_execution_time_ms': 0,
                'p95_execution_time_ms': 0,
                'p99_execution_time_ms': 0,
                'error_rate': 0,
                'query_types': {}
            }
        
        # Calculate overall stats
        execution_times = [m.execution_time_ms for m in recent_metrics]
        execution_times.sort()
        
        total_queries = len(recent_metrics)
        avg_execution_time = sum(execution_times) / total_queries
        p95_execution_time = execution_times[int(0.95 * total_queries)] if total_queries > 0 else 0
        p99_execution_time = execution_times[int(0.99 * total_queries)] if total_queries > 0 else 0
        
        error_count = sum(1 for m in recent_metrics if m.error_message)
        error_rate = (error_count / total_queries) * 100 if total_queries > 0 else 0
        
        # Calculate per-query-type stats
        query_type_stats = defaultdict(lambda: {
            'count': 0,
            'avg_execution_time_ms': 0,
            'error_count': 0,
            'total_rows_affected': 0
        })
        
        for metric in recent_metrics:
            stats = query_type_stats[metric.query_type]
            stats['count'] += 1
            stats['avg_execution_time_ms'] += metric.execution_time_ms
            stats['total_rows_affected'] += metric.rows_affected
            if metric.error_message:
                stats['error_count'] += 1
        
        # Calculate averages for each query type
        for stats in query_type_stats.values():
            if stats['count'] > 0:
                stats['avg_execution_time_ms'] /= stats['count']
                stats['error_rate'] = (stats['error_count'] / stats['count']) * 100
        
        return {
            'total_queries': total_queries,
            'avg_execution_time_ms': round(avg_execution_time, 2),
            'p95_execution_time_ms': round(p95_execution_time, 2),
            'p99_execution_time_ms': round(p99_execution_time, 2),
            'error_rate': round(error_rate, 2),
            'query_types': dict(query_type_stats)
        }
    
    def get_system_stats(self, time_window_minutes: int = 60) -> Dict[str, Any]:
        """Get system performance statistics for the last N minutes."""
        cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
        
        with self.lock:
            recent_metrics = [
                m for m in self.system_metrics 
                if m.timestamp >= cutoff_time
            ]
        
        if not recent_metrics:
            return {
                'avg_cpu_percent': 0,
                'avg_memory_percent': 0,
                'avg_memory_used_mb': 0,
                'avg_disk_usage_percent': 0,
                'max_cpu_percent': 0,
                'max_memory_percent': 0,
                'samples': 0
            }
        
        cpu_values = [m.cpu_percent for m in recent_metrics]
        memory_percent_values = [m.memory_percent for m in recent_metrics]
        memory_mb_values = [m.memory_used_mb for m in recent_metrics]
        disk_values = [m.disk_usage_percent for m in recent_metrics]
        
        return {
            'avg_cpu_percent': round(sum(cpu_values) / len(cpu_values), 2),
            'avg_memory_percent': round(sum(memory_percent_values) / len(memory_percent_values), 2),
            'avg_memory_used_mb': round(sum(memory_mb_values) / len(memory_mb_values), 2),
            'avg_disk_usage_percent': round(sum(disk_values) / len(disk_values), 2),
            'max_cpu_percent': round(max(cpu_values), 2),
            'max_memory_percent': round(max(memory_percent_values), 2),
            'samples': len(recent_metrics)
        }
    
    def get_all_stats(self, time_window_minutes: int = 60) -> Dict[str, Any]:
        """Get all performance statistics."""
        return {
            'timestamp': datetime.now().isoformat(),
            'time_window_minutes': time_window_minutes,
            'api': self.get_api_stats(time_window_minutes),
            'database': self.get_db_stats(time_window_minutes),
            'system': self.get_system_stats(time_window_minutes)
        }
    
    def stop_monitoring(self):
        """Stop system monitoring and cleanup resources."""
        self._monitoring_active = False
        
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=5)
            if self._monitor_thread.is_alive():
                logger.warning("Performance monitoring thread did not stop gracefully")
        
        self._monitor_thread = None
        logger.info("Performance monitoring stopped")

# Global performance collector instance
performance_collector = PerformanceCollector()

def record_api_metric(
    endpoint: str,
    method: str,
    response_time_ms: float,
    status_code: int,
    user_id: Optional[str] = None,
    cache_hit: bool = False,
    error_message: Optional[str] = None
):
    """Record an API performance metric."""
    performance_collector.record_api_call(
        endpoint, method, response_time_ms, status_code,
        user_id, cache_hit, error_message
    )

def record_db_metric(
    query_type: str,
    execution_time_ms: float,
    rows_affected: int = 0,
    query_hash: Optional[str] = None,
    error_message: Optional[str] = None
):
    """Record a database performance metric."""
    performance_collector.record_db_query(
        query_type, execution_time_ms, rows_affected, query_hash, error_message
    )

def get_performance_stats(time_window_minutes: int = 60) -> Dict[str, Any]:
    """Get performance statistics."""
    return performance_collector.get_all_stats(time_window_minutes)
