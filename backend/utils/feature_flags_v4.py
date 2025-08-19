#!/usr/bin/env python3
"""Feature flags for v4 API migration.

This module provides feature flags to control the gradual migration from v3 to v4 APIs.
It allows for A/B testing, gradual rollout, and easy rollback if needed.

Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""

import os
import json
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from enum import Enum

from utils.logging_config import get_logger

logger = get_logger(__name__)

class MigrationStage(Enum):
    """Migration stages for the v4 API."""
    DISABLED = "disabled"
    TESTING = "testing"
    PARTIAL = "partial"
    FULL = "full"
    COMPLETE = "complete"

class APIV4FeatureFlags:
    """Feature flag manager for v4 API migration."""
    
    def __init__(self):
        self.flags = {
            "api_v4_enabled": {
                "default": False,
                "description": "Enable v4 API endpoints",
                "stage": MigrationStage.DISABLED
            },
            "api_v4_restaurants": {
                "default": False,
                "description": "Enable v4 restaurant endpoints",
                "stage": MigrationStage.DISABLED
            },
            "api_v4_reviews": {
                "default": False,
                "description": "Enable v4 review endpoints",
                "stage": MigrationStage.DISABLED
            },
            "api_v4_users": {
                "default": False,
                "description": "Enable v4 user endpoints",
                "stage": MigrationStage.DISABLED
            },
            "api_v4_statistics": {
                "default": False,
                "description": "Enable v4 statistics endpoints",
                "stage": MigrationStage.DISABLED
            },
            "api_v4_cache": {
                "default": True,
                "description": "Enable v4 caching layer",
                "stage": MigrationStage.TESTING
            },
            "api_v4_validation": {
                "default": True,
                "description": "Enable enhanced validation in v4",
                "stage": MigrationStage.TESTING
            },
            "api_v4_error_handling": {
                "default": True,
                "description": "Enable enhanced error handling in v4",
                "stage": MigrationStage.TESTING
            },
            "api_v4_marketplace": {
                "default": True,
                "description": "Enable streamlined marketplace endpoints",
                "stage": MigrationStage.TESTING
            }
        }
        self._load_from_env()
    
    def _load_from_env(self):
        """Load feature flags from environment variables."""
        for flag_name in self.flags:
            env_var = f"API_V4_{flag_name.upper()}"
            if env_var in os.environ:
                try:
                    value = os.environ[env_var].lower()
                    if value in ('true', '1', 'yes', 'on'):
                        self.flags[flag_name]["default"] = True
                    elif value in ('false', '0', 'no', 'off'):
                        self.flags[flag_name]["default"] = False
                    logger.info(f"Loaded feature flag from env: {flag_name}={self.flags[flag_name]['default']}")
                except Exception as e:
                    logger.warning(f"Failed to parse feature flag {flag_name}: {e}")
    
    def is_enabled(self, flag_name: str, user_id: Optional[str] = None) -> bool:
        """Check if a feature flag is enabled."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown feature flag: {flag_name}")
            return False
        
        flag = self.flags[flag_name]
        
        # Check user override first
        if user_id and self._get_user_override(flag_name, user_id):
            return True
        
        # Check percentage rollout
        if self._is_percentage_rollout(flag_name, user_id):
            return True
        
        # Check stage - if stage is not DISABLED, consider it enabled
        if flag["stage"] != MigrationStage.DISABLED:
            return True
        
        # Return default value
        return flag["default"]
    
    def _get_user_override(self, flag_name: str, user_id: str) -> bool:
        """Check if user has a specific override for this flag."""
        env_var = f"API_V4_{flag_name.upper()}_USER_{user_id}"
        if env_var in os.environ:
            value = os.environ[env_var].lower()
            return value in ('true', '1', 'yes', 'on')
        return False
    
    def _is_percentage_rollout(self, flag_name: str, user_id: Optional[str] = None) -> bool:
        """Check if user is in the percentage rollout for this flag."""
        if not user_id:
            return False
        
        # Get rollout percentage from environment
        env_var = f"API_V4_{flag_name.upper()}_ROLLOUT"
        if env_var not in os.environ:
            return False
        
        try:
            rollout_percentage = float(os.environ[env_var])
            if rollout_percentage <= 0 or rollout_percentage > 100:
                return False
            
            # Use consistent hashing to determine user assignment
            hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
            user_percentage = (hash_value % 100) + 1
            
            return user_percentage <= rollout_percentage
            
        except (ValueError, TypeError):
            logger.warning(f"Invalid rollout percentage for {flag_name}")
            return False
    
    def get_stage(self, flag_name: str) -> MigrationStage:
        """Get the current stage for a feature flag."""
        if flag_name not in self.flags:
            return MigrationStage.DISABLED
        
        return self.flags[flag_name]["stage"]
    
    def set_stage(self, flag_name: str, stage: MigrationStage):
        """Set the stage for a feature flag."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown feature flag: {flag_name}")
            return
        
        self.flags[flag_name]["stage"] = stage
        logger.info(f"Set feature flag {flag_name} to stage: {stage.value}")
    
    def get_all_flags(self) -> Dict[str, Any]:
        """Get all feature flags and their current states."""
        return {
            name: {
                "enabled": self.is_enabled(name),
                "description": flag["description"],
                "stage": flag["stage"].value
            }
            for name, flag in self.flags.items()
        }
    
    def enable_flag(self, flag_name: str):
        """Enable a feature flag."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown feature flag: {flag_name}")
            return
        
        self.flags[flag_name]["default"] = True
        logger.info(f"Enabled feature flag: {flag_name}")
    
    def disable_flag(self, flag_name: str):
        """Disable a feature flag."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown feature flag: {flag_name}")
            return
        
        self.flags[flag_name]["default"] = False
        logger.info(f"Disabled feature flag: {flag_name}")
    
    def set_rollout_percentage(self, flag_name: str, percentage: float):
        """Set the rollout percentage for a feature flag."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown feature flag: {flag_name}")
            return
        
        if percentage < 0 or percentage > 100:
            logger.warning(f"Invalid rollout percentage: {percentage}")
            return
        
        env_var = f"API_V4_{flag_name.upper()}_ROLLOUT"
        os.environ[env_var] = str(percentage)
        logger.info(f"Set rollout percentage for {flag_name}: {percentage}%")

