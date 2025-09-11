#!/usr/bin/env python3
"""
V5 API Rollout Script

This script gradually enables v5 APIs using the feature flag system.
It provides a safe, controlled rollout process with monitoring and rollback capabilities.
"""

import os
import sys
import time
import json
from datetime import datetime
from typing import Dict, List, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.feature_flags_v5 import FeatureFlagsV5, FeatureFlagStageV5
from utils.logging_config import get_logger

logger = get_logger(__name__)

class V5RolloutManager:
    """Manages the gradual rollout of v5 APIs."""
    
    def __init__(self):
        self.feature_flags = FeatureFlagsV5()
        self.rollout_stages = [
            {
                'name': 'Initial Testing',
                'stage': FeatureFlagStageV5.TESTING,
                'rollout_percentage': 5.0,
                'flags': ['v5_api_enabled', 'auth_v5', 'rate_limit_v5', 'idempotency_v5', 'observability_v5']
            },
            {
                'name': 'Canary Release',
                'stage': FeatureFlagStageV5.CANARY,
                'rollout_percentage': 15.0,
                'flags': ['entity_api_v5', 'cursor_pagination_v5', 'etag_caching_v5', 'search_api_v5']
            },
            {
                'name': 'Partial Rollout',
                'stage': FeatureFlagStageV5.PARTIAL,
                'rollout_percentage': 40.0,
                'flags': ['redis_caching_v5', 'connection_pooling_v5', 'circuit_breaker_v5']
            },
            {
                'name': 'Majority Rollout',
                'stage': FeatureFlagStageV5.MAJORITY,
                'rollout_percentage': 80.0,
                'flags': ['admin_api_v5', 'monitoring_api_v5', 'webhook_api_v5']
            },
            {
                'name': 'Full Rollout',
                'stage': FeatureFlagStageV5.FULL,
                'rollout_percentage': 100.0,
                'flags': ['query_optimization_v5', 'enhanced_rbac_v5']
            }
        ]
    
    def get_current_status(self) -> Dict[str, Any]:
        """Get current rollout status."""
        return self.feature_flags.get_migration_status()
    
    def enable_stage(self, stage_name: str, dry_run: bool = False) -> Dict[str, Any]:
        """Enable a specific rollout stage."""
        stage_config = next((s for s in self.rollout_stages if s['name'] == stage_name), None)
        if not stage_config:
            raise ValueError(f"Unknown stage: {stage_name}")
        
        results = {
            'stage': stage_name,
            'timestamp': datetime.now().isoformat(),
            'dry_run': dry_run,
            'changes': []
        }
        
        logger.info(f"{'[DRY RUN] ' if dry_run else ''}Enabling stage: {stage_name}")
        
        for flag_name in stage_config['flags']:
            if flag_name in self.feature_flags.flags:
                old_stage = self.feature_flags.flags[flag_name]['stage']
                old_rollout = self.feature_flags.flags[flag_name]['rollout_percentage']
                
                if not dry_run:
                    self.feature_flags.set_stage(flag_name, stage_config['stage'])
                    self.feature_flags.flags[flag_name]['rollout_percentage'] = stage_config['rollout_percentage']
                
                results['changes'].append({
                    'flag': flag_name,
                    'old_stage': old_stage.value,
                    'new_stage': stage_config['stage'].value,
                    'old_rollout': old_rollout,
                    'new_rollout': stage_config['rollout_percentage']
                })
                
                logger.info(f"{'[DRY RUN] ' if dry_run else ''}Flag {flag_name}: {old_stage.value} -> {stage_config['stage'].value} ({stage_config['rollout_percentage']}%)")
            else:
                logger.warning(f"Flag {flag_name} not found in configuration")
        
        return results
    
    def rollback_stage(self, stage_name: str, dry_run: bool = False) -> Dict[str, Any]:
        """Rollback a specific rollout stage."""
        stage_config = next((s for s in self.rollout_stages if s['name'] == stage_name), None)
        if not stage_config:
            raise ValueError(f"Unknown stage: {stage_name}")
        
        results = {
            'stage': stage_name,
            'timestamp': datetime.now().isoformat(),
            'dry_run': dry_run,
            'rollback': True,
            'changes': []
        }
        
        logger.info(f"{'[DRY RUN] ' if dry_run else ''}Rolling back stage: {stage_name}")
        
        for flag_name in stage_config['flags']:
            if flag_name in self.feature_flags.flags:
                old_stage = self.feature_flags.flags[flag_name]['stage']
                old_rollout = self.feature_flags.flags[flag_name]['rollout_percentage']
                
                if not dry_run:
                    # Rollback to previous stage
                    if old_stage == FeatureFlagStageV5.FULL:
                        new_stage = FeatureFlagStageV5.MAJORITY
                    elif old_stage == FeatureFlagStageV5.MAJORITY:
                        new_stage = FeatureFlagStageV5.PARTIAL
                    elif old_stage == FeatureFlagStageV5.PARTIAL:
                        new_stage = FeatureFlagStageV5.CANARY
                    elif old_stage == FeatureFlagStageV5.CANARY:
                        new_stage = FeatureFlagStageV5.TESTING
                    else:
                        new_stage = FeatureFlagStageV5.DISABLED
                    
                    self.feature_flags.set_stage(flag_name, new_stage)
                    self.feature_flags.flags[flag_name]['rollout_percentage'] = max(0, old_rollout - 20)
                
                results['changes'].append({
                    'flag': flag_name,
                    'old_stage': old_stage.value,
                    'new_stage': new_stage.value if not dry_run else 'ROLLBACK',
                    'old_rollout': old_rollout,
                    'new_rollout': max(0, old_rollout - 20) if not dry_run else 'ROLLBACK'
                })
                
                logger.info(f"{'[DRY RUN] ' if dry_run else ''}Flag {flag_name}: {old_stage.value} -> {new_stage.value if not dry_run else 'ROLLBACK'}")
        
        return results
    
    def emergency_disable(self, flag_name: str = None) -> Dict[str, Any]:
        """Emergency disable all v5 features or a specific flag."""
        results = {
            'timestamp': datetime.now().isoformat(),
            'emergency_disable': True,
            'disabled_flags': []
        }
        
        if flag_name:
            if flag_name in self.feature_flags.flags:
                self.feature_flags.emergency_disable(flag_name)
                results['disabled_flags'].append(flag_name)
                logger.critical(f"EMERGENCY DISABLE: {flag_name}")
            else:
                logger.error(f"Flag {flag_name} not found")
        else:
            # Disable all v5 flags
            for flag_name in self.feature_flags.flags:
                self.feature_flags.emergency_disable(flag_name)
                results['disabled_flags'].append(flag_name)
                logger.critical(f"EMERGENCY DISABLE: {flag_name}")
        
        return results
    
    def monitor_rollout(self, duration_minutes: int = 5) -> Dict[str, Any]:
        """Monitor rollout for a specified duration."""
        logger.info(f"Starting {duration_minutes}-minute rollout monitoring")
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        monitoring_data = {
            'start_time': datetime.now().isoformat(),
            'duration_minutes': duration_minutes,
            'status_checks': []
        }
        
        while time.time() < end_time:
            status = self.get_current_status()
            monitoring_data['status_checks'].append({
                'timestamp': datetime.now().isoformat(),
                'status': status
            })
            
            # Log key metrics
            overall = status['overall_status']
            logger.info(f"Rollout Status: {overall['enabled_flags']}/{overall['total_flags']} flags enabled ({overall['migration_progress']:.1f}% progress)")
            
            time.sleep(30)  # Check every 30 seconds
        
        monitoring_data['end_time'] = datetime.now().isoformat()
        logger.info("Rollout monitoring completed")
        
        return monitoring_data

