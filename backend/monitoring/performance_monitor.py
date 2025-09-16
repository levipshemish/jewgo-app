#!/usr/bin/env python3
"""
Performance Monitor for JewGo Backend
====================================

This module provides comprehensive performance monitoring including:
- Cache performance metrics
- Database query performance
- Connection pool metrics
- System resource monitoring
- Real-time performance dashboards
- Alerting and notifications

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

import time
import threading
import psutil
from collections import deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, asdict
from functools import wraps

from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class PerformanceAlert:
    """Performance alert definition."""
    alert_id: str
    metric_name: str
    threshold: float
    operator: str  # 'gt', 'lt', 'eq', 'gte', 'lte'
    severity: str  # 'low', 'medium', 'high', 'critical'
    message: str
    triggered_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    is_active: bool = False

    def check_condition(self, value: float) -> bool:
        """Check if alert condition is met."""
        if self.operator == 'gt':
            return value > self.threshold
        elif self.operator == 'lt':
            return value < self.threshold
        elif self.operator == 'eq':
            return value == self.threshold
        elif self.operator == 'gte':
            return value >= self.threshold
        elif self.operator == 'lte':
            return value <= self.threshold
        return False


@dataclass
class SystemMetrics:
    """System resource metrics."""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_free_gb: float
    network_sent_mb: float
    network_recv_mb: float
    load_average: List[float]
    process_count: int
    thread_count: int


@dataclass
class ApplicationMetrics:
    """Application-specific metrics."""
    timestamp: datetime
    request_count: int
    response_time_avg_ms: float
    response_time_p95_ms: float
    response_time_p99_ms: float
    error_rate_percent: float
    active_connections: int
    cache_hit_rate_percent: float
    database_query_time_avg_ms: float
    slow_query_count: int


class MetricsCollector:
    """Collects and stores performance metrics."""
    
    def __init__(self, retention_hours: int = 24):
        self.retention_hours = retention_hours
        self.metrics_history = {
            'system': deque(maxlen=retention_hours * 60),  # 1 minute intervals
            'application': deque(maxlen=retention_hours * 60),
            'cache': deque(maxlen=retention_hours * 60),
            'database': deque(maxlen=retention_hours * 60)
        }
        self.current_metrics = {}
        self.lock = threading.RLock()
        
        # Network metrics tracking
        self.last_network_stats = None
        self.network_base_time = time.time()

    def collect_system_metrics(self) -> SystemMetrics:
        """Collect system resource metrics."""
        try:
            # CPU and memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Network metrics
            network = psutil.net_io_counters()
            current_time = time.time()
            
            if self.last_network_stats is None:
                self.last_network_stats = network
                self.network_base_time = current_time
                network_sent_mb = 0
                network_recv_mb = 0
            else:
                time_diff = current_time - self.network_base_time
                if time_diff > 0:
                    network_sent_mb = (network.bytes_sent - self.last_network_stats.bytes_sent) / 1024 / 1024
                    network_recv_mb = (network.bytes_recv - self.last_network_stats.bytes_recv) / 1024 / 1024
                else:
                    network_sent_mb = 0
                    network_recv_mb = 0
                
                self.last_network_stats = network
                self.network_base_time = current_time
            
            # Load average (Unix-like systems)
            try:
                load_avg = list(psutil.getloadavg())
            except AttributeError:
                load_avg = [0.0, 0.0, 0.0]
            
            # Process and thread counts
            process_count = len(psutil.pids())
            thread_count = psutil.Process().num_threads()
            
            metrics = SystemMetrics(
            timestamp=datetime.now(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / 1024 / 1024,
                memory_available_mb=memory.available / 1024 / 1024,
                disk_usage_percent=disk.percent,
                disk_free_gb=disk.free / 1024 / 1024 / 1024,
                network_sent_mb=network_sent_mb,
                network_recv_mb=network_recv_mb,
                load_average=load_avg,
                process_count=process_count,
                thread_count=thread_count
            )
            
            with self.lock:
                self.metrics_history['system'].append(metrics)
                self.current_metrics['system'] = metrics
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return None

    def collect_application_metrics(self, 
                                  request_count: int = 0,
                                  response_times: List[float] = None,
                                  error_count: int = 0,
                                  active_connections: int = 0,
                                  cache_hit_rate: float = 0.0,
                                  db_query_time: float = 0.0,
                                  slow_query_count: int = 0) -> ApplicationMetrics:
        """Collect application-specific metrics."""
        try:
            response_times = response_times or []
            
            # Calculate response time percentiles
            if response_times:
                sorted_times = sorted(response_times)
                avg_time = sum(response_times) / len(response_times)
                p95_index = int(len(sorted_times) * 0.95)
                p99_index = int(len(sorted_times) * 0.99)
                p95_time = sorted_times[p95_index] if p95_index < len(sorted_times) else sorted_times[-1]
                p99_time = sorted_times[p99_index] if p99_index < len(sorted_times) else sorted_times[-1]
            else:
                avg_time = 0.0
                p95_time = 0.0
                p99_time = 0.0
            
            # Calculate error rate
            total_requests = request_count + error_count
            error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0.0
            
            metrics = ApplicationMetrics(
                timestamp=datetime.now(),
                request_count=request_count,
                response_time_avg_ms=avg_time,
                response_time_p95_ms=p95_time,
                response_time_p99_ms=p99_time,
                error_rate_percent=error_rate,
                active_connections=active_connections,
                cache_hit_rate_percent=cache_hit_rate,
                database_query_time_avg_ms=db_query_time,
                slow_query_count=slow_query_count
            )
            
            with self.lock:
                self.metrics_history['application'].append(metrics)
                self.current_metrics['application'] = metrics
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect application metrics: {e}")
            return None

    def get_metrics_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get metrics summary for the last N hours."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        with self.lock:
            summary = {
                'system': self._summarize_system_metrics(cutoff_time),
                'application': self._summarize_application_metrics(cutoff_time),
                'cache': self._summarize_cache_metrics(cutoff_time),
                'database': self._summarize_database_metrics(cutoff_time)
            }
        
        return summary

    def _summarize_system_metrics(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Summarize system metrics."""
        recent_metrics = [m for m in self.metrics_history['system'] if m.timestamp >= cutoff_time]
        
        if not recent_metrics:
            return {'error': 'No recent system metrics'}
        
        return {
            'avg_cpu_percent': sum(m.cpu_percent for m in recent_metrics) / len(recent_metrics),
            'max_cpu_percent': max(m.cpu_percent for m in recent_metrics),
            'avg_memory_percent': sum(m.memory_percent for m in recent_metrics) / len(recent_metrics),
            'max_memory_percent': max(m.memory_percent for m in recent_metrics),
            'avg_disk_usage_percent': sum(m.disk_usage_percent for m in recent_metrics) / len(recent_metrics),
            'current_load_average': recent_metrics[-1].load_average if recent_metrics else [0, 0, 0],
            'sample_count': len(recent_metrics)
        }

    def _summarize_application_metrics(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Summarize application metrics."""
        recent_metrics = [m for m in self.metrics_history['application'] if m.timestamp >= cutoff_time]
        
        if not recent_metrics:
            return {'error': 'No recent application metrics'}
        
        return {
            'total_requests': sum(m.request_count for m in recent_metrics),
            'avg_response_time_ms': sum(m.response_time_avg_ms for m in recent_metrics) / len(recent_metrics),
            'max_response_time_ms': max(m.response_time_p99_ms for m in recent_metrics),
            'avg_error_rate_percent': sum(m.error_rate_percent for m in recent_metrics) / len(recent_metrics),
            'avg_cache_hit_rate_percent': sum(m.cache_hit_rate_percent for m in recent_metrics) / len(recent_metrics),
            'avg_db_query_time_ms': sum(m.database_query_time_avg_ms for m in recent_metrics) / len(recent_metrics),
            'total_slow_queries': sum(m.slow_query_count for m in recent_metrics),
            'sample_count': len(recent_metrics)
        }

    def _summarize_cache_metrics(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Summarize cache metrics."""
        # This would integrate with the cache manager
        return {'placeholder': 'Cache metrics integration needed'}

    def _summarize_database_metrics(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Summarize database metrics."""
        # This would integrate with the database optimizer
        return {'placeholder': 'Database metrics integration needed'}


class AlertManager:
    """Manages performance alerts and notifications."""
    
    def __init__(self):
        self.alerts = {}
        self.alert_history = deque(maxlen=1000)
        self.notification_handlers = []
        self.lock = threading.RLock()

    def add_alert(self, alert: PerformanceAlert):
        """Add a new performance alert."""
        with self.lock:
            self.alerts[alert.alert_id] = alert
            logger.info(f"Added performance alert: {alert.alert_id}")

    def remove_alert(self, alert_id: str):
        """Remove a performance alert."""
        with self.lock:
            if alert_id in self.alerts:
                del self.alerts[alert_id]
                logger.info(f"Removed performance alert: {alert_id}")

    def check_alerts(self, metrics: Dict[str, Any]):
        """Check all alerts against current metrics."""
        with self.lock:
            for alert_id, alert in self.alerts.items():
                if alert.metric_name in metrics:
                    value = metrics[alert.metric_name]
                    if alert.check_condition(value):
                        self._trigger_alert(alert, value)
                    elif alert.is_active:
                        self._resolve_alert(alert)

    def _trigger_alert(self, alert: PerformanceAlert, value: float):
        """Trigger an alert."""
        if not alert.is_active:
            alert.is_active = True
            alert.triggered_at = datetime.now()
            alert.resolved_at = None
            
            alert_event = {
                'type': 'alert_triggered',
                'alert_id': alert.alert_id,
                'metric_name': alert.metric_name,
                'threshold': alert.threshold,
                'actual_value': value,
                'severity': alert.severity,
                'message': alert.message,
                'timestamp': alert.triggered_at
            }
            
            self.alert_history.append(alert_event)
            
            # Send notifications
            self._send_notifications(alert_event)
            
            logger.warning(f"Performance alert triggered: {alert.alert_id} - {alert.message}")

    def _resolve_alert(self, alert: PerformanceAlert):
        """Resolve an alert."""
        if alert.is_active:
            alert.is_active = False
            alert.resolved_at = datetime.now()
            
            alert_event = {
                'type': 'alert_resolved',
                'alert_id': alert.alert_id,
                'metric_name': alert.metric_name,
                'severity': alert.severity,
                'message': alert.message,
                'timestamp': alert.resolved_at
            }
            
            self.alert_history.append(alert_event)
            
            # Send notifications
            self._send_notifications(alert_event)
            
            logger.info(f"Performance alert resolved: {alert.alert_id}")

    def _send_notifications(self, alert_event: Dict[str, Any]):
        """Send notifications for alert events."""
        for handler in self.notification_handlers:
            try:
                handler(alert_event)
            except Exception as e:
                logger.error(f"Notification handler failed: {e}")

    def add_notification_handler(self, handler: Callable[[Dict[str, Any]], None]):
        """Add a notification handler."""
        self.notification_handlers.append(handler)

    def get_active_alerts(self) -> List[PerformanceAlert]:
        """Get all active alerts."""
        with self.lock:
            return [alert for alert in self.alerts.values() if alert.is_active]

    def get_alert_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get alert history for the last N hours."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        with self.lock:
            return [event for event in self.alert_history if event['timestamp'] >= cutoff_time]


class PerformanceMonitor:
    """Main performance monitoring class."""
    
    def __init__(self, collection_interval: int = 60):
        self.collection_interval = collection_interval
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()
        self.monitoring_active = False
        self.monitor_thread = None
        
        # Application metrics tracking
        self.request_times = deque(maxlen=1000)
        self.error_count = 0
        self.request_count = 0
        
        # Setup default alerts
        self._setup_default_alerts()

    def start_monitoring(self):
        """Start performance monitoring."""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
        logger.info("Performance monitoring started")

    def stop_monitoring(self):
        """Stop performance monitoring."""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        logger.info("Performance monitoring stopped")

    def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.monitoring_active:
            try:
                # Collect system metrics
                system_metrics = self.metrics_collector.collect_system_metrics()
                
                # Collect application metrics
                app_metrics = self.metrics_collector.collect_application_metrics(
                    request_count=self.request_count,
                    response_times=list(self.request_times),
                    error_count=self.error_count,
                    active_connections=self._get_active_connections(),
                    cache_hit_rate=self._get_cache_hit_rate(),
                    db_query_time=self._get_db_query_time(),
                    slow_query_count=self._get_slow_query_count()
                )
                
                # Check alerts
                if system_metrics:
                    self.alert_manager.check_alerts(asdict(system_metrics))
                
                if app_metrics:
                    self.alert_manager.check_alerts(asdict(app_metrics))
                
                # Reset counters
                self.request_count = 0
                self.error_count = 0
                self.request_times.clear()
                
                time.sleep(self.collection_interval)
                
            except Exception as e:
                logger.error(f"Performance monitoring error: {e}")
                time.sleep(self.collection_interval)

    def record_request(self, response_time_ms: float, is_error: bool = False):
        """Record a request for performance tracking."""
        self.request_times.append(response_time_ms)
        self.request_count += 1
        if is_error:
            self.error_count += 1

    def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive performance dashboard data."""
        return {
            'current_metrics': self.metrics_collector.current_metrics,
            'metrics_summary': self.metrics_collector.get_metrics_summary(hours=1),
            'active_alerts': [asdict(alert) for alert in self.alert_manager.get_active_alerts()],
            'alert_history': self.alert_manager.get_alert_history(hours=24),
            'monitoring_status': {
                'active': self.monitoring_active,
                'collection_interval': self.collection_interval,
                'uptime_hours': self._get_uptime_hours()
            }
        }

    def _setup_default_alerts(self):
        """Setup default performance alerts."""
        default_alerts = [
            PerformanceAlert(
                alert_id='high_cpu',
                metric_name='cpu_percent',
                threshold=80.0,
                operator='gt',
                severity='high',
                message='CPU usage is above 80%'
            ),
            PerformanceAlert(
                alert_id='high_memory',
                metric_name='memory_percent',
                threshold=85.0,
                operator='gt',
                severity='high',
                message='Memory usage is above 85%'
            ),
            PerformanceAlert(
                alert_id='slow_response',
                metric_name='response_time_avg_ms',
                threshold=2000.0,
                operator='gt',
                severity='medium',
                message='Average response time is above 2 seconds'
            ),
            PerformanceAlert(
                alert_id='high_error_rate',
                metric_name='error_rate_percent',
                threshold=5.0,
                operator='gt',
                severity='high',
                message='Error rate is above 5%'
            ),
            PerformanceAlert(
                alert_id='low_cache_hit_rate',
                metric_name='cache_hit_rate_percent',
                threshold=70.0,
                operator='lt',
                severity='medium',
                message='Cache hit rate is below 70%'
            )
        ]
        
        for alert in default_alerts:
            self.alert_manager.add_alert(alert)

    def _get_active_connections(self) -> int:
        """Get current active connections count."""
        # This would integrate with the connection pool
        return 0

    def _get_cache_hit_rate(self) -> float:
        """Get current cache hit rate."""
        # This would integrate with the cache manager
        return 0.0

    def _get_db_query_time(self) -> float:
        """Get average database query time."""
        # This would integrate with the database optimizer
        return 0.0

    def _get_slow_query_count(self) -> int:
        """Get slow query count."""
        # This would integrate with the database optimizer
        return 0

    def _get_uptime_hours(self) -> float:
        """Get monitoring uptime in hours."""
        # This would track actual uptime
        return 0.0


# Decorator for automatic performance tracking
def track_performance(monitor: PerformanceMonitor = None):
    """Decorator for automatic performance tracking."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            is_error = False
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception:
                is_error = True
                raise
            finally:
                response_time = (time.time() - start_time) * 1000
                if monitor:
                    monitor.record_request(response_time, is_error)

        return wrapper
    return decorator


# Global performance monitor instance
_performance_monitor = None


def get_performance_monitor() -> PerformanceMonitor:
    """Get the global performance monitor instance."""
    global _performance_monitor
    
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
        _performance_monitor.start_monitoring()
    
    return _performance_monitor