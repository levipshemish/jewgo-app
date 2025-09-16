#!/usr/bin/env python3
"""
Canary Deployment Service

Provides A/B cookie naming, metrics-based validation, and gradual rollout
capabilities for authentication system deployments.
"""

import time
import threading
import hashlib
from typing import Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import random

from utils.logging_config import get_logger
from cache.redis_manager_v5 import get_redis_manager_v5
from monitoring.prometheus_metrics import get_auth_metrics
from monitoring.security_alerts import get_security_alert_manager, AlertSeverity

logger = get_logger(__name__)


class DeploymentStage(Enum):
    """Deployment stages."""
    DISABLED = "disabled"
    CANARY = "canary"
    ROLLOUT = "rollout"
    FULL = "full"
    ROLLBACK = "rollback"


class CanaryStrategy(Enum):
    """Canary deployment strategies."""
    PERCENTAGE = "percentage"  # Percentage-based rollout
    USER_HASH = "user_hash"    # User ID hash-based
    COOKIE_VERSION = "cookie_version"  # Cookie version-based
    FEATURE_FLAG = "feature_flag"  # Feature flag-based


@dataclass
class CanaryConfig:
    """Canary deployment configuration."""
    name: str
    description: str
    strategy: CanaryStrategy
    stage: DeploymentStage
    percentage: float = 0.0  # 0.0 to 1.0
    cookie_version: str = "v4"  # Current cookie version
    new_cookie_version: str = "v5"  # New cookie version
    feature_flag: str = None
    metrics_thresholds: Dict[str, float] = None
    rollback_thresholds: Dict[str, float] = None
    duration_hours: int = 72  # 72 hours default
    enabled: bool = True
    created_at: datetime = None
    started_at: datetime = None
    completed_at: datetime = None


@dataclass
class CanaryMetrics:
    """Canary deployment metrics."""
    config_name: str
    timestamp: datetime
    stage: DeploymentStage
    percentage: float
    total_requests: int
    success_rate: float
    error_rate: float
    latency_p95: float
    latency_p99: float
    auth_failure_rate: float
    csrf_failure_rate: float
    session_creation_rate: float
    security_events: int
    rollback_triggered: bool = False


