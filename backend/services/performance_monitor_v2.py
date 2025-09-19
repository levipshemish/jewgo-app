#!/usr/bin/env python3
"""
Enhanced Performance Monitor V2 for JewGo Backend
================================================

This module provides advanced performance monitoring including:
- Real-time performance metrics
- Custom business metrics
- Performance alerting
- Resource optimization recommendations
- Performance trend analysis

Author: JewGo Development Team
Version: 2.0
Last Updated: 2025-01-27
"""

import time
import threading
import psutil
from collections import deque, defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, asdict
from functools import wraps
from enum import Enum

from utils.logging_config import get_logger

logger = get_logger(__name__)


class MetricType(Enum):
    """Types of metrics."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


@dataclass
class PerformanceMetric:
    """Performance metric definition."""
    name: str
    value: float
    metric_type: MetricType
    labels: Dict[str, str]
    timestamp: datetime
    unit: Optional[str] = None


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


class PerformanceCollector:
    """Advanced performance metrics collector."""
    
    def __init__(self, retention_hours: int = 24):
        self.retention_hours = retention_hours
        self.metrics_history = defaultdict(lambda: deque(maxlen=retention_hours * 60))
        self.current_metrics = {}
        self.lock = threading.RLock()
        
        # Performance tracking
        self.request_times = deque(maxlen=1000)
        self.error_count = 0
        self.request_count = 0
        self.slow_queries = deque(maxlen=100)
        
        # Business metrics
        self.business_metrics = defaultdict(int)
        
        logger.info("Performance collector initialized")

    def record_metric(self, metric: PerformanceMetric):
        """Record a performance metric."""
        with self.lock:
            self.metrics_history[metric.name].append(metric)
            self.current_metrics[metric.name] = metric
            logger.debug(f"Recorded metric: {metric.name} = {metric.value}")

    def record_request(self, response_time_ms: float, endpoint: str = None, method: str = None, is_error: bool = False):
        """Record a request for performance tracking."""
        with self.lock:
            self.request_times.append(response_time_ms)
            self.request_count += 1
            if is_error:
                self.error_count += 1
            
            # Record endpoint-specific metrics
            if endpoint:
                metric = PerformanceMetric(
                    name=f"request_duration_{endpoint}",
                    value=response_time_ms,
                    metric_type=MetricType.HISTOGRAM,
                    labels={'endpoint': endpoint, 'method': method or 'unknown'},
                    timestamp=datetime.utcnow(),
                    unit='ms'
                )
                self.record_metric(metric)
            
            # Record slow requests
            if response_time_ms > 1000:  # > 1 second
                self.slow_queries.append({
                    'endpoint': endpoint,
                    'method': method,
                    'duration_ms': response_time_ms,
                    'timestamp': datetime.utcnow()
                })

    def record_business_metric(self, metric_name: str, value: float, labels: Dict[str, str] = None):
        """Record a business-specific metric."""
        with self.lock:
            self.business_metrics[metric_name] += value
            
            metric = PerformanceMetric(
                name=f"business_{metric_name}",
                value=value,
                metric_type=MetricType.COUNTER,
                labels=labels or {},
                timestamp=datetime.utcnow()
            )
            self.record_metric(metric)

    def get_performance_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get performance summary for the last N hours."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        with self.lock:
            # Calculate request statistics
            recent_requests = [rt for rt in self.request_times if True]  # All recent requests
            
            if recent_requests:
                avg_response_time = sum(recent_requests) / len(recent_requests)
                p95_response_time = sorted(recent_requests)[int(len(recent_requests) * 0.95)]
                p99_response_time = sorted(recent_requests)[int(len(recent_requests) * 0.99)]
            else:
                avg_response_time = p95_response_time = p99_response_time = 0
            
            # Calculate error rate
            total_requests = self.request_count
            error_rate = (self.error_count / total_requests * 100) if total_requests > 0 else 0
            
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            return {
                'requests': {
                    'total': total_requests,
                    'errors': self.error_count,
                    'error_rate_percent': error_rate,
                    'avg_response_time_ms': avg_response_time,
                    'p95_response_time_ms': p95_response_time,
                    'p99_response_time_ms': p99_response_time
                },
                'system': {
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'memory_used_gb': memory.used / (1024**3),
                    'memory_available_gb': memory.available / (1024**3)
                },
                'slow_queries': list(self.slow_queries)[-10:],  # Last 10 slow queries
                'business_metrics': dict(self.business_metrics),
                'timestamp': datetime.utcnow().isoformat()
            }

    def get_metric_trends(self, metric_name: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get trends for a specific metric."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        with self.lock:
            recent_metrics = [
                asdict(metric) for metric in self.metrics_history[metric_name]
                if metric.timestamp >= cutoff_time
            ]
            
            return recent_metrics


class PerformanceAlertManager:
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

    def check_alerts(self, metrics: Dict[str, Any]):
        """Check all alerts against current metrics."""
        with self.lock:
            for alert_id, alert in self.alerts.items():
                if alert.metric_name in metrics:
                    value = metrics[alert.metric_name]
                    if self._check_condition(value, alert.threshold, alert.operator):
                        self._trigger_alert(alert, value)
                    elif alert.is_active:
                        self._resolve_alert(alert)

    def _check_condition(self, value: float, threshold: float, operator: str) -> bool:
        """Check if alert condition is met."""
        if operator == 'gt':
            return value > threshold
        elif operator == 'lt':
            return value < threshold
        elif operator == 'eq':
            return value == threshold
        elif operator == 'gte':
            return value >= threshold
        elif operator == 'lte':
            return value <= threshold
        return False

    def _trigger_alert(self, alert: PerformanceAlert, value: float):
        """Trigger an alert."""
        if not alert.is_active:
            alert.is_active = True
            alert.triggered_at = datetime.utcnow()
            alert.resolved_at = None
            
            alert_event = {
                'type': 'alert_triggered',
                'alert_id': alert.alert_id,
                'metric_name': alert.metric_name,
                'threshold': alert.threshold,
                'actual_value': value,
                'severity': alert.severity,
                'message': alert.message,
                'timestamp': alert.triggered_at.isoformat()
            }
            
            self.alert_history.append(alert_event)
            self._send_notifications(alert_event)
            
            logger.warning(f"Performance alert triggered: {alert.alert_id} - {alert.message}")

    def _resolve_alert(self, alert: PerformanceAlert):
        """Resolve an alert."""
        if alert.is_active:
            alert.is_active = False
            alert.resolved_at = datetime.utcnow()
            
            alert_event = {
                'type': 'alert_resolved',
                'alert_id': alert.alert_id,
                'metric_name': alert.metric_name,
                'severity': alert.severity,
                'message': alert.message,
                'timestamp': alert.resolved_at.isoformat()
            }
            
            self.alert_history.append(alert_event)
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


class PerformanceMonitorV2:
    """Enhanced performance monitoring system."""
    
    def __init__(self, collection_interval: int = 60):
        self.collection_interval = collection_interval
        self.collector = PerformanceCollector()
        self.alert_manager = PerformanceAlertManager()
        self.monitoring_active = False
        self.monitor_thread = None
        
        # Setup default alerts
        self._setup_default_alerts()
        
        logger.info("Performance monitor V2 initialized")

    def start_monitoring(self):
        """Start performance monitoring."""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
        logger.info("Performance monitoring V2 started")

    def stop_monitoring(self):
        """Stop performance monitoring."""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        logger.info("Performance monitoring V2 stopped")

    def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.monitoring_active:
            try:
                # Collect system metrics
                self._collect_system_metrics()
                
                # Check alerts
                summary = self.collector.get_performance_summary(hours=1)
                self.alert_manager.check_alerts(summary['requests'])
                
                time.sleep(self.collection_interval)
                
            except Exception as e:
                logger.error(f"Performance monitoring error: {e}")
                time.sleep(self.collection_interval)

    def _collect_system_metrics(self):
        """Collect system-level metrics."""
        try:
            # CPU and memory metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # Record system metrics
            cpu_metric = PerformanceMetric(
                name='system_cpu_percent',
                value=cpu_percent,
                metric_type=MetricType.GAUGE,
                labels={},
                timestamp=datetime.utcnow(),
                unit='percent'
            )
            self.collector.record_metric(cpu_metric)
            
            memory_metric = PerformanceMetric(
                name='system_memory_percent',
                value=memory.percent,
                metric_type=MetricType.GAUGE,
                labels={},
                timestamp=datetime.utcnow(),
                unit='percent'
            )
            self.collector.record_metric(memory_metric)
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")

    def _setup_default_alerts(self):
        """Setup default performance alerts."""
        default_alerts = [
            PerformanceAlert(
                alert_id='high_response_time',
                metric_name='avg_response_time_ms',
                threshold=2000.0,
                operator='gt',
                severity='high',
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
                alert_id='high_cpu_usage',
                metric_name='system_cpu_percent',
                threshold=80.0,
                operator='gt',
                severity='medium',
                message='CPU usage is above 80%'
            ),
            PerformanceAlert(
                alert_id='high_memory_usage',
                metric_name='system_memory_percent',
                threshold=85.0,
                operator='gt',
                severity='medium',
                message='Memory usage is above 85%'
            )
        ]
        
        for alert in default_alerts:
            self.alert_manager.add_alert(alert)

    def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive performance dashboard data."""
        return {
            'summary': self.collector.get_performance_summary(hours=1),
            'active_alerts': [asdict(alert) for alert in self.alert_manager.alerts.values() if alert.is_active],
            'alert_history': list(self.alert_manager.alert_history)[-50:],  # Last 50 alerts
            'monitoring_status': {
                'active': self.monitoring_active,
                'collection_interval': self.collection_interval
            },
            'timestamp': datetime.utcnow().isoformat()
        }

    def record_request(self, response_time_ms: float, endpoint: str = None, method: str = None, is_error: bool = False):
        """Record a request for performance tracking."""
        self.collector.record_request(response_time_ms, endpoint, method, is_error)

    def record_business_metric(self, metric_name: str, value: float, labels: Dict[str, str] = None):
        """Record a business-specific metric."""
        self.collector.record_business_metric(metric_name, value, labels)


# Decorator for automatic performance tracking
def track_performance_v2(monitor: PerformanceMonitorV2 = None, endpoint: str = None):
    """Decorator for automatic performance tracking V2."""
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
                    monitor.record_request(response_time, endpoint, func.__name__, is_error)

        return wrapper
    return decorator


# Global performance monitor instance
_performance_monitor_v2 = None


def get_performance_monitor_v2() -> PerformanceMonitorV2:
    """Get the global performance monitor V2 instance."""
    global _performance_monitor_v2
    
    if _performance_monitor_v2 is None:
        _performance_monitor_v2 = PerformanceMonitorV2()
        _performance_monitor_v2.start_monitoring()
    
    return _performance_monitor_v2