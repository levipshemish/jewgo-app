#!/usr/bin/env python3
"""
Security Alerting System

Provides comprehensive security alerting with Prometheus rules,
incident tracking, and automated response procedures.
"""

import os
import json
import time
import threading
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

from utils.logging_config import get_logger
from monitoring.prometheus_metrics import get_auth_metrics, AuthEvent

logger = get_logger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertStatus(Enum):
    """Alert status."""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


@dataclass
class SecurityAlert:
    """Security alert data structure."""
    id: str
    title: str
    description: str
    severity: AlertSeverity
    status: AlertStatus
    source: str
    metric_name: str
    threshold_value: float
    current_value: float
    timestamp: datetime
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary."""
        data = asdict(self)
        data['severity'] = self.severity.value
        data['status'] = self.status.value
        data['timestamp'] = self.timestamp.isoformat()
        if self.acknowledged_at:
            data['acknowledged_at'] = self.acknowledged_at.isoformat()
        if self.resolved_at:
            data['resolved_at'] = self.resolved_at.isoformat()
        return data


@dataclass
class AlertRule:
    """Alert rule configuration."""
    name: str
    description: str
    metric_name: str
    threshold: float
    comparison: str  # 'gt', 'lt', 'eq', 'gte', 'lte'
    severity: AlertSeverity
    duration: int  # seconds
    enabled: bool = True
    tags: Dict[str, str] = None
    
    def evaluate(self, current_value: float) -> bool:
        """Evaluate if the rule should trigger an alert."""
        if not self.enabled:
            return False
        
        if self.comparison == 'gt':
            return current_value > self.threshold
        elif self.comparison == 'lt':
            return current_value < self.threshold
        elif self.comparison == 'eq':
            return current_value == self.threshold
        elif self.comparison == 'gte':
            return current_value >= self.threshold
        elif self.comparison == 'lte':
            return current_value <= self.threshold
        
        return False


class SecurityAlertManager:
    """Manages security alerts and notifications."""
    
    def __init__(self):
        """Initialize security alert manager."""
        self.auth_metrics = get_auth_metrics()
        self.alerts: Dict[str, SecurityAlert] = {}
        self.alert_rules: List[AlertRule] = []
        self.notification_handlers: List[Callable[[SecurityAlert], None]] = []
        self._lock = threading.Lock()
        self._running = False
        self._thread = None
        self._check_interval = 60  # seconds
        
        # Load default alert rules
        self._load_default_rules()
        
        # Setup notification handlers
        self._setup_notification_handlers()
        
        logger.info("Security alert manager initialized")
    
    def _load_default_rules(self) -> None:
        """Load default security alert rules."""
        default_rules = [
            # High authentication failure rate
            AlertRule(
                name="high_auth_failure_rate",
                description="High authentication failure rate detected",
                metric_name="auth_login_attempts_total",
                threshold=0.1,  # 10% failure rate
                comparison="gt",
                severity=AlertSeverity.WARNING,
                duration=300,  # 5 minutes
                tags={"result": "failure"}
            ),
            
            # CSRF attack detection
            AlertRule(
                name="csrf_attack_detected",
                description="Potential CSRF attack detected",
                metric_name="auth_csrf_validations_total",
                threshold=0.05,  # 5% invalid rate
                comparison="gt",
                severity=AlertSeverity.CRITICAL,
                duration=120,  # 2 minutes
                tags={"result": "invalid"}
            ),
            
            # Token verification latency
            AlertRule(
                name="token_verification_latency_high",
                description="Token verification latency is high",
                metric_name="auth_token_verification_duration_seconds",
                threshold=0.2,  # 200ms
                comparison="gt",
                severity=AlertSeverity.WARNING,
                duration=300,  # 5 minutes
                tags={"quantile": "0.95"}
            ),
            
            # High rate limit hits
            AlertRule(
                name="high_rate_limit_hits",
                description="High number of rate limit hits",
                metric_name="auth_rate_limit_hits_total",
                threshold=100,  # 100 hits per hour
                comparison="gt",
                severity=AlertSeverity.WARNING,
                duration=3600,  # 1 hour
                tags={}
            ),
            
            # Session replay attacks
            AlertRule(
                name="session_replay_attacks",
                description="Session replay attacks detected",
                metric_name="auth_token_refreshes_total",
                threshold=0.01,  # 1% replay rate
                comparison="gt",
                severity=AlertSeverity.CRITICAL,
                duration=300,  # 5 minutes
                tags={"result": "replay"}
            ),
            
            # Abuse control triggers
            AlertRule(
                name="abuse_control_triggered",
                description="Abuse control mechanisms triggered",
                metric_name="auth_abuse_control_checks_total",
                threshold=50,  # 50 checks per hour
                comparison="gt",
                severity=AlertSeverity.WARNING,
                duration=3600,  # 1 hour
                tags={"result": "blocked"}
            ),
            
            # CAPTCHA failures
            AlertRule(
                name="captcha_failure_rate_high",
                description="High CAPTCHA failure rate",
                metric_name="auth_captcha_verifications_total",
                threshold=0.3,  # 30% failure rate
                comparison="gt",
                severity=AlertSeverity.WARNING,
                duration=600,  # 10 minutes
                tags={"result": "failure"}
            ),
            
            # Security events
            AlertRule(
                name="security_events_critical",
                description="Critical security events detected",
                metric_name="auth_security_events_total",
                threshold=10,  # 10 events per hour
                comparison="gt",
                severity=AlertSeverity.EMERGENCY,
                duration=3600,  # 1 hour
                tags={"severity": "critical"}
            )
        ]
        
        self.alert_rules.extend(default_rules)
        logger.info(f"Loaded {len(default_rules)} default alert rules")
    
    def _setup_notification_handlers(self) -> None:
        """Setup notification handlers."""
        # Email notifications
        if os.getenv('ALERT_EMAIL_ENABLED', 'false').lower() == 'true':
            self.notification_handlers.append(self._send_email_notification)
        
        # Slack notifications
        if os.getenv('ALERT_SLACK_ENABLED', 'false').lower() == 'true':
            self.notification_handlers.append(self._send_slack_notification)
        
        # Webhook notifications
        if os.getenv('ALERT_WEBHOOK_URL'):
            self.notification_handlers.append(self._send_webhook_notification)
        
        # Log notifications (always enabled)
        self.notification_handlers.append(self._log_notification)
        
        logger.info(f"Setup {len(self.notification_handlers)} notification handlers")
    
    def start_monitoring(self, check_interval: int = 60) -> None:
        """Start the alert monitoring thread."""
        if self._running:
            logger.warning("Alert monitoring is already running")
            return
        
        self._check_interval = check_interval
        self._running = True
        self._thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Alert monitoring started with {check_interval}s interval")
    
    def stop_monitoring(self) -> None:
        """Stop the alert monitoring thread."""
        if not self._running:
            return
        
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        
        logger.info("Alert monitoring stopped")
    
    def _monitoring_loop(self) -> None:
        """Main monitoring loop."""
        while self._running:
            try:
                self._check_alert_rules()
                self._cleanup_old_alerts()
                time.sleep(self._check_interval)
            except Exception as e:
                logger.error(f"Error in alert monitoring loop: {e}")
                time.sleep(self._check_interval)
    
    def _check_alert_rules(self) -> None:
        """Check all alert rules."""
        try:
            # This would typically query Prometheus or metrics store
            # For now, we'll simulate some checks
            current_time = datetime.utcnow()
            
            for rule in self.alert_rules:
                if not rule.enabled:
                    continue
                
                # Simulate metric values (in real implementation, query actual metrics)
                current_value = self._get_metric_value(rule.metric_name, rule.tags)
                
                if rule.evaluate(current_value):
                    self._trigger_alert(rule, current_value, current_time)
                else:
                    self._resolve_alert_if_exists(rule.name)
        
        except Exception as e:
            logger.error(f"Error checking alert rules: {e}")
    
    def _get_metric_value(self, metric_name: str, tags: Dict[str, str]) -> float:
        """Get current metric value (simulated)."""
        # In a real implementation, this would query Prometheus or metrics store
        # For now, return simulated values based on metric name
        
        if "failure" in metric_name:
            return 0.05  # 5% failure rate
        elif "latency" in metric_name:
            return 0.15  # 150ms latency
        elif "rate_limit" in metric_name:
            return 10  # 10 rate limit hits
        elif "replay" in metric_name:
            return 0.005  # 0.5% replay rate
        elif "abuse" in metric_name:
            return 5  # 5 abuse checks
        elif "captcha" in metric_name:
            return 0.1  # 10% captcha failure
        elif "security_events" in metric_name:
            return 2  # 2 security events
        
        return 0.0
    
    def _trigger_alert(self, rule: AlertRule, current_value: float, timestamp: datetime) -> None:
        """Trigger a new alert."""
        alert_id = f"{rule.name}_{int(timestamp.timestamp())}"
        
        with self._lock:
            # Check if alert already exists and is active
            if alert_id in self.alerts and self.alerts[alert_id].status == AlertStatus.ACTIVE:
                return
            
            # Create new alert
            alert = SecurityAlert(
                id=alert_id,
                title=rule.description,
                description=f"Current value: {current_value:.3f}, Threshold: {rule.threshold}",
                severity=rule.severity,
                status=AlertStatus.ACTIVE,
                source="security_monitor",
                metric_name=rule.metric_name,
                threshold_value=rule.threshold,
                current_value=current_value,
                timestamp=timestamp,
                metadata={
                    "rule_name": rule.name,
                    "comparison": rule.comparison,
                    "duration": rule.duration,
                    "tags": rule.tags or {}
                }
            )
            
            self.alerts[alert_id] = alert
            
            # Send notifications
            self._send_notifications(alert)
            
            logger.warning(f"Security alert triggered: {alert.title} (severity: {alert.severity.value})")
    
    def _resolve_alert_if_exists(self, rule_name: str) -> None:
        """Resolve alert if it exists and conditions are no longer met."""
        with self._lock:
            for alert_id, alert in self.alerts.items():
                if (alert.status == AlertStatus.ACTIVE and 
                    alert.metadata.get("rule_name") == rule_name):
                    
                    alert.status = AlertStatus.RESOLVED
                    alert.resolved_at = datetime.utcnow()
                    
                    logger.info(f"Security alert resolved: {alert.title}")
    
    def _send_notifications(self, alert: SecurityAlert) -> None:
        """Send notifications for an alert."""
        for handler in self.notification_handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Error sending notification via {handler.__name__}: {e}")
    
    def _log_notification(self, alert: SecurityAlert) -> None:
        """Log notification handler."""
        log_level = {
            AlertSeverity.INFO: "info",
            AlertSeverity.WARNING: "warning", 
            AlertSeverity.CRITICAL: "error",
            AlertSeverity.EMERGENCY: "critical"
        }.get(alert.severity, "info")
        
        message = f"SECURITY ALERT [{alert.severity.value.upper()}]: {alert.title} - {alert.description}"
        
        if log_level == "critical":
            logger.critical(message)
        elif log_level == "error":
            logger.error(message)
        elif log_level == "warning":
            logger.warning(message)
        else:
            logger.info(message)
    
    def _send_email_notification(self, alert: SecurityAlert) -> None:
        """Send email notification."""
        try:
            smtp_server = os.getenv('ALERT_SMTP_SERVER')
            smtp_port = int(os.getenv('ALERT_SMTP_PORT', '587'))
            smtp_username = os.getenv('ALERT_SMTP_USERNAME')
            smtp_password = os.getenv('ALERT_SMTP_PASSWORD')
            alert_email = os.getenv('ALERT_EMAIL_TO')
            
            if not all([smtp_server, smtp_username, smtp_password, alert_email]):
                logger.warning("Email notification not configured properly")
                return
            
            # Create message
            msg = MimeMultipart()
            msg['From'] = smtp_username
            msg['To'] = alert_email
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
            
            # Create body
            body = f"""