# Global instance
api_v4_flags = APIV4FeatureFlags()

def require_api_v4_flag(flag_name: str, default: bool = False):
    """Decorator to require a v4 API feature flag."""
    def decorator(f):
        def wrapper(*args, **kwargs):
            try:
                from flask import request
                user_id = None
                
                # Try to get user ID from request
                if hasattr(request, 'user_id'):
                    user_id = request.user_id
                elif hasattr(request, 'headers') and 'X-User-ID' in request.headers:
                    user_id = request.headers['X-User-ID']
                
                if api_v4_flags.is_enabled(flag_name, user_id):
                    return f(*args, **kwargs)
                else:
                    return _handle_fallback(flag_name, default)
                    
            except Exception as e:
                logger.error(f"Error checking feature flag {flag_name}: {e}")
                return _handle_fallback(flag_name, default)
        
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

def _handle_fallback(flag_name: str, default: bool):
    """Handle fallback when feature flag is disabled."""
    if default:
        # Return a default response
        try:
            from flask import jsonify
            return jsonify({
                "success": False,
                "error": f"Feature {flag_name} is not enabled",
                "status_code": 503
            }), 503
        except ImportError:
            return {"error": f"Feature {flag_name} is not enabled"}, 503
    else:
        # Return 404 or similar
        try:
            from flask import jsonify
            return jsonify({
                "success": False,
                "error": "Endpoint not found",
                "status_code": 404
            }), 404
        except ImportError:
            return {"error": "Endpoint not found"}, 404

def get_migration_status() -> Dict[str, Any]:
    """Get the current migration status."""
    flags = api_v4_flags.get_all_flags()
    
    # Calculate overall status
    enabled_count = sum(1 for flag in flags.values() if flag["enabled"])
    total_count = len(flags)
    
    return {
        "timestamp": datetime.now().isoformat(),
        "overall_status": {
            "enabled_features": enabled_count,
            "total_features": total_count,
            "migration_percentage": (enabled_count / total_count) * 100 if total_count > 0 else 0
        },
        "feature_flags": flags,
        "stages": {
            "disabled": sum(1 for flag in flags.values() if flag["stage"] == "disabled"),
            "testing": sum(1 for flag in flags.values() if flag["stage"] == "testing"),
            "partial": sum(1 for flag in flags.values() if flag["stage"] == "partial"),
            "full": sum(1 for flag in flags.values() if flag["stage"] == "full"),
            "complete": sum(1 for flag in flags.values() if flag["stage"] == "complete")
        }
    }

def migrate_stage(flag_name: str, target_stage: MigrationStage):
    """Migrate a feature flag to a specific stage."""
    api_v4_flags.set_stage(flag_name, target_stage)
    
    # Update default value based on stage
    if target_stage in [MigrationStage.TESTING, MigrationStage.PARTIAL, MigrationStage.FULL, MigrationStage.COMPLETE]:
        api_v4_flags.enable_flag(flag_name)
    else:
        api_v4_flags.disable_flag(flag_name)
    
    logger.info(f"Migrated {flag_name} to {target_stage.value}")

def bulk_migrate_stage(flag_prefix: str, target_stage: MigrationStage):
    """Migrate all flags with a specific prefix to a target stage."""
    migrated_count = 0
    
    for flag_name in api_v4_flags.flags:
        if flag_name.startswith(flag_prefix):
            migrate_stage(flag_name, target_stage)
            migrated_count += 1
    
    logger.info(f"Bulk migrated {migrated_count} flags with prefix '{flag_prefix}' to {target_stage.value}")
    return migrated_count

def enable_testing_mode():
    """Enable testing mode for all v4 features."""
    bulk_migrate_stage("api_v4_", MigrationStage.TESTING)
    logger.info("Enabled testing mode for all v4 features")

def enable_partial_rollout():
    """Enable partial rollout for all v4 features."""
    bulk_migrate_stage("api_v4_", MigrationStage.PARTIAL)
    logger.info("Enabled partial rollout for all v4 features")

def enable_full_rollout():
    """Enable full rollout for all v4 features."""
    bulk_migrate_stage("api_v4_", MigrationStage.FULL)
    logger.info("Enabled full rollout for all v4 features")

def complete_migration():
    """Complete the migration for all v4 features."""
    bulk_migrate_stage("api_v4_", MigrationStage.COMPLETE)
    logger.info("Completed migration for all v4 features")

def rollback_migration():
    """Rollback all v4 API flags to disabled."""
    return bulk_migrate_stage("api_v4_", MigrationStage.DISABLED)
