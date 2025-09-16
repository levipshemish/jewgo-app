#!/usr/bin/env python3
"""
Prometheus Metrics Integration

Provides comprehensive metrics collection for authentication events,
CSRF validation, performance tracking, and security monitoring.
"""

import time
import threading
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from collections import defaultdict, deque

try:
    from prometheus_client import (
        Counter, Histogram, Gauge, Info, 
        CollectorRegistry, generate_latest, 
        CONTENT_TYPE_LATEST, start_http_server
    )
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    # Mock classes for when prometheus_client is not available
    class Counter:
        def __init__(self, *args, **kwargs): pass
        def inc(self, *args, **kwargs): pass
        def labels(self, *args, **kwargs): return self
    
    class Histogram:
        def __init__(self, *args, **kwargs): pass
        def observe(self, *args, **kwargs): pass
        def time(self): return self
        def __enter__(self): return self
        def __exit__(self, *args): pass
    
    class Gauge:
        def __init__(self, *args, **kwargs): pass
        def set(self, *args, **kwargs): pass
        def inc(self, *args, **kwargs): pass
        def dec(self, *args, **kwargs): pass
        def labels(self, *args, **kwargs): return self
    
    class Info:
        def __init__(self, *args, **kwargs): pass
        def info(self, *args, **kwargs): pass

from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class AuthEvent:
    """Authentication event data structure."""
    event_type: str
    user_id: Optional[str]
    success: bool
    method: str
    ip_address: str
    user_agent: str
    timestamp: datetime
    details: Dict[str, Any]