Security Alert Details:

Title: {alert.title}
Description: {alert.description}
Severity: {alert.severity.value.upper()}
Timestamp: {alert.timestamp.isoformat()}
Metric: {alert.metric_name}
Current Value: {alert.current_value}
Threshold: {alert.threshold_value}

Alert ID: {alert.id}

Please investigate this security event immediately.

---
JewGo Security Monitoring System
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email notification sent for alert: {alert.id}")
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
    
    def _send_slack_notification(self, alert: SecurityAlert) -> None:
        """Send Slack notification."""
        try:
            import requests
            
            webhook_url = os.getenv('ALERT_SLACK_WEBHOOK_URL')
            if not webhook_url:
                logger.warning("Slack webhook URL not configured")
                return
            
            # Determine color based on severity
            color_map = {
                AlertSeverity.INFO: "good",
                AlertSeverity.WARNING: "warning",
                AlertSeverity.CRITICAL: "danger",
                AlertSeverity.EMERGENCY: "danger"
            }
            
            payload = {
                "attachments": [
                    {
                        "color": color_map.get(alert.severity, "good"),
                        "title": alert.title,
                        "text": alert.description,
                        "fields": [
                            {
                                "title": "Severity",
                                "value": alert.severity.value.upper(),
                                "short": True
                            },
                            {
                                "title": "Metric",
                                "value": alert.metric_name,
                                "short": True
                            },
                            {
                                "title": "Current Value",
                                "value": str(alert.current_value),
                                "short": True
                            },
                            {
                                "title": "Threshold",
                                "value": str(alert.threshold_value),
                                "short": True
                            }
                        ],
                        "footer": "JewGo Security Monitoring",
                        "ts": int(alert.timestamp.timestamp())
                    }
                ]
            }
            
            response = requests.post(webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            
            logger.info(f"Slack notification sent for alert: {alert.id}")
            
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
    
    def _send_webhook_notification(self, alert: SecurityAlert) -> None:
        """Send webhook notification."""
        try:
            import requests
            
            webhook_url = os.getenv('ALERT_WEBHOOK_URL')
            if not webhook_url:
                logger.warning("Webhook URL not configured")
                return
            
            payload = {
                "alert": alert.to_dict(),
                "timestamp": datetime.utcnow().isoformat(),
                "source": "jewgo_security_monitor"
            }
            
            response = requests.post(webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            
            logger.info(f"Webhook notification sent for alert: {alert.id}")
            
        except Exception as e:
            logger.error(f"Failed to send webhook notification: {e}")
    
    def _cleanup_old_alerts(self) -> None:
        """Clean up old resolved alerts."""
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=7)  # Keep for 7 days
            
            with self._lock:
                alerts_to_remove = []
                for alert_id, alert in self.alerts.items():
                    if (alert.status == AlertStatus.RESOLVED and 
                        alert.resolved_at and 
                        alert.resolved_at < cutoff_time):
                        alerts_to_remove.append(alert_id)
                
                for alert_id in alerts_to_remove:
                    del self.alerts[alert_id]
                
                if alerts_to_remove:
                    logger.info(f"Cleaned up {len(alerts_to_remove)} old alerts")
        
        except Exception as e:
            logger.error(f"Error cleaning up old alerts: {e}")
    
    def get_active_alerts(self) -> List[SecurityAlert]:
        """Get all active alerts."""
        with self._lock:
            return [alert for alert in self.alerts.values() if alert.status == AlertStatus.ACTIVE]
    
    def get_alert_history(self, limit: int = 100) -> List[SecurityAlert]:
        """Get alert history."""
        with self._lock:
            all_alerts = list(self.alerts.values())
            all_alerts.sort(key=lambda x: x.timestamp, reverse=True)
            return all_alerts[:limit]
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an alert."""
        with self._lock:
            if alert_id in self.alerts:
                alert = self.alerts[alert_id]
                if alert.status == AlertStatus.ACTIVE:
                    alert.status = AlertStatus.ACKNOWLEDGED
                    alert.acknowledged_by = acknowledged_by
                    alert.acknowledged_at = datetime.utcnow()
                    
                    logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
                    return True
        
        return False
    
    def resolve_alert(self, alert_id: str) -> bool:
        """Manually resolve an alert."""
        with self._lock:
            if alert_id in self.alerts:
                alert = self.alerts[alert_id]
                if alert.status in [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]:
                    alert.status = AlertStatus.RESOLVED
                    alert.resolved_at = datetime.utcnow()
                    
                    logger.info(f"Alert {alert_id} manually resolved")
                    return True
        
        return False
    
    def add_alert_rule(self, rule: AlertRule) -> None:
        """Add a new alert rule."""
        with self._lock:
            self.alert_rules.append(rule)
            logger.info(f"Added alert rule: {rule.name}")
    
    def remove_alert_rule(self, rule_name: str) -> bool:
        """Remove an alert rule."""
        with self._lock:
            for i, rule in enumerate(self.alert_rules):
                if rule.name == rule_name:
                    del self.alert_rules[i]
                    logger.info(f"Removed alert rule: {rule_name}")
                    return True
        
        return False
    
    def get_alert_rules(self) -> List[AlertRule]:
        """Get all alert rules."""
        return self.alert_rules.copy()


# Global instance
security_alert_manager = SecurityAlertManager()


def get_security_alert_manager() -> SecurityAlertManager:
    """Get the global security alert manager instance."""
    return security_alert_manager


def start_security_monitoring(check_interval: int = 60) -> None:
    """Start security monitoring."""
    try:
        security_alert_manager.start_monitoring(check_interval)
        logger.info("Security monitoring started successfully")
    except Exception as e:
        logger.error(f"Failed to start security monitoring: {e}")
        raise


def stop_security_monitoring() -> None:
    """Stop security monitoring."""
    try:
        security_alert_manager.stop_monitoring()
        logger.info("Security monitoring stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping security monitoring: {e}")


def trigger_manual_alert(title: str, description: str, severity: AlertSeverity, 
                        metric_name: str = "manual", current_value: float = 1.0) -> str:
    """Trigger a manual security alert."""
    try:
        alert_id = f"manual_{int(time.time())}"
        
        alert = SecurityAlert(
            id=alert_id,
            title=title,
            description=description,
            severity=severity,
            status=AlertStatus.ACTIVE,
            source="manual",
            metric_name=metric_name,
            threshold_value=0.0,
            current_value=current_value,
            timestamp=datetime.utcnow(),
            metadata={"manual": True}
        )
        
        security_alert_manager.alerts[alert_id] = alert
        security_alert_manager._send_notifications(alert)
        
        logger.info(f"Manual alert triggered: {title}")
        return alert_id
        
    except Exception as e:
        logger.error(f"Failed to trigger manual alert: {e}")
        raise
