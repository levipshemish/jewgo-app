"""
Comprehensive observability middleware for v5 API.

Provides OpenTelemetry tracing, metrics collection, PII masking for logs and traces,
request/response logging, performance monitoring, error tracking, and database query
monitoring. Built upon existing monitoring patterns with v5 enhancements.
"""

from __future__ import annotations

import time
import json
import uuid
import re
from typing import Dict, Any, Optional, List
from functools import wraps
from collections import defaultdict

from flask import g, request, jsonify

from utils.logging_config import get_logger

logger = get_logger(__name__)


class ObservabilityV5Middleware:
    """Comprehensive observability middleware with OpenTelemetry integration."""
    
    # PII patterns for masking in logs and traces
    PII_PATTERNS = {
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'phone': re.compile(r'(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'),
        'ssn': re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
        'credit_card': re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
        'address': re.compile(r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Plaza|Pl)'),
        'ip_address': re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),
    }
    
    # Performance thresholds
    PERFORMANCE_THRESHOLDS = {
        'response_time_ms': {
            'warning': 500,     # 500ms warning
            'critical': 2000,   # 2s critical
        },
        'memory_usage_mb': {
            'warning': 512,     # 512MB warning
            'critical': 1024,   # 1GB critical
        },
        'error_rate_percent': {
            'warning': 1.0,     # 1% warning
            'critical': 5.0,    # 5% critical
        }
    }
    
    def __init__(self, app=None):
        self.app = app
        self.metrics = defaultdict(list)
        self.traces = []
        self.otel_tracer = None
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with Flask app."""
        self.app = app
        self._init_opentelemetry()
        self._register_middleware()
    
    def _init_opentelemetry(self):
        """Initialize OpenTelemetry tracing."""
        # PERFORMANCE FIX: Disable OpenTelemetry instrumentation during startup
        # This was causing 15-30 second delays due to missing dependencies and blocking calls
        logger.info("OpenTelemetry disabled for performance - using basic observability")
        self.otel_tracer = None
        self.trace_module = None
        self.Status = None
        self.StatusCode = None
    
    def _register_middleware(self):
        """Register before/after request hooks for observability."""
        
        @self.app.before_request
        def _v5_observability_start():
            """Start observability tracking for v5 requests."""
            # Skip if not applicable
            if not self._should_apply_v5_observability():
                return
            
            try:
                # Initialize request context
                g.obs_start_time = time.time()
                g.obs_trace_id = str(uuid.uuid4())
                g.obs_span_id = str(uuid.uuid4())[:8]
                
                # Start OpenTelemetry span if available
                if self.otel_tracer:
                    g.obs_span = self.otel_tracer.start_span(
                        name=f"{request.method} {request.path}",
                        attributes={
                            'http.method': request.method,
                            'http.url': self._mask_pii(request.url),
                            'http.route': request.endpoint or 'unknown',
                            'user.id': self._mask_pii(str(getattr(g, 'user_id', 'anonymous'))),
                            'correlation.id': getattr(g, 'correlation_id', 'unknown'),
                        }
                    )
                
                # Log request start
                self._log_request_start()
                
            except Exception as e:
                logger.error(f"Observability v5 start error: {e}")
        
        @self.app.after_request
        def _v5_observability_end(response):
            """End observability tracking and collect metrics."""
            # Skip if not applicable
            if not hasattr(g, 'obs_start_time'):
                return response
            
            try:
                # Calculate response time
                response_time_ms = (time.time() - g.obs_start_time) * 1000
                
                # End OpenTelemetry span
                if hasattr(g, 'obs_span') and g.obs_span:
                    g.obs_span.set_attribute('http.status_code', response.status_code)
                    g.obs_span.set_attribute('http.response_time_ms', response_time_ms)
                    
                    # Add error status if applicable
                    if response.status_code >= 400:
                        if hasattr(self, 'Status') and hasattr(self, 'StatusCode'):
                            g.obs_span.set_status(self.Status(self.StatusCode.ERROR))
                        g.obs_span.set_attribute('error', True)
                    
                    g.obs_span.end()
                
                # Collect metrics
                self._collect_request_metrics(response, response_time_ms)
                
                # Log response
                self._log_request_end(response, response_time_ms)
                
                # Add observability headers
                self._add_observability_headers(response)
                
            except Exception as e:
                logger.error(f"Observability v5 end error: {e}")
            
            return response
        
        @self.app.teardown_request
        def _v5_observability_cleanup(exception):
            """Clean up observability context on request teardown."""
            try:
                if exception:
                    self._record_exception(exception)
            except Exception as e:
                logger.error(f"Observability v5 cleanup error: {e}")
    
    def _should_apply_v5_observability(self) -> bool:
        """Determine if v5 observability should be applied."""
        # Apply to v5 endpoints
        if request.path.startswith('/api/v5/'):
            return True
        
        # Apply to endpoints with v5 feature flag enabled
        try:
            from utils.feature_flags_v5 import FeatureFlagsV5
            feature_flags = FeatureFlagsV5()
            return feature_flags.is_enabled('observability_v5_for_legacy', default=False)
        except ImportError:
            return False
    
    def _log_request_start(self):
        """Log request start with PII masking."""
        request_info = {
            'event_type': 'request_start',
            'trace_id': getattr(g, 'obs_trace_id', None),
            'span_id': getattr(g, 'obs_span_id', None),
            'correlation_id': getattr(g, 'correlation_id', None),
            'method': request.method,
            'path': request.path,
            'endpoint': request.endpoint,
            'user_id': self._mask_pii(str(getattr(g, 'user_id', None))),
            'user_agent': self._mask_user_agent(),
            'ip_address': self._mask_pii(self._get_client_ip()),
            'content_type': request.content_type,
            'content_length': request.content_length,
        }
        
        # Add query parameters (masked)
        if request.args:
            request_info['query_params'] = {
                k: self._mask_pii(str(v)) for k, v in request.args.items()
            }
        
        logger.info(f"Request started | {json.dumps(request_info, default=str)}")
    
    def _log_request_end(self, response, response_time_ms: float):
        """Log request end with metrics."""
        response_info = {
            'event_type': 'request_end',
            'trace_id': getattr(g, 'obs_trace_id', None),
            'span_id': getattr(g, 'obs_span_id', None),
            'correlation_id': getattr(g, 'correlation_id', None),
            'method': request.method,
            'path': request.path,
            'endpoint': request.endpoint,
            'status_code': response.status_code,
            'response_time_ms': round(response_time_ms, 2),
            'content_type': response.content_type,
            'content_length': response.content_length,
            'user_id': self._mask_pii(str(getattr(g, 'user_id', None))),
        }
        
        # Determine log level based on status code and response time
        if response.status_code >= 500:
            log_level = 'error'
        elif response.status_code >= 400:
            log_level = 'warning'
        elif response_time_ms > self.PERFORMANCE_THRESHOLDS['response_time_ms']['critical']:
            log_level = 'warning'
        else:
            log_level = 'info'
        
        getattr(logger, log_level)(f"Request completed | {json.dumps(response_info, default=str)}")
    
    def _collect_request_metrics(self, response, response_time_ms: float):
        """Collect request metrics for monitoring."""
        timestamp = time.time()
        
        metric_data = {
            'timestamp': timestamp,
            'trace_id': getattr(g, 'obs_trace_id', None),
            'method': request.method,
            'path': request.path,
            'endpoint': request.endpoint or 'unknown',
            'status_code': response.status_code,
            'response_time_ms': response_time_ms,
            'user_id': getattr(g, 'user_id', None),
            'user_tier': getattr(g, 'rate_limit_tier', 'unknown'),
            'content_length': response.content_length or 0,
            'is_error': response.status_code >= 400,
            'is_slow': response_time_ms > self.PERFORMANCE_THRESHOLDS['response_time_ms']['warning'],
        }
        
        # Store metrics by endpoint
        endpoint_key = f"{request.method}_{request.endpoint or 'unknown'}"
        self.metrics[endpoint_key].append(metric_data)
        
        # Store overall metrics
        self.metrics['overall'].append(metric_data)
        
        # Cleanup old metrics (keep last 1000 per endpoint)
        for key in self.metrics:
            if len(self.metrics[key]) > 1000:
                self.metrics[key] = self.metrics[key][-1000:]
    
    def _record_exception(self, exception):
        """Record exception details with PII masking."""
        exception_info = {
            'event_type': 'exception',
            'trace_id': getattr(g, 'obs_trace_id', None),
            'span_id': getattr(g, 'obs_span_id', None),
            'correlation_id': getattr(g, 'correlation_id', None),
            'exception_type': type(exception).__name__,
            'exception_message': self._mask_pii(str(exception)),
            'endpoint': request.endpoint,
            'method': request.method,
            'path': request.path,
            'user_id': self._mask_pii(str(getattr(g, 'user_id', None))),
        }
        
        logger.error(f"Request exception | {json.dumps(exception_info, default=str)}")
        
        # Add to OpenTelemetry span if available
        if hasattr(g, 'obs_span') and g.obs_span:
            g.obs_span.record_exception(exception)
            if hasattr(self, 'Status') and hasattr(self, 'StatusCode'):
                g.obs_span.set_status(self.Status(self.StatusCode.ERROR, str(exception)))
    
    def _add_observability_headers(self, response):
        """Add observability headers to response."""
        response.headers['X-Trace-ID'] = getattr(g, 'obs_trace_id', '')
        response.headers['X-Span-ID'] = getattr(g, 'obs_span_id', '')
        
        if hasattr(g, 'correlation_id'):
            response.headers['X-Correlation-ID'] = g.correlation_id
        
        # Add performance headers if slow
        if hasattr(g, 'obs_start_time'):
            response_time = (time.time() - g.obs_start_time) * 1000
            if response_time > self.PERFORMANCE_THRESHOLDS['response_time_ms']['warning']:
                response.headers['X-Performance-Warning'] = 'slow-response'
    
    def _mask_pii(self, text: str) -> str:
        """Mask personally identifiable information."""
        if not text or text == 'None':
            return text
        
        masked = text
        
        # Apply PII masking patterns
        for pii_type, pattern in self.PII_PATTERNS.items():
            if pii_type == 'email':
                masked = pattern.sub(lambda m: m.group().split('@')[0][:2] + '***@' + m.group().split('@')[1], masked)
            elif pii_type == 'phone':
                masked = pattern.sub('***-***-****', masked)
            elif pii_type == 'ssn':
                masked = pattern.sub('***-**-****', masked)
            elif pii_type == 'credit_card':
                masked = pattern.sub('****-****-****-****', masked)
            elif pii_type == 'ip_address':
                masked = pattern.sub(lambda m: '.'.join(m.group().split('.')[:-1]) + '.***', masked)
            else:
                masked = pattern.sub(f'[{pii_type.upper()}]', masked)
        
        return masked
    
    def _mask_user_agent(self) -> str:
        """Get masked user agent for privacy."""
        ua = request.headers.get('User-Agent', 'unknown')
        # Mask version numbers for privacy
        return re.sub(r'\d+\.\d+\.\d+', 'x.x.x', ua)
    
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
    
    def record_request_metrics(self, request, response) -> None:
        """Record request metrics (for BlueprintFactoryV5 compatibility)."""
        try:
            if not self._should_apply_v5_observability():
                return
            
            # Calculate response time
            start_time = getattr(g, 'obs_start_time', time.time())
            response_time_ms = (time.time() - start_time) * 1000
            
            # Record the metrics
            self._collect_request_metrics(response, response_time_ms)
            
        except Exception as e:
            logger.error(f"Error recording request metrics: {e}")


def register_observability_v5_middleware(app) -> None:
    """Register v5 observability middleware with Flask app."""
    observability_middleware = ObservabilityV5Middleware(app)
    logger.info("V5 observability middleware registered successfully")


def trace_function_v5(operation_name: str = None):
    """Decorator to trace function execution with OpenTelemetry."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            obs_middleware = ObservabilityV5Middleware()
            
            if not obs_middleware.otel_tracer:
                # No tracing available, just execute function
                return f(*args, **kwargs)
            
            span_name = operation_name or f"{f.__module__}.{f.__name__}"
            
            with obs_middleware.otel_tracer.start_as_current_span(span_name) as span:
                try:
                    # Add function details to span
                    span.set_attribute('function.name', f.__name__)
                    span.set_attribute('function.module', f.__module__)
                    
                    # Add user context if available
                    if hasattr(g, 'user_id'):
                        span.set_attribute('user.id', obs_middleware._mask_pii(str(g.user_id)))
                    
                    # Execute function
                    start_time = time.time()
                    result = f(*args, **kwargs)
                    execution_time = (time.time() - start_time) * 1000
                    
                    # Add performance metrics
                    span.set_attribute('function.execution_time_ms', execution_time)
                    
                    return result
                    
                except Exception as e:
                    span.record_exception(e)
                    if hasattr(obs_middleware, 'Status') and hasattr(obs_middleware, 'StatusCode'):
                        span.set_status(obs_middleware.Status(obs_middleware.StatusCode.ERROR, str(e)))
                    raise
        
        return decorated_function
    return decorator