class CanaryDeploymentService:
    """Canary deployment service for authentication system."""
    
    def __init__(self):
        """Initialize canary deployment service."""
        self.redis_manager = get_redis_manager_v5()
        self.auth_metrics = get_auth_metrics()
        self.alert_manager = get_security_alert_manager()
        
        # Canary configurations
        self.canary_configs: Dict[str, CanaryConfig] = {}
        
        # Service state
        self._running = False
        self._thread = None
        self._check_interval = 300  # 5 minutes
        
        # Metrics collection
        self._metrics_buffer: List[CanaryMetrics] = []
        self._metrics_lock = threading.Lock()
        
        # Load default configurations
        self._load_default_configs()
        
        logger.info("Canary deployment service initialized")
    
    def _load_default_configs(self) -> None:
        """Load default canary configurations."""
        default_configs = [
            CanaryConfig(
                name="auth_security_hardening",
                description="Authentication security hardening rollout",
                strategy=CanaryStrategy.PERCENTAGE,
                stage=DeploymentStage.DISABLED,
                percentage=0.0,
                cookie_version="v4",
                new_cookie_version="v5",
                metrics_thresholds={
                    "error_rate": 0.05,  # 5% error rate threshold
                    "latency_p95": 0.2,  # 200ms p95 latency threshold
                    "auth_failure_rate": 0.1,  # 10% auth failure rate
                    "csrf_failure_rate": 0.05,  # 5% CSRF failure rate
                    "security_events": 10  # 10 security events per hour
                },
                rollback_thresholds={
                    "error_rate": 0.1,  # 10% error rate triggers rollback
                    "latency_p95": 0.5,  # 500ms p95 latency triggers rollback
                    "auth_failure_rate": 0.2,  # 20% auth failure rate triggers rollback
                    "csrf_failure_rate": 0.1,  # 10% CSRF failure rate triggers rollback
                    "security_events": 50  # 50 security events per hour triggers rollback
                },
                duration_hours=72,
                created_at=datetime.utcnow()
            )
        ]
        
        for config in default_configs:
            self.canary_configs[config.name] = config
        
        logger.info(f"Loaded {len(default_configs)} default canary configurations")
    
    def start_canary_monitoring(self, check_interval: int = 300) -> None:
        """Start canary deployment monitoring."""
        if self._running:
            logger.warning("Canary monitoring is already running")
            return
        
        self._check_interval = check_interval
        self._running = True
        self._thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Canary monitoring started with {check_interval}s interval")
    
    def stop_canary_monitoring(self) -> None:
        """Stop canary deployment monitoring."""
        if not self._running:
            return
        
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=10)
        
        logger.info("Canary monitoring stopped")
    
    def _monitoring_loop(self) -> None:
        """Main monitoring loop."""
        while self._running:
            try:
                self._check_canary_deployments()
                self._collect_metrics()
                self._cleanup_old_metrics()
                time.sleep(self._check_interval)
            except Exception as e:
                logger.error(f"Error in canary monitoring loop: {e}")
                time.sleep(self._check_interval)
    
    def _check_canary_deployments(self) -> None:
        """Check all active canary deployments."""
        for config_name, config in self.canary_configs.items():
            if not config.enabled or config.stage == DeploymentStage.DISABLED:
                continue
            
            try:
                self._evaluate_canary_config(config)
            except Exception as e:
                logger.error(f"Error evaluating canary config {config_name}: {e}")
    
    def _evaluate_canary_config(self, config: CanaryConfig) -> None:
        """Evaluate a canary configuration."""
        # Collect current metrics
        metrics = self._collect_canary_metrics(config)
        
        # Check rollback thresholds
        if self._should_rollback(config, metrics):
            self._trigger_rollback(config, metrics)
            return
        
        # Check if canary should progress
        if self._should_progress(config, metrics):
            self._progress_canary(config, metrics)
        
        # Check if canary should complete
        if self._should_complete(config, metrics):
            self._complete_canary(config, metrics)
    
    def _collect_canary_metrics(self, config: CanaryConfig) -> CanaryMetrics:
        """Collect metrics for a canary configuration."""
        # This would typically query actual metrics from Prometheus or metrics store
        # For now, we'll simulate metrics collection
        
        current_time = datetime.utcnow()
        
        # Simulate metrics based on deployment stage
        if config.stage == DeploymentStage.CANARY:
            # Canary stage - simulate some metrics
            total_requests = random.randint(1000, 5000)
            success_rate = 0.95 + random.uniform(-0.05, 0.05)  # 95% ± 5%
            error_rate = 1.0 - success_rate
            latency_p95 = 0.15 + random.uniform(-0.05, 0.05)  # 150ms ± 50ms
            latency_p99 = latency_p95 * 1.5
            auth_failure_rate = 0.05 + random.uniform(-0.02, 0.02)  # 5% ± 2%
            csrf_failure_rate = 0.02 + random.uniform(-0.01, 0.01)  # 2% ± 1%
            session_creation_rate = 0.98 + random.uniform(-0.02, 0.02)  # 98% ± 2%
            security_events = random.randint(0, 5)
        else:
            # Full deployment - simulate stable metrics
            total_requests = random.randint(5000, 10000)
            success_rate = 0.98 + random.uniform(-0.02, 0.02)  # 98% ± 2%
            error_rate = 1.0 - success_rate
            latency_p95 = 0.12 + random.uniform(-0.03, 0.03)  # 120ms ± 30ms
            latency_p99 = latency_p95 * 1.3
            auth_failure_rate = 0.03 + random.uniform(-0.01, 0.01)  # 3% ± 1%
            csrf_failure_rate = 0.01 + random.uniform(-0.005, 0.005)  # 1% ± 0.5%
            session_creation_rate = 0.99 + random.uniform(-0.01, 0.01)  # 99% ± 1%
            security_events = random.randint(0, 2)
        
        metrics = CanaryMetrics(
            config_name=config.name,
            timestamp=current_time,
            stage=config.stage,
            percentage=config.percentage,
            total_requests=total_requests,
            success_rate=success_rate,
            error_rate=error_rate,
            latency_p95=latency_p95,
            latency_p99=latency_p99,
            auth_failure_rate=auth_failure_rate,
            csrf_failure_rate=csrf_failure_rate,
            session_creation_rate=session_creation_rate,
            security_events=security_events
        )
        
        # Store metrics
        with self._metrics_lock:
            self._metrics_buffer.append(metrics)
        
        return metrics
    
    def _should_rollback(self, config: CanaryConfig, metrics: CanaryMetrics) -> bool:
        """Check if canary should be rolled back."""
        if not config.rollback_thresholds:
            return False
        
        # Check each rollback threshold
        for metric_name, threshold in config.rollback_thresholds.items():
            current_value = getattr(metrics, metric_name, 0)
            
            if current_value > threshold:
                logger.warning(f"Rollback threshold exceeded for {config.name}: {metric_name} = {current_value} > {threshold}")
                return True
        
        return False
    
    def _should_progress(self, config: CanaryConfig, metrics: CanaryMetrics) -> bool:
        """Check if canary should progress to next stage."""
        if config.stage != DeploymentStage.CANARY:
            return False
        
        # Check if metrics are within acceptable thresholds
        if not config.metrics_thresholds:
            return True
        
        for metric_name, threshold in config.metrics_thresholds.items():
            current_value = getattr(metrics, metric_name, 0)
            
            if current_value > threshold:
                logger.info(f"Canary {config.name} not progressing: {metric_name} = {current_value} > {threshold}")
                return False
        
        # Check if enough time has passed
        if config.started_at:
            time_elapsed = datetime.utcnow() - config.started_at
            min_duration = timedelta(hours=config.duration_hours * 0.25)  # 25% of total duration
            
            if time_elapsed < min_duration:
                logger.info(f"Canary {config.name} not progressing: insufficient time elapsed")
                return False
        
        return True
    
    def _should_complete(self, config: CanaryConfig, metrics: CanaryMetrics) -> bool:
        """Check if canary should complete."""
        if config.stage != DeploymentStage.ROLLOUT:
            return False
        
        # Check if metrics are stable
        if not config.metrics_thresholds:
            return True
        
        for metric_name, threshold in config.metrics_thresholds.items():
            current_value = getattr(metrics, metric_name, 0)
            
            if current_value > threshold:
                logger.info(f"Canary {config.name} not completing: {metric_name} = {current_value} > {threshold}")
                return False
        
        # Check if enough time has passed
        if config.started_at:
            time_elapsed = datetime.utcnow() - config.started_at
            min_duration = timedelta(hours=config.duration_hours)
            
            if time_elapsed < min_duration:
                logger.info(f"Canary {config.name} not completing: insufficient time elapsed")
                return False
        
        return True
    
    def _trigger_rollback(self, config: CanaryConfig, metrics: CanaryMetrics) -> None:
        """Trigger a rollback for a canary deployment."""
        logger.critical(f"Triggering rollback for canary {config.name}")
        
        # Update configuration
        config.stage = DeploymentStage.ROLLBACK
        config.percentage = 0.0
        
        # Trigger security alert
        self.alert_manager.trigger_manual_alert(
            title=f"Canary Rollback: {config.name}",
            description=f"Canary deployment {config.name} has been rolled back due to threshold violations",
            severity=AlertSeverity.CRITICAL,
            metric_name="canary_rollback",
            current_value=1.0
        )
        
        # Record rollback event
        metrics.rollback_triggered = True
        with self._metrics_lock:
            self._metrics_buffer.append(metrics)
        
        logger.info(f"Rollback completed for canary {config.name}")
    
    def _progress_canary(self, config: CanaryConfig, metrics: CanaryMetrics) -> None:
        """Progress canary to next stage."""
        if config.stage == DeploymentStage.CANARY:
            # Progress to rollout stage
            config.stage = DeploymentStage.ROLLOUT
            config.percentage = min(config.percentage + 0.25, 1.0)  # Increase by 25%
            
            logger.info(f"Canary {config.name} progressed to rollout stage ({config.percentage:.1%})")
        
        elif config.stage == DeploymentStage.ROLLOUT:
            # Progress to full deployment
            config.stage = DeploymentStage.FULL
            config.percentage = 1.0
            
            logger.info(f"Canary {config.name} progressed to full deployment")
    
    def _complete_canary(self, config: CanaryConfig, metrics: CanaryMetrics) -> None:
        """Complete canary deployment."""
        config.stage = DeploymentStage.FULL
        config.percentage = 1.0
        config.completed_at = datetime.utcnow()
        
        logger.info(f"Canary {config.name} completed successfully")
        
        # Trigger completion alert
        self.alert_manager.trigger_manual_alert(
            title=f"Canary Completed: {config.name}",
            description=f"Canary deployment {config.name} has completed successfully",
            severity=AlertSeverity.INFO,
            metric_name="canary_completion",
            current_value=1.0
        )
    
    def _collect_metrics(self) -> None:
        """Collect and store metrics."""
        # This would typically collect actual metrics from various sources
        # For now, we'll just log that we're collecting
        logger.debug("Collecting canary metrics")
    
    def _cleanup_old_metrics(self) -> None:
        """Clean up old metrics data."""
        cutoff_time = datetime.utcnow() - timedelta(days=7)  # Keep for 7 days
        
        with self._metrics_lock:
            self._metrics_buffer = [
                metrics for metrics in self._metrics_buffer
                if metrics.timestamp > cutoff_time
            ]
    
    def start_canary_deployment(self, config_name: str, percentage: float = 0.05) -> bool:
        """Start a canary deployment."""
        if config_name not in self.canary_configs:
            logger.error(f"Canary configuration {config_name} not found")
            return False
        
        config = self.canary_configs[config_name]
        
        if config.stage != DeploymentStage.DISABLED:
            logger.error(f"Canary {config_name} is already active")
            return False
        
        # Start canary deployment
        config.stage = DeploymentStage.CANARY
        config.percentage = percentage
        config.started_at = datetime.utcnow()
        config.completed_at = None
        
        logger.info(f"Started canary deployment {config_name} at {percentage:.1%}")
        
        # Trigger start alert
        self.alert_manager.trigger_manual_alert(
            title=f"Canary Started: {config_name}",
            description=f"Canary deployment {config_name} has started at {percentage:.1%}",
            severity=AlertSeverity.INFO,
            metric_name="canary_start",
            current_value=percentage
        )
        
        return True
    
    def stop_canary_deployment(self, config_name: str) -> bool:
        """Stop a canary deployment."""
        if config_name not in self.canary_configs:
            logger.error(f"Canary configuration {config_name} not found")
            return False
        
        config = self.canary_configs[config_name]
        
        if config.stage == DeploymentStage.DISABLED:
            logger.error(f"Canary {config_name} is not active")
            return False
        
        # Stop canary deployment
        config.stage = DeploymentStage.DISABLED
        config.percentage = 0.0
        config.completed_at = datetime.utcnow()
        
        logger.info(f"Stopped canary deployment {config_name}")
        
        # Trigger stop alert
        self.alert_manager.trigger_manual_alert(
            title=f"Canary Stopped: {config_name}",
            description=f"Canary deployment {config_name} has been stopped",
            severity=AlertSeverity.WARNING,
            metric_name="canary_stop",
            current_value=0.0
        )
        
        return True
    
    def should_use_new_version(self, user_id: str = None, cookie_version: str = None) -> bool:
        """Determine if a request should use the new version."""
        # Check if any canary deployments are active
        active_canaries = [
            config for config in self.canary_configs.values()
            if config.enabled and config.stage in [DeploymentStage.CANARY, DeploymentStage.ROLLOUT, DeploymentStage.FULL]
        ]
        
        if not active_canaries:
            return False
        
        # Use the first active canary (in practice, you might have multiple)
        config = active_canaries[0]
        
        if config.stage == DeploymentStage.FULL:
            return True
        
        if config.strategy == CanaryStrategy.PERCENTAGE:
            # Percentage-based rollout
            return random.random() < config.percentage
        
        elif config.strategy == CanaryStrategy.USER_HASH:
            # User ID hash-based rollout
            if not user_id:
                return False
            
            user_hash = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
            return (user_hash % 100) < (config.percentage * 100)
        
        elif config.strategy == CanaryStrategy.COOKIE_VERSION:
            # Cookie version-based rollout
            if not cookie_version:
                return False
            
            return cookie_version == config.new_cookie_version
        
        elif config.strategy == CanaryStrategy.FEATURE_FLAG:
            # Feature flag-based rollout
            if not config.feature_flag:
                return False
            
            # This would typically check a feature flag service
            return random.random() < config.percentage
        
        return False
    
    def get_canary_status(self, config_name: str = None) -> Dict[str, Any]:
        """Get canary deployment status."""
        if config_name:
            if config_name not in self.canary_configs:
                return {'error': f'Configuration {config_name} not found'}
            
            config = self.canary_configs[config_name]
            return {
                'name': config.name,
                'stage': config.stage.value,
                'percentage': config.percentage,
                'enabled': config.enabled,
                'started_at': config.started_at.isoformat() if config.started_at else None,
                'completed_at': config.completed_at.isoformat() if config.completed_at else None
            }
        else:
            # Return all configurations
            return {
                config_name: {
                    'name': config.name,
                    'stage': config.stage.value,
                    'percentage': config.percentage,
                    'enabled': config.enabled,
                    'started_at': config.started_at.isoformat() if config.started_at else None,
                    'completed_at': config.completed_at.isoformat() if config.completed_at else None
                }
                for config_name, config in self.canary_configs.items()
            }
    
    def get_canary_metrics(self, config_name: str = None, hours: int = 24) -> List[Dict[str, Any]]:
        """Get canary deployment metrics."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        with self._metrics_lock:
            filtered_metrics = [
                metrics for metrics in self._metrics_buffer
                if metrics.timestamp > cutoff_time and (config_name is None or metrics.config_name == config_name)
            ]
        
        return [
            {
                'config_name': metrics.config_name,
                'timestamp': metrics.timestamp.isoformat(),
                'stage': metrics.stage.value,
                'percentage': metrics.percentage,
                'total_requests': metrics.total_requests,
                'success_rate': metrics.success_rate,
                'error_rate': metrics.error_rate,
                'latency_p95': metrics.latency_p95,
                'latency_p99': metrics.latency_p99,
                'auth_failure_rate': metrics.auth_failure_rate,
                'csrf_failure_rate': metrics.csrf_failure_rate,
                'session_creation_rate': metrics.session_creation_rate,
                'security_events': metrics.security_events,
                'rollback_triggered': metrics.rollback_triggered
            }
            for metrics in filtered_metrics
        ]


# Global instance
canary_deployment_service = CanaryDeploymentService()


def get_canary_deployment_service() -> CanaryDeploymentService:
    """Get the global canary deployment service instance."""
    return canary_deployment_service


def start_canary_monitoring(check_interval: int = 300) -> None:
    """Start canary deployment monitoring."""
    try:
        canary_deployment_service.start_canary_monitoring(check_interval)
        logger.info("Canary monitoring started successfully")
    except Exception as e:
        logger.error(f"Failed to start canary monitoring: {e}")
        raise


def stop_canary_monitoring() -> None:
    """Stop canary deployment monitoring."""
    try:
        canary_deployment_service.stop_canary_monitoring()
        logger.info("Canary monitoring stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping canary monitoring: {e}")


def should_use_new_auth_version(user_id: str = None, cookie_version: str = None) -> bool:
    """Determine if a request should use the new authentication version."""
    return canary_deployment_service.should_use_new_version(user_id, cookie_version)
