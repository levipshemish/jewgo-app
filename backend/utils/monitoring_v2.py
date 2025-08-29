"""
Enhanced Monitoring Utilities v2

This module provides monitoring and alerting capabilities for the new
error handling and timeout patterns implemented across the application.
"""

import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Global monitoring state
_monitoring_data = {
    "timeouts": defaultdict(lambda: deque(maxlen=1000)),
    "errors": defaultdict(lambda: deque(maxlen=1000)),
    "retries": defaultdict(lambda: deque(maxlen=1000)),
    "api_calls": defaultdict(lambda: deque(maxlen=1000)),
}


class MonitoringManager:
    """Manages monitoring and alerting for application metrics."""
    
    def __init__(self):
        self.alert_thresholds = {
            "timeout_rate": 0.1,  # 10% timeout rate
            "error_rate": 0.05,   # 5% error rate
            "retry_rate": 0.2,    # 20% retry rate
            "api_latency_p95": 5.0,  # 5 seconds P95 latency
        }
    
    def record_timeout(self, operation: str, duration: float, context: Optional[Dict] = None):
        """Record a timeout event."""
        timestamp = datetime.utcnow()
        event = {
            "timestamp": timestamp,
            "operation": operation,
            "duration": duration,
            "context": context or {},
        }
        _monitoring_data["timeouts"][operation].append(event)
        
        # Check for alert conditions
        self._check_timeout_alerts(operation)
        
        logger.warning(
            f"Timeout recorded for {operation}",
            extra={
                "operation": operation,
                "duration": duration,
                "context": context,
                "event_type": "timeout",
            }
        )
    
    def record_error(self, operation: str, error_type: str, error_message: str, context: Optional[Dict] = None):
        """Record an error event."""
        timestamp = datetime.utcnow()
        event = {
            "timestamp": timestamp,
            "operation": operation,
            "error_type": error_type,
            "error_message": error_message,
            "context": context or {},
        }
        _monitoring_data["errors"][operation].append(event)
        
        # Check for alert conditions
        self._check_error_alerts(operation)
        
        logger.error(
            f"Error recorded for {operation}: {error_type}",
            extra={
                "operation": operation,
                "error_type": error_type,
                "error_message": error_message,
                "context": context,
                "event_type": "error",
            }
        )
    
    def record_retry(self, operation: str, attempt: int, reason: str, context: Optional[Dict] = None):
        """Record a retry event."""
        timestamp = datetime.utcnow()
        event = {
            "timestamp": timestamp,
            "operation": operation,
            "attempt": attempt,
            "reason": reason,
            "context": context or {},
        }
        _monitoring_data["retries"][operation].append(event)
        
        logger.info(
            f"Retry recorded for {operation} (attempt {attempt})",
            extra={
                "operation": operation,
                "attempt": attempt,
                "reason": reason,
                "context": context,
                "event_type": "retry",
            }
        )
    
    def record_api_call(self, operation: str, duration: float, status_code: int, context: Optional[Dict] = None):
        """Record an API call event."""
        timestamp = datetime.utcnow()
        event = {
            "timestamp": timestamp,
            "operation": operation,
            "duration": duration,
            "status_code": status_code,
            "context": context or {},
        }
        _monitoring_data["api_calls"][operation].append(event)
        
        # Check for alert conditions
        self._check_latency_alerts(operation)
        
        logger.info(
            f"API call recorded for {operation}",
            extra={
                "operation": operation,
                "duration": duration,
                "status_code": status_code,
                "context": context,
                "event_type": "api_call",
            }
        )
    
    def _check_timeout_alerts(self, operation: str):
        """Check for timeout alert conditions."""
        timeouts = _monitoring_data["timeouts"][operation]
        api_calls = _monitoring_data["api_calls"][operation]
        
        if len(api_calls) < 10:  # Need minimum data points
            return
        
        # Calculate timeout rate
        timeout_count = len(timeouts)
        total_calls = len(api_calls)
        timeout_rate = timeout_count / total_calls
        
        if timeout_rate > self.alert_thresholds["timeout_rate"]:
            logger.warning(
                f"High timeout rate detected for {operation}: {timeout_rate:.2%}",
                extra={
                    "operation": operation,
                    "timeout_rate": timeout_rate,
                    "threshold": self.alert_thresholds["timeout_rate"],
                    "alert_type": "high_timeout_rate",
                }
            )
    
    def _check_error_alerts(self, operation: str):
        """Check for error alert conditions."""
        errors = _monitoring_data["errors"][operation]
        api_calls = _monitoring_data["api_calls"][operation]
        
        if len(api_calls) < 10:  # Need minimum data points
            return
        
        # Calculate error rate
        error_count = len(errors)
        total_calls = len(api_calls)
        error_rate = error_count / total_calls
        
        if error_rate > self.alert_thresholds["error_rate"]:
            logger.warning(
                f"High error rate detected for {operation}: {error_rate:.2%}",
                extra={
                    "operation": operation,
                    "error_rate": error_rate,
                    "threshold": self.alert_thresholds["error_rate"],
                    "alert_type": "high_error_rate",
                }
            )
    
    def _check_latency_alerts(self, operation: str):
        """Check for latency alert conditions."""
        api_calls = _monitoring_data["api_calls"][operation]
        
        if len(api_calls) < 10:  # Need minimum data points
            return
        
        # Calculate P95 latency
        durations = [call["duration"] for call in api_calls]
        durations.sort()
        p95_index = int(len(durations) * 0.95)
        p95_latency = durations[p95_index]
        
        if p95_latency > self.alert_thresholds["api_latency_p95"]:
            logger.warning(
                f"High P95 latency detected for {operation}: {p95_latency:.2f}s",
                extra={
                    "operation": operation,
                    "p95_latency": p95_latency,
                    "threshold": self.alert_thresholds["api_latency_p95"],
                    "alert_type": "high_latency",
                }
            )
    
    def get_metrics(self, operation: Optional[str] = None, time_window: Optional[timedelta] = None) -> Dict[str, Any]:
        """Get monitoring metrics for specified operation and time window."""
        if time_window is None:
            time_window = timedelta(hours=1)
        
        cutoff_time = datetime.utcnow() - time_window
        
        metrics = {
            "timeouts": {},
            "errors": {},
            "retries": {},
            "api_calls": {},
        }
        
        for metric_type in metrics:
            if operation:
                operations = [operation]
            else:
                operations = list(_monitoring_data[metric_type].keys())
            
            for op in operations:
                events = _monitoring_data[metric_type][op]
                recent_events = [
                    event for event in events 
                    if event["timestamp"] >= cutoff_time
                ]
                
                if metric_type == "api_calls":
                    metrics[metric_type][op] = {
                        "count": len(recent_events),
                        "avg_duration": sum(e["duration"] for e in recent_events) / len(recent_events) if recent_events else 0,
                        "status_codes": defaultdict(int),
                    }
                    for event in recent_events:
                        metrics[metric_type][op]["status_codes"][event["status_code"]] += 1
                else:
                    metrics[metric_type][op] = {
                        "count": len(recent_events),
                        "recent_events": recent_events[-10:],  # Last 10 events
                    }
        
        return metrics
    
    def clear_old_data(self, max_age: timedelta = timedelta(days=7)):
        """Clear old monitoring data."""
        cutoff_time = datetime.utcnow() - max_age
        
        for metric_type in _monitoring_data:
            for operation in list(_monitoring_data[metric_type].keys()):
                events = _monitoring_data[metric_type][operation]
                # Remove old events
                while events and events[0]["timestamp"] < cutoff_time:
                    events.popleft()
                
                # Remove empty operations
                if not events:
                    del _monitoring_data[metric_type][operation]


# Global monitoring manager instance
monitoring_manager = MonitoringManager()


def record_timeout(operation: str, duration: float, context: Optional[Dict] = None):
    """Record a timeout event."""
    monitoring_manager.record_timeout(operation, duration, context)


def record_error(operation: str, error_type: str, error_message: str, context: Optional[Dict] = None):
    """Record an error event."""
    monitoring_manager.record_error(operation, error_type, error_message, context)


def record_retry(operation: str, attempt: int, reason: str, context: Optional[Dict] = None):
    """Record a retry event."""
    monitoring_manager.record_retry(operation, attempt, reason, context)


def record_api_call(operation: str, duration: float, status_code: int, context: Optional[Dict] = None):
    """Record an API call event."""
    monitoring_manager.record_api_call(operation, duration, status_code, context)


def get_metrics(operation: Optional[str] = None, time_window: Optional[timedelta] = None) -> Dict[str, Any]:
    """Get monitoring metrics."""
    return monitoring_manager.get_metrics(operation, time_window)


def clear_old_data(max_age: timedelta = timedelta(days=7)):
    """Clear old monitoring data."""
    monitoring_manager.clear_old_data(max_age)