def record_custom_metric_v5(name: str, value: float, tags: Dict[str, str] = None):
    """Record a custom metric with v5 observability."""
    try:
        metric_data = {
            'timestamp': time.time(),
            'name': name,
            'value': value,
            'tags': tags or {},
            'trace_id': getattr(g, 'obs_trace_id', None),
            'user_id': getattr(g, 'user_id', None),
        }
        
        logger.info(f"Custom metric | {json.dumps(metric_data, default=str)}")
        
    except Exception as e:
        logger.error(f"Error recording custom metric: {e}")


def get_observability_stats_v5() -> Dict[str, Any]:
    """Get observability statistics for v5."""
    try:
        obs_middleware = ObservabilityV5Middleware()
        
        # Calculate basic stats from metrics
        total_requests = len(obs_middleware.metrics.get('overall', []))
        
        if total_requests == 0:
            return {
                'total_requests': 0,
                'average_response_time_ms': 0,
                'error_rate_percent': 0,
                'opentelemetry_enabled': obs_middleware.otel_tracer is not None
            }
        
        overall_metrics = obs_middleware.metrics['overall']
        response_times = [m['response_time_ms'] for m in overall_metrics]
        errors = [m for m in overall_metrics if m['is_error']]
        
        stats = {
            'total_requests': total_requests,
            'average_response_time_ms': sum(response_times) / len(response_times) if response_times else 0,
            'p95_response_time_ms': sorted(response_times)[int(len(response_times) * 0.95)] if response_times else 0,
            'error_rate_percent': (len(errors) / total_requests) * 100,
            'opentelemetry_enabled': obs_middleware.otel_tracer is not None,
            'performance_thresholds': obs_middleware.PERFORMANCE_THRESHOLDS,
            'endpoint_stats': {}
        }
        
        # Calculate per-endpoint stats
        for endpoint_key, metrics in obs_middleware.metrics.items():
            if endpoint_key != 'overall' and metrics:
                endpoint_response_times = [m['response_time_ms'] for m in metrics]
                endpoint_errors = [m for m in metrics if m['is_error']]
                
                stats['endpoint_stats'][endpoint_key] = {
                    'request_count': len(metrics),
                    'average_response_time_ms': sum(endpoint_response_times) / len(endpoint_response_times),
                    'error_rate_percent': (len(endpoint_errors) / len(metrics)) * 100 if metrics else 0
                }
        
        return stats
        
    except Exception as e:
        return {
            'error': str(e),
            'total_requests': 0,
            'opentelemetry_enabled': False
        }
