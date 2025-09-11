#!/usr/bin/env python3
"""
V5 API Alerting System

This script provides comprehensive alerting capabilities for v5 API rollout,
including email notifications, Slack integration, and automated rollback triggers.
"""

import os
import sys
import json
import time
import logging
import smtplib
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from pathlib import Path

# Optional email imports
try:
    from email.mime.text import MimeText
    from email.mime.multipart import MimeMultipart
    from email.mime.base import MimeBase
    from email import encoders
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from utils.feature_flags_v5 import FeatureFlagsV5
from utils.logging_config import get_logger
from scripts.monitoring_dashboard import MonitoringDashboard, MetricSnapshot
from scripts.performance_tracker import PerformanceTracker

logger = get_logger(__name__)

@dataclass
class AlertRule:
    """Configuration for an alert rule."""
    name: str
    description: str
    condition: str  # Python expression to evaluate
    threshold: float
    severity: str  # 'low', 'medium', 'high', 'critical'
    enabled: bool = True
    cooldown_minutes: int = 15
    notification_channels: List[str] = None
    auto_rollback: bool = False

@dataclass
class Alert:
    """An active alert."""
    id: str
    rule_name: str
    severity: str
    message: str
    timestamp: str
    value: float
    threshold: float
    resolved: bool = False
    resolved_at: Optional[str] = None
    notifications_sent: List[str] = None

@dataclass
class NotificationChannel:
    """Configuration for a notification channel."""
    name: str
    type: str  # 'email', 'slack', 'webhook'
    config: Dict[str, Any]
    enabled: bool = True

