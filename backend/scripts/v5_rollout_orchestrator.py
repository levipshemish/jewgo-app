#!/usr/bin/env python3
"""
V5 API Rollout Orchestrator

This script orchestrates the complete v5 API rollout process, integrating
monitoring, alerting, performance tracking, and gradual rollout management.
"""

import os
import sys
import json
import time
import signal
import threading
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from utils.feature_flags_v5 import FeatureFlagsV5
from utils.logging_config import get_logger
from scripts.monitoring_dashboard import MonitoringDashboard
from scripts.rollout_manager import RolloutManager, RolloutPlan, RolloutStage
from scripts.performance_tracker import PerformanceTracker
from scripts.alerting_system import AlertingSystem

logger = get_logger(__name__)

class V5RolloutOrchestrator:
    """Orchestrates the complete v5 API rollout process."""
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.feature_flags = FeatureFlagsV5()
        self.monitoring = MonitoringDashboard()
        self.rollout_manager = RolloutManager()
        self.performance_tracker = PerformanceTracker()
        self.alerting = AlertingSystem()
        
        # Orchestration state
        self.is_running = False
        self.rollout_active = False
        self.monitoring_thread: Optional[threading.Thread] = None
        self.stop_event = threading.Event()
        
        # Rollout configuration
        self.rollout_targets = [
            'entity_api_v5',
            'search_api_v5', 
            'admin_api_v5',
            'monitoring_api_v5',
            'webhook_api_v5'
        ]
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.stop_rollout()
        self.stop_monitoring()
        sys.exit(0)
    
    def create_rollout_plan(self) -> RolloutPlan:
        """Create the v5 API rollout plan."""
        stages = [
            RolloutStage(
                name="canary",
                percentage=5.0,
                duration_minutes=30,
                min_requests=100,
                max_error_rate=2.0,
                max_response_time_p95=1000.0,
                description="Initial canary release to 5% of traffic"
            ),
            RolloutStage(
                name="partial",
                percentage=25.0,
                duration_minutes=60,
                min_requests=500,
                max_error_rate=3.0,
                max_response_time_p95=1500.0,
                description="Expand to 25% of traffic"
            ),
            RolloutStage(
                name="majority",
                percentage=50.0,
                duration_minutes=90,
                min_requests=1000,
                max_error_rate=4.0,
                max_response_time_p95=2000.0,
                description="Expand to 50% of traffic"
            ),
            RolloutStage(
                name="full",
                percentage=100.0,
                duration_minutes=120,
                min_requests=2000,
                max_error_rate=5.0,
                max_response_time_p95=2500.0,
                description="Full rollout to 100% of traffic"
            )
        ]
        
        return RolloutPlan(
            name="v5_api_rollout",
            description="Comprehensive v5 API rollout with monitoring and safety controls",
            stages=stages,
            rollback_triggers={
                'error_rate': 10.0,
                'response_time_p95': 5000.0,
                'response_time_p99': 10000.0,
                'memory_usage': 95.0,
                'cpu_usage': 95.0
            },
            cooldown_minutes=15
        )
    
    def start_monitoring(self):
        """Start comprehensive monitoring."""
        if self.is_running:
            logger.warning("Monitoring already running")
            return
        
        logger.info("Starting comprehensive v5 API monitoring...")
        
        # Start performance tracking
        self.performance_tracker.start_monitoring()
        
        # Start monitoring thread
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        
        self.is_running = True
        logger.info("Monitoring started successfully")
    
    def stop_monitoring(self):
        """Stop comprehensive monitoring."""
        if not self.is_running:
            return
        
        logger.info("Stopping monitoring...")
        
        # Stop performance tracking
        self.performance_tracker.stop_monitoring()
        
        # Signal stop
        self.stop_event.set()
        
        # Wait for monitoring thread
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=10)
        
        self.is_running = False
        logger.info("Monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop."""
        while not self.stop_event.is_set():
            try:
                # Collect metrics
                metrics = self.monitoring.collect_metrics()
                
                # Check alerts
                alerts = self.alerting.check_alerts(metrics)
                
                # Update monitoring dashboard
                self.monitoring.save_metrics(metrics)
                
                # If rollout is active, monitor it
                if self.rollout_active:
                    rollout_status = self.rollout_manager.monitor_rollout()
                    
                    if rollout_status['status'] == 'rollback_triggered':
                        logger.critical("Rollout rollback triggered!")
                        self.rollout_active = False
                    elif rollout_status['status'] == 'rollout_completed':
                        logger.info("Rollout completed successfully!")
                        self.rollout_active = False
                
                # Log status every 5 minutes
                if int(time.time()) % 300 == 0:
                    self._log_status_summary(metrics, alerts)
                
                time.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(10)
    
    def _log_status_summary(self, metrics, alerts):
        """Log a status summary."""
        logger.info("=== V5 API Status Summary ===")
        logger.info(f"Total Requests: {metrics.total_requests}")
        logger.info(f"V5 Requests: {metrics.v5_requests}")
        logger.info(f"Error Rate: {metrics.error_rate:.2f}%")
        logger.info(f"P95 Response Time: {metrics.p95_response_time:.0f}ms")
        logger.info(f"Memory Usage: {metrics.memory_usage:.1f}%")
        logger.info(f"CPU Usage: {metrics.cpu_usage:.1f}%")
        logger.info(f"Active Alerts: {len(alerts)}")
        
        if self.rollout_active:
            rollout_status = self.rollout_manager.get_rollout_status()
            logger.info(f"Rollout Status: {rollout_status['current_stage']} ({rollout_status['current_percentage']}%)")
    
    def start_rollout(self, dry_run: bool = False) -> Dict:
        """Start the v5 API rollout."""
        if self.rollout_active:
            raise ValueError("Rollout already in progress")
        
        logger.info("Starting v5 API rollout...")
        
        # Create rollout plan
        plan = self.create_rollout_plan()
        
        # Start rollout
        rollout = self.rollout_manager.start_rollout(plan, self.rollout_targets, dry_run)
        
        self.rollout_active = True
        logger.info(f"Rollout started: {rollout['id']}")
        
        return rollout
    
    def stop_rollout(self, reason: str = "Manual stop"):
        """Stop the current rollout."""
        if not self.rollout_active:
            logger.warning("No active rollout to stop")
            return
        
        result = self.rollout_manager.stop_rollout(reason)
        self.rollout_active = False
        logger.info(f"Rollout stopped: {result['reason']}")
        
        return result
    
    def emergency_rollback(self, reason: str = "Emergency rollback"):
        """Trigger emergency rollback."""
        logger.critical(f"Emergency rollback triggered: {reason}")
        
        # Disable all v5 flags immediately
        for flag_name in self.rollout_targets:
            try:
                self.feature_flags.disable_flag(flag_name)
                logger.info(f"Emergency disabled flag: {flag_name}")
            except Exception as e:
                logger.error(f"Failed to emergency disable flag {flag_name}: {e}")
        
        # Stop rollout
        if self.rollout_active:
            self.stop_rollout(f"Emergency rollback: {reason}")
        
        logger.critical("Emergency rollback completed")
    
    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive status of the rollout system."""
        # Get monitoring status
        monitoring_status = {
            'monitoring_active': self.is_running,
            'rollout_active': self.rollout_active
        }
        
        # Get rollout status
        if self.rollout_active:
            rollout_status = self.rollout_manager.get_rollout_status()
            monitoring_status['rollout'] = rollout_status
        
        # Get performance summary
        try:
            performance_summary = self.performance_tracker.get_current_performance_summary()
            monitoring_status['performance'] = performance_summary
        except Exception as e:
            logger.error(f"Failed to get performance summary: {e}")
            monitoring_status['performance'] = {'error': str(e)}
        
        # Get alert summary
        try:
            alert_summary = self.alerting.get_alert_summary()
            monitoring_status['alerts'] = alert_summary
        except Exception as e:
            logger.error(f"Failed to get alert summary: {e}")
            monitoring_status['alerts'] = {'error': str(e)}
        
        # Get feature flag status
        try:
            flag_status = self.feature_flags.get_all_flags()
            monitoring_status['feature_flags'] = {
                'total_flags': len(flag_status),
                'enabled_flags': sum(1 for flag in flag_status.values() if flag.get('enabled', False)),
                'v5_flags': {
                    name: data for name, data in flag_status.items() 
                    if name in self.rollout_targets
                }
            }
        except Exception as e:
            logger.error(f"Failed to get feature flag status: {e}")
            monitoring_status['feature_flags'] = {'error': str(e)}
        
        return monitoring_status
    
    def display_status_dashboard(self):
        """Display a comprehensive status dashboard."""
        status = self.get_status()
        
        print("\n" + "="*80)
        print("🚀 V5 API ROLLOUT ORCHESTRATOR STATUS")
        print("="*80)
        print(f"📅 Timestamp: {datetime.now().isoformat()}")
        print(f"🌐 Environment: {os.environ.get('ENVIRONMENT', 'unknown')}")
        print()
        
        # Monitoring status
        print("📊 MONITORING STATUS")
        print("-" * 40)
        print(f"Monitoring Active: {'✅' if status['monitoring_active'] else '❌'}")
        print(f"Rollout Active: {'✅' if status['rollout_active'] else '❌'}")
        print()
        
        # Rollout status
        if status.get('rollout'):
            rollout = status['rollout']
            print("🚀 ROLLOUT STATUS")
            print("-" * 40)
            print(f"Rollout ID: {rollout['rollout_id']}")
            print(f"Status: {rollout['status']}")
            print(f"Plan: {rollout['plan_name']}")
            print(f"Current Stage: {rollout['current_stage']}")
            print(f"Percentage: {rollout['current_percentage']}%")
            print(f"Target Flags: {', '.join(rollout['target_flags'])}")
            if rollout.get('rollback_triggered'):
                print(f"⚠️  Rollback Triggered: {rollout.get('rollback_reason')}")
            print()
        
        # Performance status
        if status.get('performance') and status['performance'].get('status') != 'no_data':
            perf = status['performance']
            print("⚡ PERFORMANCE STATUS")
            print("-" * 40)
            print(f"Total Requests: {perf['requests']['total']:,}")
            print(f"V5 Requests: {perf['requests']['v5']:,} ({perf['requests']['v5_percentage']:.1f}%)")
            print(f"Error Rate: {perf['performance']['error_rate']:.2f}%")
            print(f"Avg Response Time: {perf['performance']['avg_response_time']:.0f}ms")
            print(f"P95 Response Time: {perf['performance']['p95_response_time']:.0f}ms")
            print(f"Throughput: {perf['performance']['throughput_rps']:.1f} RPS")
            print(f"CPU: {perf['system']['cpu_percent']:.1f}%, Memory: {perf['system']['memory_percent']:.1f}%")
            print()
        
        # Alert status
        if status.get('alerts'):
            alerts = status['alerts']
            print("🚨 ALERT STATUS")
            print("-" * 40)
            print(f"Active Alerts: {alerts['active_alerts']}")
            print(f"Total Alerts: {alerts['total_alerts']}")
            if alerts['active_alerts'] > 0:
                print("Active Alert Details:")
                for alert in alerts['active_alert_details']:
                    severity_icon = "🔴" if alert['severity'] in ['high', 'critical'] else "🟡"
                    print(f"  {severity_icon} {alert['severity'].upper()}: {alert['message']}")
            print()
        
        # Feature flag status
        if status.get('feature_flags'):
            flags = status['feature_flags']
            if 'v5_flags' in flags:
                print("🚩 V5 FEATURE FLAGS")
                print("-" * 40)
                for flag_name, flag_data in flags['v5_flags'].items():
                    if flag_data.get('enabled', False):
                        stage = flag_data.get('stage', 'unknown')
                        percentage = flag_data.get('rollout_percentage', 0)
                        print(f"✅ {flag_name}: {stage} ({percentage}%)")
                    else:
                        print(f"❌ {flag_name}: disabled")
                print()
        
        print("="*80)
    
    def export_all_data(self, filename: Optional[str] = None) -> str:
        """Export all monitoring and rollout data."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"v5_rollout_data_{timestamp}.json"
        
        data = {
            'export_timestamp': datetime.now().isoformat(),
            'status': self.get_status(),
            'rollout_history': self.rollout_manager.rollout_history,
            'performance_data': {
                'aggregated_metrics': [asdict(metric) for metric in self.performance_tracker.aggregated_metrics],
                'system_metrics': [asdict(metric) for metric in self.performance_tracker.system_metrics_buffer]
            },
            'alert_data': {
                'active_alerts': [asdict(alert) for alert in self.alerting.active_alerts.values()],
                'alert_history': [asdict(alert) for alert in self.alerting.alert_history]
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        return filename

def main():
    """Main function for the rollout orchestrator."""
    import argparse
    
    parser = argparse.ArgumentParser(description='V5 API Rollout Orchestrator')
    parser.add_argument('action', choices=['start', 'stop', 'status', 'rollout', 'rollback', 'export'], 
                       help='Action to perform')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode for rollout')
    parser.add_argument('--reason', type=str, help='Reason for stop/rollback actions')
    parser.add_argument('--export-file', type=str, help='Export filename')
    parser.add_argument('--watch', action='store_true', help='Watch mode - continuously display status')
    
    args = parser.parse_args()
    
    orchestrator = V5RolloutOrchestrator()
    
    try:
        if args.action == 'start':
            orchestrator.start_monitoring()
            print("🚀 V5 API monitoring started")
            
            if args.watch:
                print("🔄 Watching status (Press Ctrl+C to stop)...")
                try:
                    while True:
                        orchestrator.display_status_dashboard()
                        time.sleep(30)
                except KeyboardInterrupt:
                    print("\n👋 Stopping monitoring...")
                    orchestrator.stop_monitoring()
        
        elif args.action == 'stop':
            orchestrator.stop_monitoring()
            print("🛑 V5 API monitoring stopped")
        
        elif args.action == 'status':
            orchestrator.display_status_dashboard()
        
        elif args.action == 'rollout':
            if orchestrator.rollout_active:
                print("❌ Rollout already in progress")
                sys.exit(1)
            
            rollout = orchestrator.start_rollout(args.dry_run)
            print(f"🚀 Rollout started: {rollout['id']}")
            print(f"   Plan: {rollout['plan'].name}")
            print(f"   Target Flags: {', '.join(rollout['target_flags'])}")
            print(f"   Dry Run: {rollout['dry_run']}")
            
            if args.watch:
                print("🔄 Monitoring rollout (Press Ctrl+C to stop)...")
                try:
                    while orchestrator.rollout_active:
                        orchestrator.display_status_dashboard()
                        time.sleep(30)
                except KeyboardInterrupt:
                    print("\n👋 Stopping rollout monitoring...")
                    orchestrator.stop_rollout("User interrupted")
        
        elif args.action == 'rollback':
            reason = args.reason or "Manual rollback requested"
            orchestrator.emergency_rollback(reason)
            print(f"🔄 Emergency rollback completed: {reason}")
        
        elif args.action == 'export':
            filename = orchestrator.export_all_data(args.export_file)
            print(f"📁 All data exported to: {filename}")
    
    except KeyboardInterrupt:
        print("\n👋 Shutting down gracefully...")
        orchestrator.stop_monitoring()
        if orchestrator.rollout_active:
            orchestrator.stop_rollout("User interrupted")
    
    except Exception as e:
        logger.error(f"Error in orchestrator: {e}")
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