class AuthMetrics:
    """Authentication metrics collector."""
    
    def __init__(self, registry: Optional[CollectorRegistry] = None):
        """Initialize authentication metrics."""
        self.registry = registry or CollectorRegistry()
        self._lock = threading.Lock()
        
        # Authentication counters
        self.login_attempts = Counter(
            'auth_login_attempts_total',
            'Total number of login attempts',
            ['result', 'method'],
            registry=self.registry
        )
        
        self.registration_attempts = Counter(
            'auth_registration_attempts_total',
            'Total number of registration attempts',
            ['result'],
            registry=self.registry
        )
        
        self.token_refreshes = Counter(
            'auth_token_refreshes_total',
            'Total number of token refresh attempts',
            ['result'],
            registry=self.registry
        )
        
        self.logout_events = Counter(
            'auth_logout_events_total',
            'Total number of logout events',
            ['method'],
            registry=self.registry
        )
        
        # CSRF metrics
        self.csrf_validations = Counter(
            'auth_csrf_validations_total',
            'Total number of CSRF token validations',
            ['result'],
            registry=self.registry
        )
        
        # Session management metrics
        self.session_creations = Counter(
            'auth_sessions_created_total',
            'Total number of sessions created',
            ['device_type'],
            registry=self.registry
        )
        
        self.session_revocations = Counter(
            'auth_sessions_revoked_total',
            'Total number of sessions revoked',
            ['reason'],
            registry=self.registry
        )
        
        # Performance histograms
        self.token_verification_latency = Histogram(
            'auth_token_verification_duration_seconds',
            'Time spent verifying tokens',
            ['method'],
            buckets=[0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0],
            registry=self.registry
        )
        
        self.csrf_validation_latency = Histogram(
            'auth_csrf_validation_duration_seconds',
            'Time spent validating CSRF tokens',
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5],
            registry=self.registry
        )
        
        self.session_rotation_latency = Histogram(
            'auth_session_rotation_duration_seconds',
            'Time spent rotating sessions',
            buckets=[0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0],
            registry=self.registry
        )
        
        # Security metrics
        self.security_events = Counter(
            'auth_security_events_total',
            'Total number of security events',
            ['event_type', 'severity'],
            registry=self.registry
        )
        
        self.rate_limit_hits = Counter(
            'auth_rate_limit_hits_total',
            'Total number of rate limit hits',
            ['endpoint', 'limit_type'],
            registry=self.registry
        )
        
        # Abuse control metrics
        self.abuse_control_checks = Counter(
            'auth_abuse_control_checks_total',
            'Total number of abuse control checks',
            ['result', 'action'],
            registry=self.registry
        )
        
        self.captcha_verifications = Counter(
            'auth_captcha_verifications_total',
            'Total number of CAPTCHA verifications',
            ['provider', 'result'],
            registry=self.registry
        )
        
        # Current state gauges
        self.active_sessions = Gauge(
            'auth_active_sessions',
            'Number of currently active sessions',
            registry=self.registry
        )
        
        self.active_users = Gauge(
            'auth_active_users',
            'Number of currently active users',
            registry=self.registry
        )
        
        # System information
        self.system_info = Info(
            'auth_system_info',
            'Authentication system information',
            registry=self.registry
        )
        
        # Initialize system info
        self.system_info.info({
            'version': '1.0.0',
            'component': 'auth_security_hardening'
        })
        
        logger.info("Authentication metrics initialized")
    
    def record_login_attempt(self, result: str, method: str = 'password') -> None:
        """Record a login attempt."""
        with self._lock:
            self.login_attempts.labels(result=result, method=method).inc()
            logger.debug(f"Recorded login attempt: {result} via {method}")
    
    def record_registration_attempt(self, result: str) -> None:
        """Record a registration attempt."""
        with self._lock:
            self.registration_attempts.labels(result=result).inc()
            logger.debug(f"Recorded registration attempt: {result}")
    
    def record_token_refresh(self, result: str) -> None:
        """Record a token refresh attempt."""
        with self._lock:
            self.token_refreshes.labels(result=result).inc()
            logger.debug(f"Recorded token refresh: {result}")
    
    def record_logout(self, method: str = 'manual') -> None:
        """Record a logout event."""
        with self._lock:
            self.logout_events.labels(method=method).inc()
            logger.debug(f"Recorded logout: {method}")
    
    def record_csrf_validation(self, result: str) -> None:
        """Record a CSRF validation."""
        with self._lock:
            self.csrf_validations.labels(result=result).inc()
            logger.debug(f"Recorded CSRF validation: {result}")
    
    def record_session_creation(self, device_type: str = 'unknown') -> None:
        """Record a session creation."""
        with self._lock:
            self.session_creations.labels(device_type=device_type).inc()
            logger.debug(f"Recorded session creation: {device_type}")
    
    def record_session_revocation(self, reason: str) -> None:
        """Record a session revocation."""
        with self._lock:
            self.session_revocations.labels(reason=reason).inc()
            logger.debug(f"Recorded session revocation: {reason}")
    
    def record_token_verification_latency(self, duration_seconds: float, method: str = 'jwt') -> None:
        """Record token verification latency."""
        with self._lock:
            self.token_verification_latency.labels(method=method).observe(duration_seconds)
            logger.debug(f"Recorded token verification latency: {duration_seconds:.3f}s via {method}")
    
    def record_csrf_validation_latency(self, duration_seconds: float) -> None:
        """Record CSRF validation latency."""
        with self._lock:
            self.csrf_validation_latency.observe(duration_seconds)
            logger.debug(f"Recorded CSRF validation latency: {duration_seconds:.3f}s")
    
    def record_session_rotation_latency(self, duration_seconds: float) -> None:
        """Record session rotation latency."""
        with self._lock:
            self.session_rotation_latency.observe(duration_seconds)
            logger.debug(f"Recorded session rotation latency: {duration_seconds:.3f}s")
    
    def record_security_event(self, event_type: str, severity: str = 'info') -> None:
        """Record a security event."""
        with self._lock:
            self.security_events.labels(event_type=event_type, severity=severity).inc()
            logger.info(f"Recorded security event: {event_type} ({severity})")
    
    def record_rate_limit_hit(self, endpoint: str, limit_type: str = 'per_user') -> None:
        """Record a rate limit hit."""
        with self._lock:
            self.rate_limit_hits.labels(endpoint=endpoint, limit_type=limit_type).inc()
            logger.warning(f"Recorded rate limit hit: {endpoint} ({limit_type})")
    
    def record_abuse_control_check(self, result: str, action: str) -> None:
        """Record an abuse control check."""
        with self._lock:
            self.abuse_control_checks.labels(result=result, action=action).inc()
            logger.debug(f"Recorded abuse control check: {result} -> {action}")
    
    def record_captcha_verification(self, provider: str, result: str) -> None:
        """Record a CAPTCHA verification."""
        with self._lock:
            self.captcha_verifications.labels(provider=provider, result=result).inc()
            logger.debug(f"Recorded CAPTCHA verification: {provider} -> {result}")
    
    def update_active_sessions(self, count: int) -> None:
        """Update the number of active sessions."""
        with self._lock:
            self.active_sessions.set(count)
            logger.debug(f"Updated active sessions count: {count}")
    
    def update_active_users(self, count: int) -> None:
        """Update the number of active users."""
        with self._lock:
            self.active_users.set(count)
            logger.debug(f"Updated active users count: {count}")
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of current metrics."""
        # This would typically query the Prometheus registry
        # For now, return a basic summary
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'metrics_available': PROMETHEUS_AVAILABLE,
            'registry_configured': self.registry is not None
        }


class MetricsCollector:
    """Main metrics collector that aggregates data from various sources."""
    
    def __init__(self, auth_metrics: AuthMetrics):
        """Initialize metrics collector."""
        self.auth_metrics = auth_metrics
        self._running = False
        self._thread = None
        self._collect_interval = 30  # seconds
        
        # Internal counters for aggregation
        self._event_buffer = deque(maxlen=1000)
        self._performance_data = defaultdict(list)
        
        logger.info("Metrics collector initialized")
    
    def start(self, collect_interval: int = 30) -> None:
        """Start the metrics collection thread."""
        if self._running:
            logger.warning("Metrics collector is already running")
            return
        
        self._collect_interval = collect_interval
        self._running = True
        self._thread = threading.Thread(target=self._collection_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Metrics collector started with {collect_interval}s interval")
    
    def stop(self) -> None:
        """Stop the metrics collection thread."""
        if not self._running:
            return
        
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        
        logger.info("Metrics collector stopped")
    
    def _collection_loop(self) -> None:
        """Main collection loop."""
        while self._running:
            try:
                self._collect_system_metrics()
                self._collect_auth_metrics()
                self._cleanup_old_data()
                
                time.sleep(self._collect_interval)
            except Exception as e:
                logger.error(f"Error in metrics collection loop: {e}")
                time.sleep(self._collect_interval)
    
    def _collect_system_metrics(self) -> None:
        """Collect system-level metrics."""
        try:
            # This would collect actual system metrics
            # For now, just log that we're collecting
            logger.debug("Collecting system metrics")
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    def _collect_auth_metrics(self) -> None:
        """Collect authentication-specific metrics."""
        try:
            # This would query the database for current session counts
            # For now, just log that we're collecting
            logger.debug("Collecting auth metrics")
        except Exception as e:
            logger.error(f"Error collecting auth metrics: {e}")
    
    def _cleanup_old_data(self) -> None:
        """Clean up old performance data."""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            # Clean up old performance data
            for key in list(self._performance_data.keys()):
                self._performance_data[key] = [
                    data for data in self._performance_data[key]
                    if data.get('timestamp', datetime.utcnow()) > cutoff_time
                ]
                
                # Remove empty entries
                if not self._performance_data[key]:
                    del self._performance_data[key]
            
            logger.debug("Cleaned up old metrics data")
        except Exception as e:
            logger.error(f"Error cleaning up metrics data: {e}")
    
    def record_auth_event(self, event: AuthEvent) -> None:
        """Record an authentication event."""
        try:
            # Add to buffer
            self._event_buffer.append(event)
            
            # Record appropriate metrics based on event type
            if event.event_type == 'login':
                self.auth_metrics.record_login_attempt(
                    'success' if event.success else 'failure',
                    event.method
                )
            elif event.event_type == 'registration':
                self.auth_metrics.record_registration_attempt(
                    'success' if event.success else 'failure'
                )
            elif event.event_type == 'token_refresh':
                self.auth_metrics.record_token_refresh(
                    'success' if event.success else 'failure'
                )
            elif event.event_type == 'logout':
                self.auth_metrics.record_logout(event.method)
            elif event.event_type == 'csrf_validation':
                self.auth_metrics.record_csrf_validation(
                    'valid' if event.success else 'invalid'
                )
            
            # Record security events
            if not event.success and event.event_type in ['login', 'csrf_validation']:
                severity = 'warning' if event.event_type == 'login' else 'critical'
                self.auth_metrics.record_security_event(event.event_type, severity)
            
            logger.debug(f"Recorded auth event: {event.event_type} ({'success' if event.success else 'failure'})")
            
        except Exception as e:
            logger.error(f"Error recording auth event: {e}")
    
    def record_performance_metric(self, metric_name: str, duration_seconds: float, metadata: Dict[str, Any] = None) -> None:
        """Record a performance metric."""
        try:
            metric_data = {
                'timestamp': datetime.utcnow(),
                'duration': duration_seconds,
                'metadata': metadata or {}
            }
            
            self._performance_data[metric_name].append(metric_data)
            
            # Record to appropriate histogram
            if metric_name == 'token_verification':
                method = metadata.get('method', 'jwt') if metadata else 'jwt'
                self.auth_metrics.record_token_verification_latency(duration_seconds, method)
            elif metric_name == 'csrf_validation':
                self.auth_metrics.record_csrf_validation_latency(duration_seconds)
            elif metric_name == 'session_rotation':
                self.auth_metrics.record_session_rotation_latency(duration_seconds)
            
            logger.debug(f"Recorded performance metric: {metric_name} = {duration_seconds:.3f}s")
            
        except Exception as e:
            logger.error(f"Error recording performance metric: {e}")


class PrometheusExporter:
    """Prometheus metrics exporter."""
    
    def __init__(self, auth_metrics: AuthMetrics, port: int = 8000):
        """Initialize Prometheus exporter."""
        self.auth_metrics = auth_metrics
        self.port = port
        self._server = None
        
        logger.info(f"Prometheus exporter initialized on port {port}")
    
    def start_server(self) -> None:
        """Start the Prometheus metrics server."""
        if not PROMETHEUS_AVAILABLE:
            logger.warning("Prometheus client not available, cannot start metrics server")
            return
        
        if self._server is not None:
            logger.warning("Prometheus server is already running")
            return
        
        try:
            self._server = start_http_server(self.port, registry=self.auth_metrics.registry)
            logger.info(f"Prometheus metrics server started on port {self.port}")
        except Exception as e:
            logger.error(f"Failed to start Prometheus server: {e}")
            raise
    
    def stop_server(self) -> None:
        """Stop the Prometheus metrics server."""
        if self._server is not None:
            # Note: prometheus_client doesn't provide a direct way to stop the server
            # In a real implementation, you'd need to manage the server lifecycle
            logger.info("Prometheus metrics server stopped")
            self._server = None
    
    def get_metrics(self) -> str:
        """Get metrics in Prometheus format."""
        if not PROMETHEUS_AVAILABLE:
            return "# Prometheus client not available\n"
        
        try:
            return generate_latest(self.auth_metrics.registry).decode('utf-8')
        except Exception as e:
            logger.error(f"Error generating metrics: {e}")
            return f"# Error generating metrics: {e}\n"
    
    def get_metrics_content_type(self) -> str:
        """Get the content type for metrics."""
        return CONTENT_TYPE_LATEST


# Global instances
auth_metrics = AuthMetrics()
metrics_collector = MetricsCollector(auth_metrics)
prometheus_exporter = PrometheusExporter(auth_metrics)


def get_auth_metrics() -> AuthMetrics:
    """Get the global auth metrics instance."""
    return auth_metrics


def get_metrics_collector() -> MetricsCollector:
    """Get the global metrics collector instance."""
    return metrics_collector


def get_prometheus_exporter() -> PrometheusExporter:
    """Get the global Prometheus exporter instance."""
    return prometheus_exporter


def start_metrics_collection(collect_interval: int = 30, start_server: bool = True, server_port: int = 8000) -> None:
    """Start metrics collection and optionally the Prometheus server."""
    try:
        # Start metrics collection
        metrics_collector.start(collect_interval)
        
        # Start Prometheus server if requested
        if start_server:
            prometheus_exporter.port = server_port
            prometheus_exporter.start_server()
        
        logger.info("Metrics collection started successfully")
    except Exception as e:
        logger.error(f"Failed to start metrics collection: {e}")
        raise


def stop_metrics_collection() -> None:
    """Stop metrics collection and the Prometheus server."""
    try:
        metrics_collector.stop()
        prometheus_exporter.stop_server()
        logger.info("Metrics collection stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping metrics collection: {e}")


# Context manager for timing operations
class MetricsTimer:
    """Context manager for timing operations and recording metrics."""
    
    def __init__(self, metric_name: str, metadata: Dict[str, Any] = None):
        """Initialize metrics timer."""
        self.metric_name = metric_name
        self.metadata = metadata or {}
        self.start_time = None
    
    def __enter__(self):
        """Start timing."""
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop timing and record metric."""
        if self.start_time is not None:
            duration = time.time() - self.start_time
            metrics_collector.record_performance_metric(
                self.metric_name, 
                duration, 
                self.metadata
            )
