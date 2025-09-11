#!/usr/bin/env python3
"""
V5 API Rollout Manager

This script manages the gradual rollout of v5 APIs with safety controls,
automated rollback capabilities, and comprehensive monitoring integration.
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import requests

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from utils.feature_flags_v5 import FeatureFlagsV5
from utils.logging_config import get_logger
from scripts.monitoring_dashboard import MonitoringDashboard, MetricSnapshot

logger = get_logger(__name__)

@dataclass
class RolloutStage:
    """Configuration for a rollout stage."""
    name: str
    percentage: float
    duration_minutes: int
    min_requests: int
    max_error_rate: float
    max_response_time_p95: float
    description: str

@dataclass
class RolloutPlan:
    """Complete rollout plan with stages and safety controls."""
    name: str
    description: str
    stages: List[RolloutStage]
    rollback_triggers: Dict[str, float]
    cooldown_minutes: int = 15

class RolloutManager:
    """Manages gradual rollout of v5 APIs with safety controls."""
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.feature_flags = FeatureFlagsV5()
        self.monitoring = MonitoringDashboard()
        self.rollout_history: List[Dict] = []
        self.current_rollout: Optional[Dict] = None
        
        # Default rollout stages
        self.default_stages = [
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
        
        # Default rollback triggers
        self.default_rollback_triggers = {
            'error_rate': 10.0,  # 10% error rate
            'response_time_p95': 5000.0,  # 5 seconds P95
            'response_time_p99': 10000.0,  # 10 seconds P99
            'memory_usage': 95.0,  # 95% memory usage
            'cpu_usage': 95.0,  # 95% CPU usage
        }
    
    def create_rollout_plan(self, 
                          name: str,
                          description: str,
                          stages: Optional[List[RolloutStage]] = None,
                          rollback_triggers: Optional[Dict[str, float]] = None) -> RolloutPlan:
        """Create a new rollout plan."""
        return RolloutPlan(
            name=name,
            description=description,
            stages=stages or self.default_stages,
            rollback_triggers=rollback_triggers or self.default_rollback_triggers
        )
    
    def start_rollout(self, 
                     plan: RolloutPlan,
                     target_flags: List[str],
                     dry_run: bool = False) -> Dict:
        """Start a new rollout with the given plan."""
        
        if self.current_rollout and not self.current_rollout.get('completed', False):
            raise ValueError("Another rollout is already in progress")
        
        rollout_id = f"rollout_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        self.current_rollout = {
            'id': rollout_id,
            'plan': plan,  # Store the plan object directly
            'target_flags': target_flags,
            'current_stage': 0,
            'start_time': datetime.now().isoformat(),
            'status': 'running',
            'completed': False,
            'dry_run': dry_run,
            'metrics_history': [],
            'rollback_triggered': False
        }
        
        logger.info(f"Starting rollout {rollout_id} with plan: {plan.name}")
        
        if not dry_run:
            # Enable the first stage
            self._advance_to_stage(0)
        
        self.rollout_history.append(self.current_rollout.copy())
        return self.current_rollout
    
    def _advance_to_stage(self, stage_index: int):
        """Advance to the next rollout stage."""
        if not self.current_rollout:
            raise ValueError("No active rollout")
        
        plan = self.current_rollout['plan']
        if stage_index >= len(plan.stages):
            self._complete_rollout()
            return
        
        stage = plan.stages[stage_index]
        self.current_rollout['current_stage'] = stage_index
        self.current_rollout['stage_start_time'] = datetime.now().isoformat()
        
        logger.info(f"Advancing to stage {stage.name} ({stage.percentage}%)")
        
        # Update feature flags
        for flag_name in self.current_rollout['target_flags']:
            try:
                # Convert stage name to FeatureFlagStageV5 enum
                from utils.feature_flags_v5 import FeatureFlagStageV5
                stage_enum = FeatureFlagStageV5(stage.name)
                self.feature_flags.set_stage(flag_name, stage_enum)
                logger.info(f"Updated {flag_name} to {stage.name} ({stage.percentage}%)")
            except Exception as e:
                logger.error(f"Failed to update flag {flag_name}: {e}")
    
    def monitor_rollout(self, check_interval: int = 30) -> Dict:
        """Monitor the current rollout and advance stages as needed."""
        if not self.current_rollout or self.current_rollout.get('completed', False):
            return {'status': 'no_active_rollout'}
        
        # Collect current metrics
        metrics = self.monitoring.collect_metrics()
        self.current_rollout['metrics_history'].append(asdict(metrics))
        
        # Check for rollback conditions
        rollback_triggered = self._check_rollback_conditions(metrics)
        if rollback_triggered:
            self._trigger_rollback("Rollback conditions met")
            return {'status': 'rollback_triggered', 'reason': rollback_triggered}
        
        # Check if current stage is complete
        plan = self.current_rollout['plan']
        current_stage = plan.stages[self.current_rollout['current_stage']]
        
        stage_complete = self._is_stage_complete(current_stage, metrics)
        if stage_complete:
            # Advance to next stage
            next_stage_index = self.current_rollout['current_stage'] + 1
            if next_stage_index < len(plan.stages):
                self._advance_to_stage(next_stage_index)
                return {'status': 'stage_advanced', 'new_stage': plan.stages[next_stage_index].name}
            else:
                self._complete_rollout()
                return {'status': 'rollout_completed'}
        
        return {'status': 'monitoring', 'current_stage': current_stage.name}
    
    def _check_rollback_conditions(self, metrics: MetricSnapshot) -> Optional[str]:
        """Check if rollback conditions are met."""
        if not self.current_rollout:
            return None
        
        plan = self.current_rollout['plan']
        triggers = plan.rollback_triggers
        
        if metrics.error_rate > triggers.get('error_rate', 10.0):
            return f"Error rate {metrics.error_rate:.2f}% exceeds threshold {triggers['error_rate']}%"
        
        if metrics.p95_response_time > triggers.get('response_time_p95', 5000.0):
            return f"P95 response time {metrics.p95_response_time:.0f}ms exceeds threshold {triggers['response_time_p95']}ms"
        
        if metrics.p99_response_time > triggers.get('response_time_p99', 10000.0):
            return f"P99 response time {metrics.p99_response_time:.0f}ms exceeds threshold {triggers['response_time_p99']}ms"
        
        if metrics.memory_usage > triggers.get('memory_usage', 95.0):
            return f"Memory usage {metrics.memory_usage:.1f}% exceeds threshold {triggers['memory_usage']}%"
        
        if metrics.cpu_usage > triggers.get('cpu_usage', 95.0):
            return f"CPU usage {metrics.cpu_usage:.1f}% exceeds threshold {triggers['cpu_usage']}%"
        
        return None
    
    def _is_stage_complete(self, stage: RolloutStage, metrics: MetricSnapshot) -> bool:
        """Check if the current stage is complete and ready to advance."""
        # Check minimum duration
        if self.current_rollout.get('stage_start_time'):
            stage_start = datetime.fromisoformat(self.current_rollout['stage_start_time'])
            duration_elapsed = (datetime.now() - stage_start).total_seconds() / 60
            if duration_elapsed < stage.duration_minutes:
                return False
        
        # Check minimum requests
        if metrics.total_requests < stage.min_requests:
            return False
        
        # Check error rate
        if metrics.error_rate > stage.max_error_rate:
            return False
        
        # Check response time
        if metrics.p95_response_time > stage.max_response_time_p95:
            return False
        
        return True
    
    def _trigger_rollback(self, reason: str):
        """Trigger an emergency rollback."""
        if not self.current_rollout:
            return
        
        logger.warning(f"Triggering rollback: {reason}")
        
        # Disable all v5 flags
        for flag_name in self.current_rollout['target_flags']:
            try:
                self.feature_flags.disable_flag(flag_name)
                logger.info(f"Disabled flag {flag_name}")
            except Exception as e:
                logger.error(f"Failed to disable flag {flag_name}: {e}")
        
        self.current_rollout['status'] = 'rollback_triggered'
        self.current_rollout['rollback_reason'] = reason
        self.current_rollout['rollback_time'] = datetime.now().isoformat()
        self.current_rollout['completed'] = True
    
    def _complete_rollout(self):
        """Mark the rollout as completed."""
        if not self.current_rollout:
            return
        
        logger.info("Rollout completed successfully")
        self.current_rollout['status'] = 'completed'
        self.current_rollout['completion_time'] = datetime.now().isoformat()
        self.current_rollout['completed'] = True
    
    def get_rollout_status(self) -> Dict:
        """Get the current rollout status."""
        if not self.current_rollout:
            return {'status': 'no_active_rollout'}
        
        plan = self.current_rollout['plan']
        current_stage_index = self.current_rollout['current_stage']
        
        if current_stage_index < len(plan.stages):
            current_stage = plan.stages[current_stage_index]
        else:
            current_stage = None
        
        return {
            'rollout_id': self.current_rollout['id'],
            'status': self.current_rollout['status'],
            'plan_name': plan.name,
            'current_stage': current_stage.name if current_stage else 'completed',
            'current_percentage': current_stage.percentage if current_stage else 100.0,
            'start_time': self.current_rollout['start_time'],
            'stage_start_time': self.current_rollout.get('stage_start_time'),
            'target_flags': self.current_rollout['target_flags'],
            'dry_run': self.current_rollout.get('dry_run', False),
            'rollback_triggered': self.current_rollout.get('rollback_triggered', False),
            'rollback_reason': self.current_rollout.get('rollback_reason')
        }
    
    def stop_rollout(self, reason: str = "Manual stop"):
        """Stop the current rollout."""
        if not self.current_rollout:
            return {'status': 'no_active_rollout'}
        
        logger.info(f"Stopping rollout: {reason}")
        self.current_rollout['status'] = 'stopped'
        self.current_rollout['stop_reason'] = reason
        self.current_rollout['stop_time'] = datetime.now().isoformat()
        self.current_rollout['completed'] = True
        
        return {'status': 'rollout_stopped', 'reason': reason}
    
    def export_rollout_history(self, filename: Optional[str] = None) -> str:
        """Export rollout history to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"rollout_history_{timestamp}.json"
        
        data = {
            'export_timestamp': datetime.now().isoformat(),
            'rollout_count': len(self.rollout_history),
            'rollouts': self.rollout_history
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        return filename

def main():
    """Main function for the rollout manager."""
    import argparse
    
    parser = argparse.ArgumentParser(description='V5 API Rollout Manager')
    parser.add_argument('action', choices=['start', 'status', 'monitor', 'stop', 'rollback'], 
                       help='Action to perform')
    parser.add_argument('--plan', type=str, help='Rollout plan name')
    parser.add_argument('--flags', nargs='+', help='Target feature flags')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode')
    parser.add_argument('--interval', type=int, default=30, help='Monitor interval in seconds')
    parser.add_argument('--export', action='store_true', help='Export rollout history')
    
    args = parser.parse_args()
    
    manager = RolloutManager()
    
    if args.action == 'start':
        if not args.flags:
            print("Error: --flags required for start action")
            sys.exit(1)
        
        # Create default plan
        plan = manager.create_rollout_plan(
            name=args.plan or "default_rollout",
            description="Default v5 API rollout plan"
        )
        
        rollout = manager.start_rollout(plan, args.flags, args.dry_run)
        print(f"🚀 Started rollout: {rollout['id']}")
        print(f"   Plan: {plan.name}")
        print(f"   Flags: {', '.join(args.flags)}")
        print(f"   Dry run: {args.dry_run}")
    
    elif args.action == 'status':
        status = manager.get_rollout_status()
        if status['status'] == 'no_active_rollout':
            print("❌ No active rollout")
        else:
            print(f"📊 Rollout Status: {status['rollout_id']}")
            print(f"   Status: {status['status']}")
            print(f"   Plan: {status['plan_name']}")
            print(f"   Current Stage: {status['current_stage']}")
            print(f"   Percentage: {status['current_percentage']}%")
            print(f"   Target Flags: {', '.join(status['target_flags'])}")
            if status.get('rollback_triggered'):
                print(f"   ⚠️  Rollback triggered: {status.get('rollback_reason')}")
    
    elif args.action == 'monitor':
        print("🔄 Starting rollout monitoring...")
        print("Press Ctrl+C to stop")
        
        try:
            while True:
                result = manager.monitor_rollout(args.interval)
                print(f"\n📊 Monitor Result: {result['status']}")
                
                if result['status'] == 'rollback_triggered':
                    print(f"🚨 Rollback triggered: {result['reason']}")
                    break
                elif result['status'] == 'rollout_completed':
                    print("✅ Rollout completed successfully")
                    break
                elif result['status'] == 'stage_advanced':
                    print(f"⬆️  Advanced to stage: {result['new_stage']}")
                
                time.sleep(args.interval)
                
        except KeyboardInterrupt:
            print("\n👋 Monitoring stopped by user")
    
    elif args.action == 'stop':
        result = manager.stop_rollout("Manual stop requested")
        print(f"🛑 {result['status']}: {result['reason']}")
    
    elif args.action == 'rollback':
        if not manager.current_rollout:
            print("❌ No active rollout to rollback")
            sys.exit(1)
        
        manager._trigger_rollback("Manual rollback requested")
        print("🔄 Rollback triggered")
    
    if args.export:
        filename = manager.export_rollout_history()
        print(f"📁 Rollout history exported to: {filename}")

if __name__ == '__main__':
    main()
