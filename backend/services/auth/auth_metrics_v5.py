"""
Comprehensive Authentication Metrics System for v5 API.

Provides metrics collection for authentication events, performance monitoring,
security event logging with PII masking, and Prometheus integration.
"""

from __future__ import annotations

import time
import json
import re
import hashlib
from typing import Dict, Any, Optional, List, Union
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from enum import Enum
from flask import g, request
from utils.logging_config import get_logger

logger = get_logger(__name__)


class AuthEventType(Enum):
    """Authentication event types for metrics."""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    REFRESH_SUCCESS = "refresh_success"
    REFRESH_REPLAY = "refresh_replay"
    REFRESH_REVOKED = "refresh_revoked"
    CSRF_VALID = "csrf_valid"
    CSRF_INVALID = "csrf_invalid"
    TOKEN_VERIFY_SUCCESS = "token_verify_success"
    TOKEN_VERIFY_FAILURE = "token_verify_failure"
    SESSION_CREATED = "session_created"
    SESSION_REVOKED = "session_revoked"
    FAMILY_REVOKED = "family_revoked"


class AuthFailureReason(Enum):
    """Authentication failure reasons for detailed metrics."""
    INVALID_CREDENTIALS = "invalid_credentials"
    ACCOUNT_DISABLED = "account_disabled"
    RATE_LIMITED = "rate_limited"
    TOKEN_EXPIRED = "token_expired"
    TOKEN_INVALID = "token_invalid"
    CSRF_MISSING = "csrf_missing"
    CSRF_INVALID = "csrf_invalid"
    SESSION_NOT_FOUND = "session_not_found"
    FAMILY_REVOKED = "family_revoked"
    NETWORK_ERROR = "network_error"
    UNKNOWN = "unknown"


@dataclass
class AuthMetric:
    """Authentication metric data structure."""
    event_type: AuthEventType
    timestamp: float
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    family_id: Optional[str] = None
    correlation_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    response_time_ms: Optional[float] = None
    failure_reason: Optional[AuthFailureReason] = None
    user_agent_hash: Optional[str] = None
    ip_address_hash: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None


@dataclass
class PerformanceMetric:
    """Performance metric data structure."""
    operation: str
    timestamp: float
    duration_ms: float
    success: bool
    correlation_id: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None


