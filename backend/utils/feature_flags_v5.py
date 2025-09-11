"""
Enhanced feature flag system for v5 API consolidation and gradual migration.

Provides comprehensive feature flag management with percentage-based rollout,
user targeting, A/B testing capabilities, dependency management, and emergency
rollback mechanisms. Built upon existing v4 patterns with v5 enhancements.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union

from utils.logging_config import get_logger

logger = get_logger(__name__)


class FeatureFlagStageV5(Enum):
    """Enhanced migration stages for v5 API."""
    
    DISABLED = "disabled"           # Feature completely off
    DEVELOPMENT = "development"     # Only for dev/staging environments
    TESTING = "testing"            # Limited internal testing (5%)
    CANARY = "canary"              # Small production rollout (10-20%)
    PARTIAL = "partial"            # Gradual rollout (25-50%)
    MAJORITY = "majority"          # Most users (75-90%)
    FULL = "full"                  # All users (100%)
    DEPRECATED = "deprecated"      # Marked for removal


class FeatureFlagType(Enum):
    """Types of feature flags."""
    
    KILL_SWITCH = "kill_switch"    # Emergency disable capability
    ROLLOUT = "rollout"           # Gradual feature rollout
    EXPERIMENT = "experiment"      # A/B testing
    CONFIG = "config"             # Configuration toggle
    MIGRATION = "migration"        # API migration control


class FeatureFlagsV5:
    """Enhanced feature flag manager for v5 API consolidation."""
    
    def __init__(self):
        self._load_environment_config()
        self.flags = self._initialize_v5_flags()
        self.dependencies = self._initialize_flag_dependencies()
        self._load_flags_from_env()
        self._validate_flag_dependencies()
    
    def _initialize_v5_flags(self) -> Dict[str, Dict[str, Any]]:
        """Initialize all v5 feature flags with their configurations."""
        return {
            # Core v5 Infrastructure
            "v5_api_enabled": {
                "type": FeatureFlagType.KILL_SWITCH,
                "stage": FeatureFlagStageV5.FULL,
                "default": True,
                "description": "Master switch for v5 API endpoints",
                "rollout_percentage": 100.0,
                "environments": ["development", "staging", "production"],
                "emergency_disable": True,
                "depends_on": []
            },
            
            # Middleware Components
            "auth_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.FULL,
                "default": True,
                "description": "Enhanced v5 authentication middleware",
                "rollout_percentage": 100.0,
                "depends_on": ["v5_api_enabled"]
            },
            
            "rate_limit_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.TESTING,
                "default": True,
                "description": "Token bucket rate limiting for v5",
                "rollout_percentage": 10.0,
                "depends_on": ["v5_api_enabled"]
            },
            
            "idempotency_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.TESTING,
                "default": True,
                "description": "Request idempotency for v5 API",
                "rollout_percentage": 15.0,
                "depends_on": ["v5_api_enabled"]
            },
            
            "observability_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.TESTING,
                "default": True,
                "description": "OpenTelemetry observability for v5",
                "rollout_percentage": 20.0,
                "depends_on": ["v5_api_enabled"]
            },
            
            # API Endpoint Flags
            "auth_api_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.FULL,
                "default": True,
                "description": "V5 authentication API endpoints",
                "rollout_percentage": 100.0,
                "depends_on": ["v5_api_enabled", "auth_v5"]
            },
            
            # Legacy Compatibility Flags
            "auth_v5_for_legacy": {
                "type": FeatureFlagType.CONFIG,
                "stage": FeatureFlagStageV5.FULL,
                "default": False,
                "description": "Enable v5 auth middleware for legacy endpoints",
                "rollout_percentage": 0.0,
                "depends_on": ["auth_v5"]
            },
            
            "rate_limit_v5_for_legacy": {
                "type": FeatureFlagType.CONFIG,
                "stage": FeatureFlagStageV5.FULL,
                "default": False,
                "description": "Enable v5 rate limiting for legacy endpoints",
                "rollout_percentage": 0.0,
                "depends_on": ["rate_limit_v5"]
            },
            
            "observability_v5_for_legacy": {
                "type": FeatureFlagType.CONFIG,
                "stage": FeatureFlagStageV5.FULL,
                "default": False,
                "description": "Enable v5 observability for legacy endpoints",
                "rollout_percentage": 0.0,
                "depends_on": ["observability_v5"]
            },
            
            # API Consolidation Features
            "entity_api_v5": {
                "type": FeatureFlagType.MIGRATION,
                "stage": FeatureFlagStageV5.FULL,
                "default": True,
                "description": "Unified entity API (restaurants, synagogues, mikvah, stores)",
                "rollout_percentage": 100.0,
                "depends_on": ["v5_api_enabled", "auth_v5"]
            },
            
            "cursor_pagination_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.TESTING,
                "default": True,
                "description": "Enhanced cursor pagination with canonicalization",
                "rollout_percentage": 15.0,
                "depends_on": ["entity_api_v5"]
            },
            
            "etag_caching_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.TESTING,
                "default": True,
                "description": "Watermark-based ETag caching system",
                "rollout_percentage": 20.0,
                "depends_on": ["entity_api_v5"]
            },
            
            "search_api_v5": {
                "type": FeatureFlagType.MIGRATION,
                "stage": FeatureFlagStageV5.FULL,
                "default": True,
                "description": "Unified search API across all entity types",
                "rollout_percentage": 100.0,
                "depends_on": ["entity_api_v5"]
            },
            
            "admin_api_v5": {
                "type": FeatureFlagType.MIGRATION,
                "stage": FeatureFlagStageV5.TESTING,
                "default": False,
                "description": "Consolidated admin API endpoints",
                "rollout_percentage": 5.0,
                "depends_on": ["v5_api_enabled", "auth_v5"],
                "user_segments": ["admin", "super_admin"]
            },
            
            "monitoring_api_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.TESTING,
                "default": True,
                "description": "Consolidated monitoring and health endpoints",
                "rollout_percentage": 100.0,
                "depends_on": ["v5_api_enabled"],
                "user_segments": ["admin", "super_admin", "moderator"]
            },
            
            "webhook_api_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.TESTING,
                "default": True,
                "description": "Unified webhook handling",
                "rollout_percentage": 50.0,
                "depends_on": ["v5_api_enabled"]
            },
            
            # Legacy Compatibility
            "v4_fallback": {
                "type": FeatureFlagType.CONFIG,
                "stage": FeatureFlagStageV5.FULL,
                "default": True,
                "description": "Fallback to v4 APIs when v5 fails",
                "rollout_percentage": 100.0,
                "depends_on": []
            },
            
            "legacy_route_support": {
                "type": FeatureFlagType.CONFIG,
                "stage": FeatureFlagStageV5.FULL,
                "default": True,
                "description": "Support legacy route patterns during migration",
                "rollout_percentage": 100.0,
                "depends_on": []
            },
            
            # Performance and Optimization
            "redis_caching_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.PARTIAL,
                "default": True,
                "description": "Enhanced Redis caching for v5",
                "rollout_percentage": 40.0,
                "depends_on": ["v5_api_enabled"]
            },
            
            "connection_pooling_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.PARTIAL,
                "default": True,
                "description": "Enhanced database connection pooling",
                "rollout_percentage": 50.0,
                "depends_on": ["v5_api_enabled"]
            },
            
            "query_optimization_v5": {
                "type": FeatureFlagType.EXPERIMENT,
                "stage": FeatureFlagStageV5.CANARY,
                "default": False,
                "description": "Experimental query optimizations",
                "rollout_percentage": 15.0,
                "depends_on": ["entity_api_v5"],
                "experiment_variants": ["control", "optimized_queries", "cached_queries"]
            },
            
            # Security Enhancements
            "enhanced_rbac_v5": {
                "type": FeatureFlagType.ROLLOUT,
                "stage": FeatureFlagStageV5.TESTING,
                "default": False,
                "description": "Enhanced role-based access control",
                "rollout_percentage": 10.0,
                "depends_on": ["auth_v5"]
            },
            
            "pii_masking_v5": {
                "type": FeatureFlagType.CONFIG,
                "stage": FeatureFlagStageV5.FULL,
                "default": True,
                "description": "PII masking in logs and traces",
                "rollout_percentage": 100.0,
                "depends_on": ["observability_v5"]
            },
            
            # Emergency Controls
            "emergency_readonly_mode": {
                "type": FeatureFlagType.KILL_SWITCH,
                "stage": FeatureFlagStageV5.FULL,
                "default": False,
                "description": "Emergency read-only mode for all APIs",
                "rollout_percentage": 0.0,
                "emergency_disable": False,
                "depends_on": []
            },
            
            "circuit_breaker_v5": {
                "type": FeatureFlagType.CONFIG,
                "stage": FeatureFlagStageV5.PARTIAL,
                "default": True,
                "description": "Circuit breaker for external services",
                "rollout_percentage": 60.0,
                "depends_on": ["v5_api_enabled"]
            }
        }
    
    def _initialize_flag_dependencies(self) -> Dict[str, Set[str]]:
        """Initialize flag dependency relationships."""
        dependencies = {}
        for flag_name, config in self.flags.items():
            deps = set(config.get("depends_on", []))
            dependencies[flag_name] = deps
        return dependencies
    
    def _load_environment_config(self):
        """Load environment configuration."""
        self.environment = os.getenv("FLASK_ENV", "development")
        self.deployment_mode = os.getenv("DEPLOYMENT_MODE", "local")
        
        # Load .env file if it exists
        self._load_env_file()
    
    def _load_env_file(self):
        """Load environment variables from .env file."""
        env_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            os.path.join(os.path.dirname(__file__), "..", "config.env")
        ]
        
        for env_path in env_paths:
            if os.path.exists(env_path):
                try:
                    with open(env_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                key, value = key.strip(), value.strip()
                                
                                # Remove quotes if present
                                if (value.startswith('"') and value.endswith('"')) or \
                                   (value.startswith("'") and value.endswith("'")):
                                    value = value[1:-1]
                                
                                # Only set if not already in environment
                                if key not in os.environ:
                                    os.environ[key] = value
                    
                    logger.info(f"Loaded environment variables from {env_path}")
                    break
                except Exception as e:
                    logger.warning(f"Failed to load .env file {env_path}: {e}")
    
    def _load_flags_from_env(self):
        """Load feature flag overrides from environment variables."""
        for flag_name in self.flags:
            # Check for environment variable override
            env_var_name = f"FEATURE_FLAG_V5_{flag_name.upper()}"
            if env_var_name in os.environ:
                try:
                    value = os.environ[env_var_name].lower()
                    self.flags[flag_name]["default"] = value in ("true", "1", "yes", "on")
                    logger.info(f"Override from env: {flag_name}={self.flags[flag_name]['default']}")
                except Exception as e:
                    logger.warning(f"Failed to parse feature flag {flag_name}: {e}")
            
            # Check for rollout percentage override
            rollout_var_name = f"FEATURE_FLAG_V5_{flag_name.upper()}_ROLLOUT"
            if rollout_var_name in os.environ:
                try:
                    rollout = float(os.environ[rollout_var_name])
                    if 0 <= rollout <= 100:
                        self.flags[flag_name]["rollout_percentage"] = rollout
                        logger.info(f"Rollout override: {flag_name}={rollout}%")
                except Exception as e:
                    logger.warning(f"Failed to parse rollout percentage for {flag_name}: {e}")
    
    def _validate_flag_dependencies(self):
        """Validate that all flag dependencies are satisfied."""
        for flag_name, deps in self.dependencies.items():
            for dep in deps:
                if dep not in self.flags:
                    logger.error(f"Flag {flag_name} depends on unknown flag: {dep}")
                    # Set flag to disabled if dependency is missing
                    self.flags[flag_name]["default"] = False
                    self.flags[flag_name]["stage"] = FeatureFlagStageV5.DISABLED
    
    def is_enabled(
        self,
        flag_name: str,
        user_id: Optional[str] = None,
        user_roles: Optional[List[str]] = None,
        environment: Optional[str] = None,
        default: bool = False
    ) -> bool:
        """
        Check if a feature flag is enabled for the given context.
        
        Args:
            flag_name: Name of the feature flag
            user_id: User ID for percentage rollout calculation
            user_roles: User roles for segment targeting
            environment: Override environment (defaults to current)
            default: Default value if flag doesn't exist
            
        Returns:
            True if flag is enabled, False otherwise
        """
        if flag_name not in self.flags:
            logger.warning(f"Unknown v5 feature flag: {flag_name}")
            return default
        
        flag_config = self.flags[flag_name]
        
        # Check emergency disable
        if flag_config.get("emergency_disable") and self._is_emergency_disabled(flag_name):
            logger.info(f"Feature flag {flag_name} emergency disabled")
            return False
        
        # Check environment constraints
        env = environment or self.environment
        allowed_envs = flag_config.get("environments", ["development", "staging", "production"])
        if env not in allowed_envs:
            return False
        
        # Check dependencies
        if not self._check_dependencies(flag_name, user_id, user_roles, environment):
            return False
        
        # Check user segment targeting
        if not self._check_user_segment(flag_config, user_roles):
            return False
        
        # Check user-specific override
        if user_id and self._get_user_override(flag_name, user_id):
            return True
        
        # Check percentage rollout
        if user_id and self._is_in_rollout_percentage(flag_name, user_id, flag_config):
            return True
        
        # Check stage-based enablement
        stage = flag_config["stage"]
        if stage == FeatureFlagStageV5.DISABLED:
            return False
        elif stage == FeatureFlagStageV5.DEVELOPMENT:
            return env in ["development"]
        elif stage in [FeatureFlagStageV5.FULL, FeatureFlagStageV5.DEPRECATED]:
            return flag_config["default"]
        else:
            # For testing/canary/partial/majority stages, use rollout percentage
            if user_id:
                return self._is_in_rollout_percentage(flag_name, user_id, flag_config)
            else:
                # Anonymous users get default behavior for non-rollout stages
                return flag_config["default"]
    
    def get_experiment_variant(
        self,
        flag_name: str,
        user_id: str,
        default_variant: str = "control"
    ) -> str:
        """
        Get experiment variant for A/B testing flags.
        
        Args:
            flag_name: Name of the experiment flag
            user_id: User ID for consistent variant assignment
            default_variant: Default variant if flag not enabled
            
        Returns:
            Variant name
        """
        if not self.is_enabled(flag_name, user_id=user_id):
            return default_variant
        
        flag_config = self.flags.get(flag_name, {})
        variants = flag_config.get("experiment_variants", [default_variant])
        
        if len(variants) <= 1:
            return variants[0] if variants else default_variant
        
        # Use consistent hashing for variant assignment
        hash_input = f"{flag_name}:{user_id}:variants"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        variant_index = hash_value % len(variants)
        
        return variants[variant_index]
    
    def _check_dependencies(
        self,
        flag_name: str,
        user_id: Optional[str],
        user_roles: Optional[List[str]],
        environment: Optional[str]
    ) -> bool:
        """Check if all dependencies for a flag are satisfied."""
        deps = self.dependencies.get(flag_name, set())
        
        for dep in deps:
            if not self.is_enabled(dep, user_id, user_roles, environment):
                logger.debug(f"Flag {flag_name} disabled due to dependency {dep}")
                return False
        
        return True
    
    def _check_user_segment(self, flag_config: Dict[str, Any], user_roles: Optional[List[str]]) -> bool:
        """Check if user belongs to required segments."""
        required_segments = flag_config.get("user_segments")
        if not required_segments:
            return True  # No segment restriction
        
        if not user_roles:
            return False  # User has no roles but flag requires segments
        
        # Check if user has any of the required roles
        return any(role in required_segments for role in user_roles)
    
    def _get_user_override(self, flag_name: str, user_id: str) -> bool:
        """Check if user has a specific override for this flag."""
        env_var = f"FEATURE_FLAG_V5_{flag_name.upper()}_USER_{user_id}"
        if env_var in os.environ:
            value = os.environ[env_var].lower()
            return value in ("true", "1", "yes", "on")
        return False
    
    def _is_in_rollout_percentage(
        self,
        flag_name: str,
        user_id: str,
        flag_config: Dict[str, Any]
    ) -> bool:
        """Check if user is in the rollout percentage for this flag."""
        rollout_percentage = flag_config.get("rollout_percentage", 0.0)
        
        if rollout_percentage <= 0:
            return False
        if rollout_percentage >= 100:
            return True
        
        # Use consistent hashing to determine user assignment
        hash_input = f"{flag_name}:{user_id}:rollout"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        user_percentage = (hash_value % 10000) / 100.0  # 0.00-99.99
        
        return user_percentage < rollout_percentage
    
    def _is_emergency_disabled(self, flag_name: str) -> bool:
        """Check if flag is emergency disabled."""
        env_var = f"EMERGENCY_DISABLE_{flag_name.upper()}"
        if env_var in os.environ:
            value = os.environ[env_var].lower()
            return value in ("true", "1", "yes", "on")
        return False
    
    def get_flag_info(self, flag_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a feature flag."""
        if flag_name not in self.flags:
            return None
        
        config = self.flags[flag_name].copy()
        config["dependencies"] = list(self.dependencies.get(flag_name, set()))
        config["emergency_disabled"] = self._is_emergency_disabled(flag_name)
        
        return config
    
    def get_all_flags(self, user_id: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
        """Get all feature flags and their current states."""
        result = {}
        
        for flag_name in self.flags:
            config = self.get_flag_info(flag_name)
            if config:
                result[flag_name] = {
                    "enabled": self.is_enabled(flag_name, user_id=user_id),
                    "type": config["type"].value,
                    "stage": config["stage"].value,
                    "description": config["description"],
                    "rollout_percentage": config.get("rollout_percentage", 0.0),
                    "dependencies": config["dependencies"],
                    "emergency_disabled": config["emergency_disabled"]
                }
        
        return result
    
    def set_stage(self, flag_name: str, stage: FeatureFlagStageV5):
        """Set the stage for a feature flag."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown v5 feature flag: {flag_name}")
            return
        
        old_stage = self.flags[flag_name]["stage"]
        self.flags[flag_name]["stage"] = stage
        
        # Auto-adjust rollout percentage based on stage
        rollout_percentages = {
            FeatureFlagStageV5.DISABLED: 0.0,
            FeatureFlagStageV5.DEVELOPMENT: 0.0,
            FeatureFlagStageV5.TESTING: 5.0,
            FeatureFlagStageV5.CANARY: 15.0,
            FeatureFlagStageV5.PARTIAL: 40.0,
            FeatureFlagStageV5.MAJORITY: 80.0,
            FeatureFlagStageV5.FULL: 100.0,
            FeatureFlagStageV5.DEPRECATED: 100.0,
        }
        
        if stage in rollout_percentages:
            self.flags[flag_name]["rollout_percentage"] = rollout_percentages[stage]
        
        logger.info(f"Changed flag {flag_name} stage: {old_stage.value} -> {stage.value}")
    
    def emergency_disable(self, flag_name: str):
        """Emergency disable a feature flag."""
        if flag_name not in self.flags:
            logger.warning(f"Unknown v5 feature flag: {flag_name}")
            return
        
        env_var = f"EMERGENCY_DISABLE_{flag_name.upper()}"
        os.environ[env_var] = "true"
        
        logger.critical(f"EMERGENCY DISABLE: Feature flag {flag_name} has been emergency disabled")
    
    def get_migration_status(self) -> Dict[str, Any]:
        """Get comprehensive migration status for v5 consolidation."""
        all_flags = self.get_all_flags()
        
        # Calculate status by type
        type_stats = {}
        for flag_type in FeatureFlagType:
            type_flags = [f for f, info in all_flags.items() if self.flags[f]["type"] == flag_type]
            enabled_count = sum(1 for f in type_flags if all_flags[f]["enabled"])
            type_stats[flag_type.value] = {
                "total": len(type_flags),
                "enabled": enabled_count,
                "percentage": (enabled_count / len(type_flags) * 100) if type_flags else 0
            }
        
        # Calculate stage distribution
        stage_stats = {}
        for stage in FeatureFlagStageV5:
            stage_count = sum(1 for info in all_flags.values() if info["stage"] == stage.value)
            stage_stats[stage.value] = stage_count
        
        # Calculate overall migration progress
        migration_flags = [f for f, info in all_flags.items() 
                          if self.flags[f]["type"] == FeatureFlagType.MIGRATION]
        migration_enabled = sum(1 for f in migration_flags if all_flags[f]["enabled"])
        migration_progress = (migration_enabled / len(migration_flags) * 100) if migration_flags else 0
        
        return {
            "timestamp": datetime.now().isoformat(),
            "environment": self.environment,
            "deployment_mode": self.deployment_mode,
            "overall_status": {
                "total_flags": len(all_flags),
                "enabled_flags": sum(1 for info in all_flags.values() if info["enabled"]),
                "migration_progress": round(migration_progress, 2)
            },
            "type_breakdown": type_stats,
            "stage_distribution": stage_stats,
            "feature_flags": all_flags
        }


# Global instance
feature_flags_v5 = FeatureFlagsV5()

# Convenience functions
def is_enabled_v5(flag_name: str, **kwargs) -> bool:
    """Check if a v5 feature flag is enabled."""
    return feature_flags_v5.is_enabled(flag_name, **kwargs)

def get_experiment_variant_v5(flag_name: str, user_id: str, default_variant: str = "control") -> str:
    """Get experiment variant for v5 A/B testing."""
    return feature_flags_v5.get_experiment_variant(flag_name, user_id, default_variant)

def get_migration_status_v5() -> Dict[str, Any]:
    """Get v5 migration status."""
    return feature_flags_v5.get_migration_status()

def emergency_disable_v5(flag_name: str):
    """Emergency disable a v5 feature flag."""
    feature_flags_v5.emergency_disable(flag_name)

def set_stage_v5(flag_name: str, stage: FeatureFlagStageV5):
    """Set stage for a v5 feature flag."""
    feature_flags_v5.set_stage(flag_name, stage)

# Decorator for requiring v5 feature flags
def require_feature_flag_v5(flag_name: str, default_response: Optional[Dict[str, Any]] = None):
    """Decorator to require a v5 feature flag."""
    def decorator(f):
        def wrapper(*args, **kwargs):
            try:
                from flask import request, jsonify, g
                
                user_id = getattr(g, 'user_id', None)
                user_roles = [role.get('role') for role in getattr(g, 'user_roles', []) if role.get('role')]
                
                if feature_flags_v5.is_enabled(flag_name, user_id=user_id, user_roles=user_roles):
                    return f(*args, **kwargs)
                else:
                    response = default_response or {
                        "error": "Feature not available",
                        "code": "FEATURE_DISABLED",
                        "message": f"Feature {flag_name} is not enabled for your account",
                        "correlation_id": getattr(g, 'correlation_id', None)
                    }
                    return jsonify(response), 503
                    
            except Exception as e:
                logger.error(f"Error checking v5 feature flag {flag_name}: {e}")
                response = {
                    "error": "Feature check failed",
                    "code": "FEATURE_CHECK_ERROR",
                    "correlation_id": getattr(g, 'correlation_id', None)
                }
                return jsonify(response), 500
        
        wrapper.__name__ = f.__name__
        return wrapper
    
    return decorator