def main():
    """Main CLI interface for rollout management."""
    import argparse
    
    parser = argparse.ArgumentParser(description='V5 API Rollout Manager')
    parser.add_argument('action', choices=['status', 'enable', 'rollback', 'emergency', 'monitor'], 
                       help='Action to perform')
    parser.add_argument('--stage', help='Stage name for enable/rollback actions')
    parser.add_argument('--flag', help='Specific flag name for emergency disable')
    parser.add_argument('--dry-run', action='store_true', help='Perform a dry run without making changes')
    parser.add_argument('--duration', type=int, default=5, help='Monitoring duration in minutes')
    parser.add_argument('--output', help='Output file for results (JSON)')
    
    args = parser.parse_args()
    
    manager = V5RolloutManager()
    
    try:
        if args.action == 'status':
            result = manager.get_current_status()
            print(json.dumps(result, indent=2))
            
        elif args.action == 'enable':
            if not args.stage:
                print("Error: --stage required for enable action")
                sys.exit(1)
            result = manager.enable_stage(args.stage, args.dry_run)
            print(json.dumps(result, indent=2))
            
        elif args.action == 'rollback':
            if not args.stage:
                print("Error: --stage required for rollback action")
                sys.exit(1)
            result = manager.rollback_stage(args.stage, args.dry_run)
            print(json.dumps(result, indent=2))
            
        elif args.action == 'emergency':
            result = manager.emergency_disable(args.flag)
            print(json.dumps(result, indent=2))
            
        elif args.action == 'monitor':
            result = manager.monitor_rollout(args.duration)
            print(json.dumps(result, indent=2))
        
        # Save output to file if specified
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"Results saved to {args.output}")
            
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