class AuthMetricsV5:
    """Comprehensive authentication metrics collection system."""
    
    # PII patterns for masking
    PII_PATTERNS = {
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'phone': re.compile(r'(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'),
        'ip_address': re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),
        'user_id': re.compile(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b'),
    }
    
    def __init__(self, max_metrics: int = 10000):
        self.max_metrics = max_metrics
        self.auth_metrics: deque = deque(maxlen=max_metrics)
        self.performance_metrics: deque = deque(maxlen=max_metrics)
        self.counters: Dict[str, int] = defaultdict(int)
        self.histograms: Dict[str, List[float]] = defaultdict(list)
        self.security_events: deque = deque(maxlen=1000)
        
        # Performance tracking
        self.operation_times: Dict[str, List[float]] = defaultdict(list)
        
        logger.info("AuthMetricsV5 initialized", max_metrics=max_metrics)
    
    def record_auth_event(
        self,
        event_type: AuthEventType,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        family_id: Optional[str] = None,
        failure_reason: Optional[AuthFailureReason] = None,
        response_time_ms: Optional[float] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record an authentication event with PII masking."""
        try:
            # Get request context data
            correlation_id = getattr(g, 'correlation_id', None)
            endpoint = getattr(request, 'endpoint', None) if request else None
            method = getattr(request, 'method', None) if request else None
            status_code = getattr(g, 'response_status_code', None)
            
            # Create metric with PII masking
            metric = AuthMetric(
                event_type=event_type,
                timestamp=time.time(),
                user_id=self._mask_user_id(user_id),
                session_id=self._mask_session_id(session_id),
                family_id=self._mask_family_id(family_id),
                correlation_id=correlation_id,
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                response_time_ms=response_time_ms,
                failure_reason=failure_reason,
                user_agent_hash=self._hash_user_agent(),
                ip_address_hash=self._hash_ip_address(),
                additional_data=self._mask_additional_data(additional_data or {})
            )
            
            # Store metric
            self.auth_metrics.append(metric)
            
            # Update counters
            counter_key = f"auth_{event_type.value}_total"
            self.counters[counter_key] += 1
            
            # Add failure reason to counter if applicable
            if failure_reason:
                failure_counter_key = f"auth_{event_type.value}_{failure_reason.value}_total"
                self.counters[failure_counter_key] += 1
            
            # Add response time to histogram if provided
            if response_time_ms is not None:
                self.histograms[f"auth_{event_type.value}_duration_ms"].append(response_time_ms)
            
            # Log security event
            self._log_security_event(metric)
            
            logger.debug(f"Auth event recorded: {event_type.value}", 
                        correlation_id=correlation_id, 
                        endpoint=endpoint)
            
        except Exception as e:
            logger.error(f"Error recording auth event: {e}", 
                        event_type=event_type.value if event_type else None)
    
    def record_performance_metric(
        self,
        operation: str,
        duration_ms: float,
        success: bool = True,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record a performance metric."""
        try:
            correlation_id = getattr(g, 'correlation_id', None)
            
            metric = PerformanceMetric(
                operation=operation,
                timestamp=time.time(),
                duration_ms=duration_ms,
                success=success,
                correlation_id=correlation_id,
                additional_data=self._mask_additional_data(additional_data or {})
            )
            
            self.performance_metrics.append(metric)
            
            # Update histograms
            self.histograms[f"{operation}_duration_ms"].append(duration_ms)
            self.operation_times[operation].append(duration_ms)
            
            # Update counters
            status = "success" if success else "failure"
            self.counters[f"{operation}_{status}_total"] += 1
            
            logger.debug(f"Performance metric recorded: {operation}", 
                        duration_ms=duration_ms, 
                        success=success,
                        correlation_id=correlation_id)
            
        except Exception as e:
            logger.error(f"Error recording performance metric: {e}", operation=operation)
    
    def record_login_attempt(
        self,
        success: bool,
        user_id: Optional[str] = None,
        failure_reason: Optional[AuthFailureReason] = None,
        response_time_ms: Optional[float] = None
    ) -> None:
        """Record a login attempt."""
        event_type = AuthEventType.LOGIN_SUCCESS if success else AuthEventType.LOGIN_FAILURE
        self.record_auth_event(
            event_type=event_type,
            user_id=user_id,
            failure_reason=failure_reason,
            response_time_ms=response_time_ms
        )
    
    def record_refresh_attempt(
        self,
        success: bool,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        family_id: Optional[str] = None,
        is_replay: bool = False,
        is_revoked: bool = False,
        response_time_ms: Optional[float] = None
    ) -> None:
        """Record a token refresh attempt."""
        if is_replay:
            event_type = AuthEventType.REFRESH_REPLAY
        elif is_revoked:
            event_type = AuthEventType.REFRESH_REVOKED
        elif success:
            event_type = AuthEventType.REFRESH_SUCCESS
        else:
            event_type = AuthEventType.LOGIN_FAILURE  # Generic failure
        
        self.record_auth_event(
            event_type=event_type,
            user_id=user_id,
            session_id=session_id,
            family_id=family_id,
            response_time_ms=response_time_ms
        )
    
    def record_csrf_validation(
        self,
        valid: bool,
        response_time_ms: Optional[float] = None
    ) -> None:
        """Record CSRF token validation."""
        event_type = AuthEventType.CSRF_VALID if valid else AuthEventType.CSRF_INVALID
        self.record_auth_event(
            event_type=event_type,
            response_time_ms=response_time_ms
        )
    
    def record_token_verification(
        self,
        success: bool,
        user_id: Optional[str] = None,
        response_time_ms: Optional[float] = None,
        failure_reason: Optional[AuthFailureReason] = None
    ) -> None:
        """Record token verification."""
        event_type = AuthEventType.TOKEN_VERIFY_SUCCESS if success else AuthEventType.TOKEN_VERIFY_FAILURE
        self.record_auth_event(
            event_type=event_type,
            user_id=user_id,
            failure_reason=failure_reason,
            response_time_ms=response_time_ms
        )
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get comprehensive metrics summary."""
        try:
            now = time.time()
            
            # Calculate time windows
            last_hour = now - 3600
            last_day = now - 86400
            
            # Filter recent metrics
            recent_auth_metrics = [m for m in self.auth_metrics if m.timestamp >= last_hour]
            recent_perf_metrics = [m for m in self.performance_metrics if m.timestamp >= last_hour]
            
            # Calculate rates
            login_attempts = len([m for m in recent_auth_metrics 
                                if m.event_type in [AuthEventType.LOGIN_SUCCESS, AuthEventType.LOGIN_FAILURE]])
            login_successes = len([m for m in recent_auth_metrics 
                                 if m.event_type == AuthEventType.LOGIN_SUCCESS])
            
            refresh_attempts = len([m for m in recent_auth_metrics 
                                  if m.event_type in [AuthEventType.REFRESH_SUCCESS, AuthEventType.REFRESH_REPLAY, AuthEventType.REFRESH_REVOKED]])
            refresh_replays = len([m for m in recent_auth_metrics 
                                 if m.event_type == AuthEventType.REFRESH_REPLAY])
            
            csrf_validations = len([m for m in recent_auth_metrics 
                                  if m.event_type in [AuthEventType.CSRF_VALID, AuthEventType.CSRF_INVALID]])
            csrf_invalid = len([m for m in recent_auth_metrics 
                              if m.event_type == AuthEventType.CSRF_INVALID])
            
            # Calculate performance metrics
            verify_token_times = [m.response_time_ms for m in recent_auth_metrics 
                                if m.event_type == AuthEventType.TOKEN_VERIFY_SUCCESS and m.response_time_ms]
            
            summary = {
                'timestamp': now,
                'time_window_hours': 1,
                'counters': dict(self.counters),
                'rates': {
                    'login_success_rate': (login_successes / login_attempts * 100) if login_attempts > 0 else 0,
                    'refresh_replay_rate': (refresh_replays / refresh_attempts * 100) if refresh_attempts > 0 else 0,
                    'csrf_invalid_rate': (csrf_invalid / csrf_validations * 100) if csrf_validations > 0 else 0,
                },
                'performance': {
                    'verify_token_p50_ms': self._calculate_percentile(verify_token_times, 0.5),
                    'verify_token_p95_ms': self._calculate_percentile(verify_token_times, 0.95),
                    'verify_token_p99_ms': self._calculate_percentile(verify_token_times, 0.99),
                },
                'totals': {
                    'auth_events_total': len(self.auth_metrics),
                    'performance_metrics_total': len(self.performance_metrics),
                    'security_events_total': len(self.security_events),
                },
                'recent_activity': {
                    'auth_events_last_hour': len(recent_auth_metrics),
                    'performance_metrics_last_hour': len(recent_perf_metrics),
                }
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating metrics summary: {e}")
            return {'error': str(e), 'timestamp': time.time()}
    
    def get_prometheus_metrics(self) -> str:
        """Generate Prometheus-formatted metrics."""
        try:
            metrics_lines = []
            
            # Add counter metrics
            for counter_name, value in self.counters.items():
                metrics_lines.append(f"# TYPE {counter_name} counter")
                metrics_lines.append(f"{counter_name} {value}")
            
            # Add histogram metrics
            for hist_name, values in self.histograms.items():
                if values:
                    metrics_lines.append(f"# TYPE {hist_name} histogram")
                    
                    # Calculate percentiles
                    p50 = self._calculate_percentile(values, 0.5)
                    p95 = self._calculate_percentile(values, 0.95)
                    p99 = self._calculate_percentile(values, 0.99)
                    
                    metrics_lines.append(f"{hist_name}_bucket{{le=\"50\"}} {len([v for v in values if v <= 50])}")
                    metrics_lines.append(f"{hist_name}_bucket{{le=\"100\"}} {len([v for v in values if v <= 100])}")
                    metrics_lines.append(f"{hist_name}_bucket{{le=\"200\"}} {len([v for v in values if v <= 200])}")
                    metrics_lines.append(f"{hist_name}_bucket{{le=\"500\"}} {len([v for v in values if v <= 500])}")
                    metrics_lines.append(f"{hist_name}_bucket{{le=\"1000\"}} {len([v for v in values if v <= 1000])}")
                    metrics_lines.append(f"{hist_name}_bucket{{le=\"+Inf\"}} {len(values)}")
                    metrics_lines.append(f"{hist_name}_sum {sum(values)}")
                    metrics_lines.append(f"{hist_name}_count {len(values)}")
            
            return '\n'.join(metrics_lines)
            
        except Exception as e:
            logger.error(f"Error generating Prometheus metrics: {e}")
            return f"# Error generating metrics: {e}"
    
    def _mask_user_id(self, user_id: Optional[str]) -> Optional[str]:
        """Mask user ID for privacy."""
        if not user_id:
            return None
        return self._hash_value(user_id)[:8]
    
    def _mask_session_id(self, session_id: Optional[str]) -> Optional[str]:
        """Mask session ID for privacy."""
        if not session_id:
            return None
        return self._hash_value(session_id)[:8]
    
    def _mask_family_id(self, family_id: Optional[str]) -> Optional[str]:
        """Mask family ID for privacy."""
        if not family_id:
            return None
        return self._hash_value(family_id)[:8]
    
    def _hash_user_agent(self) -> Optional[str]:
        """Hash user agent for privacy."""
        if not request:
            return None
        user_agent = request.headers.get('User-Agent', '')
        return self._hash_value(user_agent)[:8] if user_agent else None
    
    def _hash_ip_address(self) -> Optional[str]:
        """Hash IP address for privacy."""
        if not request:
            return None
        
        # Get client IP
        ip = request.headers.get('X-Forwarded-For', '').split(',')[0].strip()
        if not ip:
            ip = request.headers.get('X-Real-IP', '')
        if not ip:
            ip = request.remote_addr or ''
        
        return self._hash_value(ip)[:8] if ip else None
    
    def _hash_value(self, value: str) -> str:
        """Hash a value using SHA-256."""
        return hashlib.sha256(value.encode()).hexdigest()
    
    def _mask_additional_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask PII in additional data."""
        if not data:
            return data
        
        masked_data = {}
        for key, value in data.items():
            if isinstance(value, str):
                masked_value = value
                for pii_type, pattern in self.PII_PATTERNS.items():
                    if pii_type == 'email':
                        masked_value = pattern.sub(lambda m: m.group().split('@')[0][:2] + '***@' + m.group().split('@')[1], masked_value)
                    elif pii_type == 'phone':
                        masked_value = pattern.sub('***-***-****', masked_value)
                    elif pii_type == 'ip_address':
                        masked_value = pattern.sub(lambda m: '.'.join(m.group().split('.')[:-1]) + '.***', masked_value)
                    elif pii_type == 'user_id':
                        masked_value = pattern.sub(lambda m: m.group()[:8] + '***', masked_value)
                    else:
                        masked_value = pattern.sub(f'[{pii_type.upper()}]', masked_value)
                masked_data[key] = masked_value
            else:
                masked_data[key] = value
        
        return masked_data
    
    def _log_security_event(self, metric: AuthMetric) -> None:
        """Log security event with PII masking."""
        try:
            # Only log security-relevant events
            security_events = [
                AuthEventType.LOGIN_FAILURE,
                AuthEventType.REFRESH_REPLAY,
                AuthEventType.REFRESH_REVOKED,
                AuthEventType.CSRF_INVALID,
                AuthEventType.TOKEN_VERIFY_FAILURE,
                AuthEventType.FAMILY_REVOKED,
            ]
            
            if metric.event_type not in security_events:
                return
            
            event_data = {
                'event_type': 'security_event',
                'auth_event': metric.event_type.value,
                'timestamp': datetime.fromtimestamp(metric.timestamp, tz=timezone.utc).isoformat(),
                'correlation_id': metric.correlation_id,
                'endpoint': metric.endpoint,
                'method': metric.method,
                'status_code': metric.status_code,
                'failure_reason': metric.failure_reason.value if metric.failure_reason else None,
                'user_id_hash': metric.user_id,
                'session_id_hash': metric.session_id,
                'family_id_hash': metric.family_id,
                'user_agent_hash': metric.user_agent_hash,
                'ip_address_hash': metric.ip_address_hash,
                'response_time_ms': metric.response_time_ms,
            }
            
            # Store security event
            self.security_events.append(event_data)
            
            # Log with appropriate level
            if metric.event_type in [AuthEventType.REFRESH_REPLAY, AuthEventType.FAMILY_REVOKED]:
                logger.warning(f"Security event: {json.dumps(event_data, default=str)}")
            else:
                logger.info(f"Security event: {json.dumps(event_data, default=str)}")
            
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile from list of values."""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile)
        if index >= len(sorted_values):
            index = len(sorted_values) - 1
        
        return sorted_values[index]


# Global metrics instance
_auth_metrics_instance: Optional[AuthMetricsV5] = None


def get_auth_metrics() -> AuthMetricsV5:
    """Get global auth metrics instance."""
    global _auth_metrics_instance
    if _auth_metrics_instance is None:
        _auth_metrics_instance = AuthMetricsV5()
    return _auth_metrics_instance


def record_auth_event(
    event_type: AuthEventType,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    family_id: Optional[str] = None,
    failure_reason: Optional[AuthFailureReason] = None,
    response_time_ms: Optional[float] = None,
    additional_data: Optional[Dict[str, Any]] = None
) -> None:
    """Record authentication event using global metrics instance."""
    metrics = get_auth_metrics()
    metrics.record_auth_event(
        event_type=event_type,
        user_id=user_id,
        session_id=session_id,
        family_id=family_id,
        failure_reason=failure_reason,
        response_time_ms=response_time_ms,
        additional_data=additional_data
    )


def record_performance_metric(
    operation: str,
    duration_ms: float,
    success: bool = True,
    additional_data: Optional[Dict[str, Any]] = None
) -> None:
    """Record performance metric using global metrics instance."""
    metrics = get_auth_metrics()
    metrics.record_performance_metric(
        operation=operation,
        duration_ms=duration_ms,
        success=success,
        additional_data=additional_data
    )


def performance_timer(operation: str):
    """Decorator to time function execution and record metrics."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise
            finally:
                duration_ms = (time.time() - start_time) * 1000
                record_performance_metric(operation, duration_ms, success)
        return wrapper
    return decorator