class AlertingSystem:
    """Comprehensive alerting system for v5 API monitoring."""
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.feature_flags = FeatureFlagsV5()
        self.monitoring = MonitoringDashboard()
        self.performance_tracker = PerformanceTracker()
        
        # Alert storage
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.alert_rules: Dict[str, AlertRule] = {}
        self.notification_channels: Dict[str, NotificationChannel] = {}
        
        # Alert cooldowns
        self.alert_cooldowns: Dict[str, datetime] = {}
        
        # Load default alert rules
        self._load_default_alert_rules()
        
        # Load notification channels from config
        self._load_notification_channels()
    
    def _load_default_alert_rules(self):
        """Load default alert rules for v5 API monitoring."""
        default_rules = [
            AlertRule(
                name="high_error_rate",
                description="High error rate detected",
                condition="metrics.error_rate > threshold",
                threshold=5.0,
                severity="high",
                cooldown_minutes=10,
                notification_channels=["email", "slack"],
                auto_rollback=False
            ),
            AlertRule(
                name="critical_error_rate",
                description="Critical error rate detected",
                condition="metrics.error_rate > threshold",
                threshold=10.0,
                severity="critical",
                cooldown_minutes=5,
                notification_channels=["email", "slack"],
                auto_rollback=True
            ),
            AlertRule(
                name="high_response_time_p95",
                description="High P95 response time",
                condition="metrics.p95_response_time > threshold",
                threshold=2000.0,
                severity="medium",
                cooldown_minutes=15,
                notification_channels=["slack"]
            ),
            AlertRule(
                name="critical_response_time_p99",
                description="Critical P99 response time",
                condition="metrics.p99_response_time > threshold",
                threshold=5000.0,
                severity="high",
                cooldown_minutes=10,
                notification_channels=["email", "slack"]
            ),
            AlertRule(
                name="high_memory_usage",
                description="High memory usage",
                condition="metrics.memory_usage > threshold",
                threshold=80.0,
                severity="medium",
                cooldown_minutes=20,
                notification_channels=["slack"]
            ),
            AlertRule(
                name="critical_memory_usage",
                description="Critical memory usage",
                condition="metrics.memory_usage > threshold",
                threshold=95.0,
                severity="critical",
                cooldown_minutes=5,
                notification_channels=["email", "slack"],
                auto_rollback=True
            ),
            AlertRule(
                name="high_cpu_usage",
                description="High CPU usage",
                condition="metrics.cpu_usage > threshold",
                threshold=85.0,
                severity="medium",
                cooldown_minutes=15,
                notification_channels=["slack"]
            ),
            AlertRule(
                name="critical_cpu_usage",
                description="Critical CPU usage",
                condition="metrics.cpu_usage > threshold",
                threshold=95.0,
                severity="critical",
                cooldown_minutes=5,
                notification_channels=["email", "slack"],
                auto_rollback=True
            ),
            AlertRule(
                name="low_throughput",
                description="Low request throughput",
                condition="metrics.throughput_rps < threshold",
                threshold=1.0,
                severity="low",
                cooldown_minutes=30,
                notification_channels=["slack"]
            ),
            AlertRule(
                name="v5_rollout_stalled",
                description="V5 rollout appears stalled",
                condition="metrics.v5_requests == 0 and metrics.total_requests > 100",
                threshold=0.0,
                severity="medium",
                cooldown_minutes=60,
                notification_channels=["slack"]
            )
        ]
        
        for rule in default_rules:
            self.alert_rules[rule.name] = rule
    
    def _load_notification_channels(self):
        """Load notification channels from environment variables."""
        # Email configuration
        smtp_host = os.environ.get('SMTP_HOST')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        alert_email = os.environ.get('ALERT_EMAIL')
        
        if smtp_host and smtp_user and smtp_password and alert_email:
            self.notification_channels['email'] = NotificationChannel(
                name='email',
                type='email',
                config={
                    'smtp_host': smtp_host,
                    'smtp_port': smtp_port,
                    'smtp_user': smtp_user,
                    'smtp_password': smtp_password,
                    'alert_email': alert_email
                },
                enabled=True
            )
        
        # Slack configuration
        slack_webhook_url = os.environ.get('SLACK_WEBHOOK_URL')
        slack_channel = os.environ.get('SLACK_CHANNEL', '#alerts')
        
        if slack_webhook_url:
            self.notification_channels['slack'] = NotificationChannel(
                name='slack',
                type='slack',
                config={
                    'webhook_url': slack_webhook_url,
                    'channel': slack_channel
                },
                enabled=True
            )
        
        # Webhook configuration
        webhook_url = os.environ.get('ALERT_WEBHOOK_URL')
        if webhook_url:
            self.notification_channels['webhook'] = NotificationChannel(
                name='webhook',
                type='webhook',
                config={
                    'url': webhook_url,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Authorization': os.environ.get('ALERT_WEBHOOK_TOKEN', '')
                    }
                },
                enabled=True
            )
    
    def check_alerts(self, metrics: MetricSnapshot) -> List[Alert]:
        """Check all alert rules against current metrics."""
        triggered_alerts = []
        
        for rule_name, rule in self.alert_rules.items():
            if not rule.enabled:
                continue
            
            # Check cooldown
            if rule_name in self.alert_cooldowns:
                cooldown_end = self.alert_cooldowns[rule_name]
                if datetime.now() < cooldown_end:
                    continue
            
            # Evaluate alert condition
            try:
                # Create evaluation context
                context = {
                    'metrics': metrics,
                    'threshold': rule.threshold,
                    'rule': rule
                }
                
                # Evaluate the condition
                if eval(rule.condition, {"__builtins__": {}}, context):
                    # Create alert
                    alert_id = f"{rule_name}_{int(time.time())}"
                    alert = Alert(
                        id=alert_id,
                        rule_name=rule_name,
                        severity=rule.severity,
                        message=rule.description,
                        timestamp=datetime.now().isoformat(),
                        value=self._extract_value_from_condition(rule.condition, metrics),
                        threshold=rule.threshold,
                        notifications_sent=[]
                    )
                    
                    triggered_alerts.append(alert)
                    self.active_alerts[alert_id] = alert
                    self.alert_history.append(alert)
                    
                    # Set cooldown
                    self.alert_cooldowns[rule_name] = datetime.now() + timedelta(minutes=rule.cooldown_minutes)
                    
                    # Send notifications
                    self._send_notifications(alert, rule)
                    
                    # Auto-rollback if configured
                    if rule.auto_rollback:
                        self._trigger_auto_rollback(alert, rule)
                    
                    logger.warning(f"Alert triggered: {rule_name} - {rule.description}")
            
            except Exception as e:
                logger.error(f"Error evaluating alert rule {rule_name}: {e}")
        
        return triggered_alerts
    
    def _extract_value_from_condition(self, condition: str, metrics: MetricSnapshot) -> float:
        """Extract the metric value from the alert condition."""
        # Simple extraction based on common patterns
        if 'error_rate' in condition:
            return metrics.error_rate
        elif 'p95_response_time' in condition:
            return metrics.p95_response_time
        elif 'p99_response_time' in condition:
            return metrics.p99_response_time
        elif 'memory_usage' in condition:
            return metrics.memory_usage
        elif 'cpu_usage' in condition:
            return metrics.cpu_usage
        elif 'throughput_rps' in condition:
            return metrics.total_requests / 60.0  # Approximate RPS
        else:
            return 0.0
    
    def _send_notifications(self, alert: Alert, rule: AlertRule):
        """Send notifications through configured channels."""
        for channel_name in rule.notification_channels:
            if channel_name in self.notification_channels:
                channel = self.notification_channels[channel_name]
                if channel.enabled:
                    try:
                        if channel.type == 'email':
                            self._send_email_notification(alert, channel)
                        elif channel.type == 'slack':
                            self._send_slack_notification(alert, channel)
                        elif channel.type == 'webhook':
                            self._send_webhook_notification(alert, channel)
                        
                        alert.notifications_sent.append(channel_name)
                        logger.info(f"Notification sent via {channel_name} for alert {alert.id}")
                    
                    except Exception as e:
                        logger.error(f"Failed to send notification via {channel_name}: {e}")
    
    def _send_email_notification(self, alert: Alert, channel: NotificationChannel):
        """Send email notification."""
        if not EMAIL_AVAILABLE:
            logger.warning("Email functionality not available - skipping email notification")
            return
            
        config = channel.config
        
        msg = MimeMultipart()
        msg['From'] = config['smtp_user']
        msg['To'] = config['alert_email']
        msg['Subject'] = f"🚨 V5 API Alert: {alert.severity.upper()} - {alert.rule_name}"
        
        # Create email body
        body = f"""
V5 API Alert Notification

Alert Details:
- Rule: {alert.rule_name}
- Severity: {alert.severity.upper()}
- Message: {alert.message}
- Value: {alert.value}
- Threshold: {alert.threshold}
- Timestamp: {alert.timestamp}

Environment: {os.environ.get('ENVIRONMENT', 'unknown')}
API Base: {os.environ.get('API_BASE_URL', 'https://api.jewgo.app')}

Please investigate this alert immediately.

Best regards,
V5 API Monitoring System
        """
        
        msg.attach(MimeText(body, 'plain'))
        
        # Send email
        server = smtplib.SMTP(config['smtp_host'], config['smtp_port'])
        server.starttls()
        server.login(config['smtp_user'], config['smtp_password'])
        text = msg.as_string()
        server.sendmail(config['smtp_user'], config['alert_email'], text)
        server.quit()
    
    def _send_slack_notification(self, alert: Alert, channel: NotificationChannel):
        """Send Slack notification."""
        config = channel.config
        
        # Determine emoji based on severity
        severity_emojis = {
            'low': '🟡',
            'medium': '🟠',
            'high': '🔴',
            'critical': '🚨'
        }
        
        emoji = severity_emojis.get(alert.severity, '⚠️')
        
        # Create Slack message
        message = {
            "channel": config['channel'],
            "username": "V5 API Monitor",
            "icon_emoji": ":robot_face:",
            "attachments": [
                {
                    "color": "danger" if alert.severity in ['high', 'critical'] else "warning",
                    "title": f"{emoji} V5 API Alert: {alert.severity.upper()}",
                    "fields": [
                        {
                            "title": "Rule",
                            "value": alert.rule_name,
                            "short": True
                        },
                        {
                            "title": "Message",
                            "value": alert.message,
                            "short": False
                        },
                        {
                            "title": "Value",
                            "value": f"{alert.value} (threshold: {alert.threshold})",
                            "short": True
                        },
                        {
                            "title": "Timestamp",
                            "value": alert.timestamp,
                            "short": True
                        }
                    ],
                    "footer": "V5 API Monitoring System",
                    "ts": int(time.time())
                }
            ]
        }
        
        # Send to Slack
        response = requests.post(
            config['webhook_url'],
            json=message,
            timeout=10
        )
        
        if response.status_code != 200:
            raise Exception(f"Slack API returned {response.status_code}: {response.text}")
    
    def _send_webhook_notification(self, alert: Alert, channel: NotificationChannel):
        """Send webhook notification."""
        config = channel.config
        
        payload = {
            "alert_id": alert.id,
            "rule_name": alert.rule_name,
            "severity": alert.severity,
            "message": alert.message,
            "value": alert.value,
            "threshold": alert.threshold,
            "timestamp": alert.timestamp,
            "environment": os.environ.get('ENVIRONMENT', 'unknown'),
            "api_base": os.environ.get('API_BASE_URL', 'https://api.jewgo.app')
        }
        
        response = requests.post(
            config['url'],
            json=payload,
            headers=config.get('headers', {}),
            timeout=10
        )
        
        if response.status_code not in [200, 201, 202]:
            raise Exception(f"Webhook returned {response.status_code}: {response.text}")
    
    def _trigger_auto_rollback(self, alert: Alert, rule: AlertRule):
        """Trigger automatic rollback for critical alerts."""
        try:
            logger.critical(f"Auto-rollback triggered by alert: {alert.rule_name}")
            
            # Disable v5 APIs
            v5_flags = [
                'v5_api_enabled',
                'entity_api_v5',
                'search_api_v5',
                'admin_api_v5',
                'monitoring_api_v5',
                'webhook_api_v5'
            ]
            
            for flag_name in v5_flags:
                try:
                    self.feature_flags.disable_flag(flag_name)
                    logger.info(f"Disabled flag {flag_name} due to auto-rollback")
                except Exception as e:
                    logger.error(f"Failed to disable flag {flag_name}: {e}")
            
            # Send critical notification
            critical_alert = Alert(
                id=f"auto_rollback_{int(time.time())}",
                rule_name="auto_rollback",
                severity="critical",
                message=f"Automatic rollback triggered by {alert.rule_name}",
                timestamp=datetime.now().isoformat(),
                value=alert.value,
                threshold=alert.threshold,
                notifications_sent=[]
            )
            
            # Send to all channels
            for channel_name, channel in self.notification_channels.items():
                if channel.enabled:
                    try:
                        if channel.type == 'email':
                            self._send_email_notification(critical_alert, channel)
                        elif channel.type == 'slack':
                            self._send_slack_notification(critical_alert, channel)
                        elif channel.type == 'webhook':
                            self._send_webhook_notification(critical_alert, channel)
                    except Exception as e:
                        logger.error(f"Failed to send rollback notification via {channel_name}: {e}")
        
        except Exception as e:
            logger.error(f"Failed to trigger auto-rollback: {e}")
    
    def resolve_alert(self, alert_id: str, resolution_message: str = "Manually resolved"):
        """Mark an alert as resolved."""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.now().isoformat()
            
            # Move to history
            self.alert_history.append(alert)
            del self.active_alerts[alert_id]
            
            logger.info(f"Alert {alert_id} resolved: {resolution_message}")
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get summary of current alerts."""
        active_count = len(self.active_alerts)
        total_count = len(self.alert_history)
        
        severity_counts = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
        for alert in self.active_alerts.values():
            severity_counts[alert.severity] += 1
        
        return {
            'active_alerts': active_count,
            'total_alerts': total_count,
            'severity_breakdown': severity_counts,
            'active_alert_details': [
                {
                    'id': alert.id,
                    'rule_name': alert.rule_name,
                    'severity': alert.severity,
                    'message': alert.message,
                    'timestamp': alert.timestamp,
                    'value': alert.value,
                    'threshold': alert.threshold
                }
                for alert in self.active_alerts.values()
            ]
        }
    
    def export_alert_data(self, filename: Optional[str] = None) -> str:
        """Export alert data to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"alert_data_{timestamp}.json"
        
        data = {
            'export_timestamp': datetime.now().isoformat(),
            'alert_rules': {name: asdict(rule) for name, rule in self.alert_rules.items()},
            'notification_channels': {name: asdict(channel) for name, channel in self.notification_channels.items()},
            'active_alerts': [asdict(alert) for alert in self.active_alerts.values()],
            'alert_history': [asdict(alert) for alert in self.alert_history]
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        return filename

def main():
    """Main function for the alerting system."""
    import argparse
    
    parser = argparse.ArgumentParser(description='V5 API Alerting System')
    parser.add_argument('action', choices=['test', 'status', 'resolve', 'export'], 
                       help='Action to perform')
    parser.add_argument('--alert-id', type=str, help='Alert ID for resolve action')
    parser.add_argument('--message', type=str, help='Resolution message')
    parser.add_argument('--export-file', type=str, help='Export filename')
    
    args = parser.parse_args()
    
    alerting = AlertingSystem()
    
    if args.action == 'test':
        print("🧪 Testing alerting system...")
        
        # Create test metrics
        test_metrics = MetricSnapshot(
            timestamp=datetime.now().isoformat(),
            total_requests=1000,
            v5_requests=500,
            v4_requests=500,
            error_rate=12.0,  # High error rate to trigger alert
            avg_response_time=1500.0,
            p95_response_time=3000.0,
            p99_response_time=6000.0,
            active_connections=50,
            memory_usage=85.0,
            cpu_usage=90.0
        )
        
        alerts = alerting.check_alerts(test_metrics)
        print(f"✅ Test completed - {len(alerts)} alerts triggered")
        
        for alert in alerts:
            print(f"   - {alert.severity.upper()}: {alert.message}")
    
    elif args.action == 'status':
        summary = alerting.get_alert_summary()
        print("📊 Alert Status Summary:")
        print(f"   Active Alerts: {summary['active_alerts']}")
        print(f"   Total Alerts: {summary['total_alerts']}")
        print(f"   Severity Breakdown:")
        for severity, count in summary['severity_breakdown'].items():
            if count > 0:
                print(f"     {severity}: {count}")
        
        if summary['active_alert_details']:
            print("\n🚨 Active Alerts:")
            for alert in summary['active_alert_details']:
                print(f"   - {alert['severity'].upper()}: {alert['message']} (Value: {alert['value']}, Threshold: {alert['threshold']})")
    
    elif args.action == 'resolve':
        if not args.alert_id:
            print("Error: --alert-id required for resolve action")
            sys.exit(1)
        
        message = args.message or "Manually resolved"
        alerting.resolve_alert(args.alert_id, message)
        print(f"✅ Alert {args.alert_id} resolved: {message}")
    
    elif args.action == 'export':
        filename = alerting.export_alert_data(args.export_file)
        print(f"📁 Alert data exported to: {filename}")

if __name__ == '__main__':
    main()
