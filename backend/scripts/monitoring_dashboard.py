#!/usr/bin/env python3
"""
V5 API Monitoring Dashboard

This script provides comprehensive monitoring capabilities for the v5 API rollout,
including performance metrics, error rates, and automated rollback triggers.
"""

import os
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import requests
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from utils.feature_flags_v5 import FeatureFlagsV5
from utils.logging_config import get_logger

logger = get_logger(__name__)

@dataclass
class MetricSnapshot:
    """Snapshot of key metrics at a point in time."""
    timestamp: str
    total_requests: int
    v5_requests: int
    v4_requests: int
    error_rate: float
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    active_connections: int
    memory_usage: float
    cpu_usage: float

@dataclass
class AlertThreshold:
    """Configuration for alert thresholds."""
    error_rate_max: float = 5.0  # 5% error rate threshold
    response_time_p95_max: float = 2000.0  # 2 seconds P95 threshold
    response_time_p99_max: float = 5000.0  # 5 seconds P99 threshold
    memory_usage_max: float = 80.0  # 80% memory usage threshold
    cpu_usage_max: float = 90.0  # 90% CPU usage threshold

class MonitoringDashboard:
    """Comprehensive monitoring dashboard for v5 API rollout."""
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.feature_flags = FeatureFlagsV5()
        self.alert_thresholds = AlertThreshold()
        self.metrics_history: List[MetricSnapshot] = []
        self.alerts: List[Dict] = []
        
        # API endpoints for monitoring
        self.api_base = os.environ.get('API_BASE_URL', 'https://api.jewgo.app')
        self.monitoring_endpoint = f"{self.api_base}/v5/monitoring/metrics"
        self.health_endpoint = f"{self.api_base}/v5/monitoring/health"
        
    def collect_metrics(self) -> MetricSnapshot:
        """Collect current metrics from the API."""
        try:
            # Get metrics from monitoring API
            response = requests.get(
                self.monitoring_endpoint,
                timeout=10,
                headers={'Accept': 'application/json'}
            )
            
            if response.status_code == 200:
                metrics_data = response.json()
                return self._parse_metrics(metrics_data)
            else:
                logger.warning(f"Failed to fetch metrics: {response.status_code}")
                return self._get_fallback_metrics()
                
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            return self._get_fallback_metrics()
    
    def _parse_metrics(self, data: Dict) -> MetricSnapshot:
        """Parse metrics data from API response."""
        return MetricSnapshot(
            timestamp=datetime.now().isoformat(),
            total_requests=data.get('requests', {}).get('total', 0),
            v5_requests=data.get('requests', {}).get('v5', 0),
            v4_requests=data.get('requests', {}).get('v4', 0),
            error_rate=data.get('errors', {}).get('rate', 0.0),
            avg_response_time=data.get('performance', {}).get('avg_response_time', 0.0),
            p95_response_time=data.get('performance', {}).get('p95_response_time', 0.0),
            p99_response_time=data.get('performance', {}).get('p99_response_time', 0.0),
            active_connections=data.get('system', {}).get('active_connections', 0),
            memory_usage=data.get('system', {}).get('memory_usage', 0.0),
            cpu_usage=data.get('system', {}).get('cpu_usage', 0.0)
        )
    
    def _get_fallback_metrics(self) -> MetricSnapshot:
        """Get fallback metrics when API is unavailable."""
        return MetricSnapshot(
            timestamp=datetime.now().isoformat(),
            total_requests=0,
            v5_requests=0,
            v4_requests=0,
            error_rate=0.0,
            avg_response_time=0.0,
            p95_response_time=0.0,
            p99_response_time=0.0,
            active_connections=0,
            memory_usage=0.0,
            cpu_usage=0.0
        )
    
    def check_alerts(self, metrics: MetricSnapshot) -> List[Dict]:
        """Check if any metrics exceed alert thresholds."""
        alerts = []
        
        if metrics.error_rate > self.alert_thresholds.error_rate_max:
            alerts.append({
                'type': 'error_rate',
                'severity': 'high',
                'message': f"Error rate {metrics.error_rate:.2f}% exceeds threshold {self.alert_thresholds.error_rate_max}%",
                'timestamp': metrics.timestamp,
                'value': metrics.error_rate,
                'threshold': self.alert_thresholds.error_rate_max
            })
        
        if metrics.p95_response_time > self.alert_thresholds.response_time_p95_max:
            alerts.append({
                'type': 'response_time_p95',
                'severity': 'medium',
                'message': f"P95 response time {metrics.p95_response_time:.0f}ms exceeds threshold {self.alert_thresholds.response_time_p95_max}ms",
                'timestamp': metrics.timestamp,
                'value': metrics.p95_response_time,
                'threshold': self.alert_thresholds.response_time_p95_max
            })
        
        if metrics.p99_response_time > self.alert_thresholds.response_time_p99_max:
            alerts.append({
                'type': 'response_time_p99',
                'severity': 'high',
                'message': f"P99 response time {metrics.p99_response_time:.0f}ms exceeds threshold {self.alert_thresholds.response_time_p99_max}ms",
                'timestamp': metrics.timestamp,
                'value': metrics.p99_response_time,
                'threshold': self.alert_thresholds.response_time_p99_max
            })
        
        if metrics.memory_usage > self.alert_thresholds.memory_usage_max:
            alerts.append({
                'type': 'memory_usage',
                'severity': 'medium',
                'message': f"Memory usage {metrics.memory_usage:.1f}% exceeds threshold {self.alert_thresholds.memory_usage_max}%",
                'timestamp': metrics.timestamp,
                'value': metrics.memory_usage,
                'threshold': self.alert_thresholds.memory_usage_max
            })
        
        if metrics.cpu_usage > self.alert_thresholds.cpu_usage_max:
            alerts.append({
                'type': 'cpu_usage',
                'severity': 'high',
                'message': f"CPU usage {metrics.cpu_usage:.1f}% exceeds threshold {self.alert_thresholds.cpu_usage_max}%",
                'timestamp': metrics.timestamp,
                'value': metrics.cpu_usage,
                'threshold': self.alert_thresholds.cpu_usage_max
            })
        
        return alerts
    
    def should_rollback(self, metrics: MetricSnapshot) -> bool:
        """Determine if a rollback should be triggered based on metrics."""
        # Critical conditions that trigger immediate rollback
        critical_conditions = [
            metrics.error_rate > 10.0,  # 10% error rate
            metrics.p99_response_time > 10000.0,  # 10 seconds P99
            metrics.memory_usage > 95.0,  # 95% memory usage
            metrics.cpu_usage > 95.0,  # 95% CPU usage
        ]
        
        return any(critical_conditions)
    
    def generate_rollback_recommendation(self, metrics: MetricSnapshot) -> Dict:
        """Generate rollback recommendation based on current metrics."""
        recommendation = {
            'should_rollback': self.should_rollback(metrics),
            'reason': [],
            'suggested_actions': [],
            'timestamp': metrics.timestamp
        }
        
        if metrics.error_rate > 10.0:
            recommendation['reason'].append(f"Critical error rate: {metrics.error_rate:.2f}%")
            recommendation['suggested_actions'].append("Disable v5 APIs and fallback to v4")
        
        if metrics.p99_response_time > 10000.0:
            recommendation['reason'].append(f"Critical response time: {metrics.p99_response_time:.0f}ms P99")
            recommendation['suggested_actions'].append("Reduce v5 rollout percentage")
        
        if metrics.memory_usage > 95.0:
            recommendation['reason'].append(f"Critical memory usage: {metrics.memory_usage:.1f}%")
            recommendation['suggested_actions'].append("Scale up resources or reduce load")
        
        if metrics.cpu_usage > 95.0:
            recommendation['reason'].append(f"Critical CPU usage: {metrics.cpu_usage:.1f}%")
            recommendation['suggested_actions'].append("Scale up resources or reduce load")
        
        return recommendation
    
    def display_dashboard(self, metrics: MetricSnapshot, alerts: List[Dict]):
        """Display the monitoring dashboard."""
        print("\n" + "="*80)
        print("🚀 V5 API MONITORING DASHBOARD")
        print("="*80)
        print(f"📅 Timestamp: {metrics.timestamp}")
        print(f"🌐 API Base: {self.api_base}")
        print()
        
        # Request metrics
        print("📊 REQUEST METRICS")
        print("-" * 40)
        print(f"Total Requests: {metrics.total_requests:,}")
        print(f"V5 Requests: {metrics.v5_requests:,}")
        print(f"V4 Requests: {metrics.v4_requests:,}")
        if metrics.total_requests > 0:
            v5_percentage = (metrics.v5_requests / metrics.total_requests) * 100
            print(f"V5 Percentage: {v5_percentage:.1f}%")
        print()
        
        # Performance metrics
        print("⚡ PERFORMANCE METRICS")
        print("-" * 40)
        print(f"Error Rate: {metrics.error_rate:.2f}%")
        print(f"Avg Response Time: {metrics.avg_response_time:.0f}ms")
        print(f"P95 Response Time: {metrics.p95_response_time:.0f}ms")
        print(f"P99 Response Time: {metrics.p99_response_time:.0f}ms")
        print()
        
        # System metrics
        print("🖥️  SYSTEM METRICS")
        print("-" * 40)
        print(f"Active Connections: {metrics.active_connections:,}")
        print(f"Memory Usage: {metrics.memory_usage:.1f}%")
        print(f"CPU Usage: {metrics.cpu_usage:.1f}%")
        print()
        
        # Feature flag status
        print("🚩 FEATURE FLAG STATUS")
        print("-" * 40)
        flag_status = self.feature_flags.get_all_flags()
        for flag_name, flag_data in flag_status.items():
            if flag_data.get('enabled', False):
                stage = flag_data.get('stage', 'unknown')
                percentage = flag_data.get('rollout_percentage', 0)
                print(f"✅ {flag_name}: {stage} ({percentage}%)")
            else:
                print(f"❌ {flag_name}: disabled")
        print()
        
        # Alerts
        if alerts:
            print("🚨 ACTIVE ALERTS")
            print("-" * 40)
            for alert in alerts:
                severity_icon = "🔴" if alert['severity'] == 'high' else "🟡"
                print(f"{severity_icon} {alert['message']}")
            print()
        
        # Rollback recommendation
        rollback_rec = self.generate_rollback_recommendation(metrics)
        if rollback_rec['should_rollback']:
            print("⚠️  ROLLBACK RECOMMENDATION")
            print("-" * 40)
            print("🚨 CRITICAL CONDITIONS DETECTED - ROLLBACK RECOMMENDED")
            for reason in rollback_rec['reason']:
                print(f"   • {reason}")
            print("\nSuggested Actions:")
            for action in rollback_rec['suggested_actions']:
                print(f"   • {action}")
            print()
        
        print("="*80)
    
    def save_metrics(self, metrics: MetricSnapshot):
        """Save metrics to history."""
        self.metrics_history.append(metrics)
        
        # Keep only last 1000 metrics to prevent memory issues
        if len(self.metrics_history) > 1000:
            self.metrics_history = self.metrics_history[-1000:]
    
    def export_metrics(self, filename: Optional[str] = None) -> str:
        """Export metrics history to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"v5_metrics_{timestamp}.json"
        
        data = {
            'export_timestamp': datetime.now().isoformat(),
            'metrics_count': len(self.metrics_history),
            'metrics': [asdict(metric) for metric in self.metrics_history],
            'alerts': self.alerts
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        return filename

def main():
    """Main function for the monitoring dashboard."""
    import argparse
    
    parser = argparse.ArgumentParser(description='V5 API Monitoring Dashboard')
    parser.add_argument('--watch', action='store_true', help='Watch mode - continuously monitor')
    parser.add_argument('--interval', type=int, default=30, help='Watch interval in seconds (default: 30)')
    parser.add_argument('--export', action='store_true', help='Export metrics to JSON file')
    parser.add_argument('--check-rollback', action='store_true', help='Check if rollback is recommended')
    
    args = parser.parse_args()
    
    dashboard = MonitoringDashboard()
    
    if args.watch:
        print("🔄 Starting continuous monitoring...")
        print("Press Ctrl+C to stop")
        
        try:
            while True:
                metrics = dashboard.collect_metrics()
                alerts = dashboard.check_alerts(metrics)
                dashboard.display_dashboard(metrics, alerts)
                dashboard.save_metrics(metrics)
                
                if args.check_rollback:
                    rollback_rec = dashboard.generate_rollback_recommendation(metrics)
                    if rollback_rec['should_rollback']:
                        print("\n🚨 ROLLBACK TRIGGERED - Stopping monitoring")
                        break
                
                time.sleep(args.interval)
                
        except KeyboardInterrupt:
            print("\n👋 Monitoring stopped by user")
    
    else:
        # Single run
        metrics = dashboard.collect_metrics()
        alerts = dashboard.check_alerts(metrics)
        dashboard.display_dashboard(metrics, alerts)
        dashboard.save_metrics(metrics)
        
        if args.check_rollback:
            rollback_rec = dashboard.generate_rollback_recommendation(metrics)
            if rollback_rec['should_rollback']:
                print("\n🚨 ROLLBACK RECOMMENDED")
                sys.exit(1)
        
        if args.export:
            filename = dashboard.export_metrics()
            print(f"\n📁 Metrics exported to: {filename}")

if __name__ == '__main__':
    main()
