# !/usr/bin/env python3
"""Monitoring system for API v4 architecture.
This module provides comprehensive monitoring capabilities for the v4 API,
including performance metrics, error tracking, migration status, and health checks.
Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""
import json
import os
import sys
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import psutil

# Add the backend directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from database.database_manager_v4 import DatabaseManager as DatabaseManagerV4
from utils.cache_manager_v4 import CacheManagerV4
from utils.feature_flags_v4 import get_migration_status
from utils.logging_config import get_logger

logger = get_logger(__name__)


class V4MonitoringSystem:
    """Comprehensive monitoring system for v4 API architecture."""

    def __init__(self, metrics_retention_hours: int = 24):
        self.metrics_retention_hours = metrics_retention_hours
        self.metrics = {
            "performance": defaultdict(lambda: deque(maxlen=1000)),
            "errors": defaultdict(lambda: deque(maxlen=1000)),
            "requests": defaultdict(lambda: deque(maxlen=1000)),
            "cache": defaultdict(lambda: deque(maxlen=1000)),
            "database": defaultdict(lambda: deque(maxlen=1000)),
            "memory": deque(maxlen=1000),
            "cpu": deque(maxlen=1000),
            "migration_status": deque(maxlen=100),
        }
        self.alerts = []
        self.monitoring_active = False
        self.monitoring_thread = None
        # Alert thresholds
        self.thresholds = {
            "response_time_ms": 1000,  # 1 second
            "error_rate_percent": 5.0,  # 5%
            "memory_usage_percent": 80.0,  # 80%
            "cpu_usage_percent": 80.0,  # 80%
            "cache_hit_rate_percent": 70.0,  # 70%
            "database_connection_failures": 3,  # 3 failures
        }

    def start_monitoring(self, interval_seconds: int = 30):
        """Start the monitoring system."""
        if self.monitoring_active:
            logger.warning("Monitoring is already active")
            return
        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(
            target=self._monitoring_loop, args=(interval_seconds,), daemon=True
        )
        self.monitoring_thread.start()
        logger.info(f"V4 monitoring system started with {interval_seconds}s interval")

    def stop_monitoring(self):
        """Stop the monitoring system."""
        self.monitoring_active = False
        if self.monitoring_thread and self.monitoring_thread.is_alive():
            self.monitoring_thread.join(timeout=5)
            if self.monitoring_thread.is_alive():
                logger.warning("V4 monitoring thread did not stop gracefully")
        self.monitoring_thread = None
        logger.info("V4 monitoring system stopped")

    def _monitoring_loop(self, interval_seconds: int):
        """Main monitoring loop."""
        while self.monitoring_active:
            try:
                self._collect_metrics()
                self._check_alerts()
                self._cleanup_old_metrics()
                time.sleep(interval_seconds)
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(interval_seconds)

    def _collect_metrics(self):
        """Collect all monitoring metrics."""
        timestamp = datetime.now()
        # System metrics
        self._collect_system_metrics(timestamp)
        # Database metrics
        self._collect_database_metrics(timestamp)
        # Cache metrics
        self._collect_cache_metrics(timestamp)
        # Migration status
        self._collect_migration_metrics(timestamp)

    def _collect_system_metrics(self, timestamp: datetime):
        """Collect system-level metrics."""
        try:
            # Memory usage
            memory = psutil.virtual_memory()
            self.metrics["memory"].append(
                {
                    "timestamp": timestamp.isoformat(),
                    "total_mb": memory.total / 1024 / 1024,
                    "available_mb": memory.available / 1024 / 1024,
                    "used_mb": memory.used / 1024 / 1024,
                    "percent": memory.percent,
                }
            )
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            self.metrics["cpu"].append(
                {"timestamp": timestamp.isoformat(), "percent": cpu_percent}
            )
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")

    def _collect_database_metrics(self, timestamp: datetime):
        """Collect database performance metrics."""
        try:
            db_manager = DatabaseManagerV4()
            # Test connection
            start_time = time.time()
            if db_manager.connect():
                connection_time = (time.time() - start_time) * 1000  # Convert to ms
                self.metrics["database"]["connection_time"].append(
                    {"timestamp": timestamp.isoformat(), "value": connection_time}
                )
                # Test basic query
                start_time = time.time()
                restaurants = db_manager.get_restaurants(limit=10, as_dict=True)
                query_time = (time.time() - start_time) * 1000  # Convert to ms
                self.metrics["database"]["query_time"].append(
                    {
                        "timestamp": timestamp.isoformat(),
                        "value": query_time,
                        "result_count": len(restaurants),
                    }
                )
                db_manager.close()
            else:
                self.metrics["database"]["connection_failures"].append(
                    {
                        "timestamp": timestamp.isoformat(),
                        "error": "Database connection failed",
                    }
                )
        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")
            self.metrics["database"]["connection_failures"].append(
                {"timestamp": timestamp.isoformat(), "error": str(e)}
            )

    def _collect_cache_metrics(self, timestamp: datetime):
        """Collect cache performance metrics."""
        try:
            cache_manager = CacheManagerV4()
            # Test cache operations
            test_key = f"monitoring_test_{timestamp.timestamp()}"
            test_value = {"test": "data", "timestamp": timestamp.isoformat()}
            # Test set operation
            start_time = time.time()
            cache_manager.set(test_key, test_value, ttl=60)
            set_time = (time.time() - start_time) * 1000  # Convert to ms
            self.metrics["cache"]["set_time"].append(
                {"timestamp": timestamp.isoformat(), "value": set_time}
            )
            # Test get operation
            start_time = time.time()
            retrieved_value = cache_manager.get(test_key)
            get_time = (time.time() - start_time) * 1000  # Convert to ms
            self.metrics["cache"]["get_time"].append(
                {
                    "timestamp": timestamp.isoformat(),
                    "value": get_time,
                    "hit": retrieved_value is not None,
                }
            )
            # Clean up test key
            cache_manager.delete(test_key)
        except Exception as e:
            logger.error(f"Error collecting cache metrics: {e}")
            self.metrics["cache"]["errors"].append(
                {"timestamp": timestamp.isoformat(), "error": str(e)}
            )

    def _collect_migration_metrics(self, timestamp: datetime):
        """Collect migration status metrics."""
        try:
            migration_status = get_migration_status()
            self.metrics["migration_status"].append(
                {"timestamp": timestamp.isoformat(), "status": migration_status}
            )
        except Exception as e:
            logger.error(f"Error collecting migration metrics: {e}")

    def record_request_metric(
        self,
        endpoint: str,
        method: str,
        response_time_ms: float,
        status_code: int,
        user_id: Optional[str] = None,
    ):
        """Record a request metric."""
        timestamp = datetime.now()
        self.metrics["requests"][endpoint].append(
            {
                "timestamp": timestamp.isoformat(),
                "method": method,
                "response_time_ms": response_time_ms,
                "status_code": status_code,
                "user_id": user_id,
            }
        )
        # Record performance metric
        self.metrics["performance"][endpoint].append(
            {
                "timestamp": timestamp.isoformat(),
                "response_time_ms": response_time_ms,
                "status_code": status_code,
            }
        )
        # Check for slow requests
        if response_time_ms > self.thresholds["response_time_ms"]:
            self._create_alert(
                "slow_request",
                {
                    "endpoint": endpoint,
                    "response_time_ms": response_time_ms,
                    "threshold_ms": self.thresholds["response_time_ms"],
                },
            )

    def record_error_metric(
        self,
        endpoint: str,
        error_type: str,
        error_message: str,
        user_id: Optional[str] = None,
    ):
        """Record an error metric."""
        timestamp = datetime.now()
        self.metrics["errors"][endpoint].append(
            {
                "timestamp": timestamp.isoformat(),
                "error_type": error_type,
                "error_message": error_message,
                "user_id": user_id,
            }
        )
        # Check error rate
        self._check_error_rate(endpoint)

    def _check_error_rate(self, endpoint: str):
        """Check if error rate exceeds threshold."""
        recent_errors = [
            e
            for e in self.metrics["errors"][endpoint]
            if datetime.fromisoformat(e["timestamp"])
            > datetime.now() - timedelta(minutes=5)
        ]
        recent_requests = [
            r
            for r in self.metrics["requests"][endpoint]
            if datetime.fromisoformat(r["timestamp"])
            > datetime.now() - timedelta(minutes=5)
        ]
        if recent_requests:
            error_rate = (len(recent_errors) / len(recent_requests)) * 100
            if error_rate > self.thresholds["error_rate_percent"]:
                self._create_alert(
                    "high_error_rate",
                    {
                        "endpoint": endpoint,
                        "error_rate_percent": error_rate,
                        "threshold_percent": self.thresholds["error_rate_percent"],
                        "error_count": len(recent_errors),
                        "request_count": len(recent_requests),
                    },
                )

    def _check_alerts(self):
        """Check for alert conditions."""
        timestamp = datetime.now()
        # Check memory usage
        if self.metrics["memory"]:
            latest_memory = self.metrics["memory"][-1]
            if latest_memory["percent"] > self.thresholds["memory_usage_percent"]:
                self._create_alert(
                    "high_memory_usage",
                    {
                        "memory_percent": latest_memory["percent"],
                        "threshold_percent": self.thresholds["memory_usage_percent"],
                    },
                )
        # Check CPU usage
        if self.metrics["cpu"]:
            latest_cpu = self.metrics["cpu"][-1]
            if latest_cpu["percent"] > self.thresholds["cpu_usage_percent"]:
                self._create_alert(
                    "high_cpu_usage",
                    {
                        "cpu_percent": latest_cpu["percent"],
                        "threshold_percent": self.thresholds["cpu_usage_percent"],
                    },
                )
        # Check database connection failures
        recent_failures = [
            f
            for f in self.metrics["database"]["connection_failures"]
            if datetime.fromisoformat(f["timestamp"]) > timestamp - timedelta(minutes=5)
        ]
        if len(recent_failures) >= self.thresholds["database_connection_failures"]:
            self._create_alert(
                "database_connection_issues",
                {
                    "failure_count": len(recent_failures),
                    "threshold": self.thresholds["database_connection_failures"],
                },
            )

    def _create_alert(self, alert_type: str, details: Dict[str, Any]):
        """Create a new alert."""
        alert = {
            "id": f"{alert_type}_{int(time.time())}",
            "type": alert_type,
            "timestamp": datetime.now().isoformat(),
            "details": details,
            "acknowledged": False,
            "resolved": False,
        }
        self.alerts.append(alert)
        logger.warning(f"Alert created: {alert_type}", **details)

    def _cleanup_old_metrics(self):
        """Clean up old metrics based on retention period."""
        cutoff_time = datetime.now() - timedelta(hours=self.metrics_retention_hours)
        for category in self.metrics:
            if isinstance(self.metrics[category], defaultdict):
                for key in list(self.metrics[category].keys()):
                    # Remove old entries from deque
                    while (
                        self.metrics[category][key]
                        and datetime.fromisoformat(
                            self.metrics[category][key][0]["timestamp"]
                        )
                        < cutoff_time
                    ):
                        self.metrics[category][key].popleft()
            else:
                # Handle regular deque
                while (
                    self.metrics[category]
                    and datetime.fromisoformat(self.metrics[category][0]["timestamp"])
                    < cutoff_time
                ):
                    self.metrics[category].popleft()

    def get_metrics_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get a summary of metrics for the specified time period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        summary = {
            "period_hours": hours,
            "timestamp": datetime.now().isoformat(),
            "performance": {},
            "errors": {},
            "system": {},
            "migration": {},
        }
        # Performance summary
        for endpoint, metrics in self.metrics["performance"].items():
            recent_metrics = [
                m
                for m in metrics
                if datetime.fromisoformat(m["timestamp"]) > cutoff_time
            ]
            if recent_metrics:
                response_times = [m["response_time_ms"] for m in recent_metrics]
                summary["performance"][endpoint] = {
                    "request_count": len(recent_metrics),
                    "avg_response_time_ms": sum(response_times) / len(response_times),
                    "min_response_time_ms": min(response_times),
                    "max_response_time_ms": max(response_times),
                    "p95_response_time_ms": sorted(response_times)[
                        int(len(response_times) * 0.95)
                    ],
                }
        # Error summary
        for endpoint, errors in self.metrics["errors"].items():
            recent_errors = [
                e
                for e in errors
                if datetime.fromisoformat(e["timestamp"]) > cutoff_time
            ]
            if recent_errors:
                error_types = defaultdict(int)
                for error in recent_errors:
                    error_types[error["error_type"]] += 1
                summary["errors"][endpoint] = {
                    "total_errors": len(recent_errors),
                    "error_types": dict(error_types),
                }
        # System summary
        if self.metrics["memory"]:
            recent_memory = [
                m
                for m in self.metrics["memory"]
                if datetime.fromisoformat(m["timestamp"]) > cutoff_time
            ]
            if recent_memory:
                memory_percents = [m["percent"] for m in recent_memory]
                summary["system"]["memory"] = {
                    "avg_percent": sum(memory_percents) / len(memory_percents),
                    "max_percent": max(memory_percents),
                }
        if self.metrics["cpu"]:
            recent_cpu = [
                c
                for c in self.metrics["cpu"]
                if datetime.fromisoformat(c["timestamp"]) > cutoff_time
            ]
            if recent_cpu:
                cpu_percents = [c["percent"] for c in recent_cpu]
                summary["system"]["cpu"] = {
                    "avg_percent": sum(cpu_percents) / len(cpu_percents),
                    "max_percent": max(cpu_percents),
                }
        # Migration summary
        if self.metrics["migration_status"]:
            latest_migration = self.metrics["migration_status"][-1]
            summary["migration"] = latest_migration["status"]
        return summary

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all active (unresolved) alerts."""
        return [alert for alert in self.alerts if not alert["resolved"]]

    def acknowledge_alert(self, alert_id: str):
        """Acknowledge an alert."""
        for alert in self.alerts:
            if alert["id"] == alert_id:
                alert["acknowledged"] = True
                logger.info(f"Alert acknowledged: {alert_id}")
                break

    def resolve_alert(self, alert_id: str):
        """Resolve an alert."""
        for alert in self.alerts:
            if alert["id"] == alert_id:
                alert["resolved"] = True
                logger.info(f"Alert resolved: {alert_id}")
                break

    def set_threshold(self, metric: str, value: float):
        """Set a monitoring threshold."""
        if metric in self.thresholds:
            self.thresholds[metric] = value
            logger.info(f"Threshold updated: {metric} = {value}")
        else:
            logger.warning(f"Unknown threshold metric: {metric}")

    def export_metrics(self, filepath: str):
        """Export metrics to a JSON file."""
        export_data = {
            "export_timestamp": datetime.now().isoformat(),
            "metrics_retention_hours": self.metrics_retention_hours,
            "thresholds": self.thresholds,
            "metrics": {
                k: list(v) if isinstance(v, deque) else dict(v)
                for k, v in self.metrics.items()
            },
            "alerts": self.alerts,
        }
        with open(filepath, "w") as f:
            json.dump(export_data, f, indent=2)
        logger.info(f"Metrics exported to {filepath}")


# Global monitoring instance
v4_monitor = V4MonitoringSystem()


def start_v4_monitoring(interval_seconds: int = 30):
    """Start the global v4 monitoring system."""
    v4_monitor.start_monitoring(interval_seconds)


def stop_v4_monitoring():
    """Stop the global v4 monitoring system."""
    v4_monitor.stop_monitoring()


def record_v4_request(
    endpoint: str,
    method: str,
    response_time_ms: float,
    status_code: int,
    user_id: Optional[str] = None,
):
    """Record a v4 API request metric."""
    v4_monitor.record_request_metric(
        endpoint, method, response_time_ms, status_code, user_id
    )


def record_v4_error(
    endpoint: str, error_type: str, error_message: str, user_id: Optional[str] = None
):
    """Record a v4 API error metric."""
    v4_monitor.record_error_metric(endpoint, error_type, error_message, user_id)


def get_v4_metrics_summary(hours: int = 1) -> Dict[str, Any]:
    """Get v4 metrics summary."""
    return v4_monitor.get_metrics_summary(hours)


def get_v4_alerts() -> List[Dict[str, Any]]:
    """Get active v4 alerts."""
    return v4_monitor.get_active_alerts()
