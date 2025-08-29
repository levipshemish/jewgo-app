#!/usr/bin/env python3
"""Gradual Rollout Manager for API v4.

This module manages the gradual rollout of the v4 API to users, with integrated
monitoring and automatic rollback capabilities based on performance and error metrics.

Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""

import argparse
import hashlib
import json
import os
import sys
import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

# Add the backend directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from monitoring.v4_monitoring import get_v4_alerts, get_v4_metrics_summary, v4_monitor
from utils.feature_flags_v4 import (
    MigrationStage,
    api_v4_flags,
)
from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class RolloutConfig:
    """Configuration for gradual rollout."""

    initial_percentage: float = 5.0
    max_percentage: float = 100.0
    increment_percentage: float = 10.0
    increment_interval_hours: int = 24
    monitoring_period_hours: int = 2
    auto_rollback_threshold: float = 5.0  # Error rate percentage
    performance_degradation_threshold: float = 20.0  # Response time increase percentage
    min_requests_for_evaluation: int = 100
    enable_auto_rollback: bool = True
    enable_auto_increment: bool = True


@dataclass
class RolloutStatus:
    """Current status of the rollout."""

    current_percentage: float
    current_stage: str
    start_time: str
    last_increment_time: str
    total_users_affected: int
    successful_requests: int
    failed_requests: int
    error_rate: float
    avg_response_time_ms: float
    is_healthy: bool
    alerts_count: int


class GradualRolloutManager:
    """Manages gradual rollout of v4 API with monitoring and safety controls."""

    def __init__(self, config: RolloutConfig):
        self.config = config
        self.rollout_active = False
        self.rollout_thread = None
        self.rollout_history = []
        self.user_assignments = {}  # Cache user assignments for consistency

        # Try to load existing status, otherwise create new
        self.status = self._load_rollout_status() or RolloutStatus(
            current_percentage=0.0,
            current_stage="disabled",
            start_time=datetime.now().isoformat(),
            last_increment_time=datetime.now().isoformat(),
            total_users_affected=0,
            successful_requests=0,
            failed_requests=0,
            error_rate=0.0,
            avg_response_time_ms=0.0,
            is_healthy=True,
            alerts_count=0,
        )

    def start_rollout(self) -> Dict[str, Any]:
        """Start the gradual rollout process."""
        if self.rollout_active:
            return {"error": "Rollout is already active"}

        logger.info("Starting gradual rollout of v4 API", config=asdict(self.config))

        # Initialize with testing mode
        self._set_rollout_percentage(self.config.initial_percentage)
        self.status.current_stage = "testing"
        self.status.start_time = datetime.now().isoformat()

        # Start monitoring if not already active
        try:
            v4_monitor.start_monitoring(interval_seconds=30)
        except Exception as e:
            logger.warning(f"Monitoring already active or failed to start: {e}")

        # Start rollout thread
        self.rollout_active = True
        self.rollout_thread = threading.Thread(
            target=self._rollout_monitoring_loop, daemon=True
        )
        self.rollout_thread.start()

        return {
            "status": "started",
            "current_percentage": self.status.current_percentage,
            "stage": self.status.current_stage,
            "start_time": self.status.start_time,
        }

    def stop_rollout(self) -> Dict[str, Any]:
        """Stop the gradual rollout process."""
        if not self.rollout_active:
            return {"error": "Rollout is not active"}

        logger.info("Stopping gradual rollout of v4 API")

        self.rollout_active = False
        if self.rollout_thread:
            self.rollout_thread.join(timeout=5)

        # Save final status
        self._save_rollout_status()

        return {
            "status": "stopped",
            "final_percentage": self.status.current_percentage,
            "final_stage": self.status.current_stage,
            "total_users_affected": self.status.total_users_affected,
        }

    def _rollout_monitoring_loop(self):
        """Main monitoring loop for rollout."""
        while self.rollout_active:
            try:
                # Evaluate current health
                health_status = self._evaluate_health()

                if health_status["is_healthy"]:
                    # Consider incrementing rollout
                    if (
                        self.config.enable_auto_increment
                        and self._should_increment_rollout()
                    ):
                        self._increment_rollout()
                else:
                    # Consider rollback
                    if self.config.enable_auto_rollback:
                        self._handle_unhealthy_status(health_status)

                # Update status
                self._update_rollout_status()

                # Sleep for monitoring period
                time.sleep(self.config.monitoring_period_hours * 3600)

            except Exception as e:
                logger.error(f"Error in rollout monitoring loop: {e}")
                time.sleep(300)  # 5 minutes before retry

    def _evaluate_health(self) -> Dict[str, Any]:
        """Evaluate the health of the current rollout."""
        try:
            # Get metrics for the monitoring period
            metrics = get_v4_metrics_summary(hours=self.config.monitoring_period_hours)
            alerts = get_v4_alerts()

            # Calculate health metrics
            total_requests = 0
            total_errors = 0
            total_response_time = 0
            request_count = 0

            for endpoint, perf in metrics.get("performance", {}).items():
                total_requests += perf.get("request_count", 0)
                total_response_time += perf.get("avg_response_time_ms", 0) * perf.get(
                    "request_count", 0
                )
                request_count += perf.get("request_count", 0)

            for endpoint, errors in metrics.get("errors", {}).items():
                total_errors += errors.get("total_errors", 0)

            # Calculate error rate
            error_rate = (
                (total_errors / total_requests * 100) if total_requests > 0 else 0
            )
            avg_response_time = (
                (total_response_time / request_count) if request_count > 0 else 0
            )

            # Determine if healthy
            is_healthy = (
                error_rate < self.config.auto_rollback_threshold
                and len(alerts) == 0
                and total_requests >= self.config.min_requests_for_evaluation
            )

            health_status = {
                "is_healthy": is_healthy,
                "error_rate": error_rate,
                "avg_response_time_ms": avg_response_time,
                "total_requests": total_requests,
                "total_errors": total_errors,
                "alerts_count": len(alerts),
                "alerts": [alert["type"] for alert in alerts],
                "evaluation_time": datetime.now().isoformat(),
            }

            logger.info("Health evaluation completed", **health_status)
            return health_status

        except Exception as e:
            logger.error(f"Error evaluating health: {e}")
            return {
                "is_healthy": False,
                "error": str(e),
                "evaluation_time": datetime.now().isoformat(),
            }

    def _should_increment_rollout(self) -> bool:
        """Determine if rollout should be incremented."""
        # Check if enough time has passed since last increment
        last_increment = datetime.fromisoformat(self.status.last_increment_time)
        time_since_increment = datetime.now() - last_increment

        if time_since_increment < timedelta(hours=self.config.increment_interval_hours):
            return False

        # Check if we haven't reached max percentage
        if self.status.current_percentage >= self.config.max_percentage:
            return False

        # Check if we have enough data for evaluation
        metrics = get_v4_metrics_summary(hours=self.config.monitoring_period_hours)
        total_requests = sum(
            perf.get("request_count", 0)
            for perf in metrics.get("performance", {}).values()
        )

        if total_requests < self.config.min_requests_for_evaluation:
            logger.info(
                "Insufficient requests for evaluation",
                total_requests=total_requests,
                min_required=self.config.min_requests_for_evaluation,
            )
            return False

        return True

    def _increment_rollout(self):
        """Increment the rollout percentage."""
        new_percentage = min(
            self.status.current_percentage + self.config.increment_percentage,
            self.config.max_percentage,
        )

        logger.info(
            "Incrementing rollout percentage",
            from_percentage=self.status.current_percentage,
            to_percentage=new_percentage,
        )

        self._set_rollout_percentage(new_percentage)
        self.status.last_increment_time = datetime.now().isoformat()

        # Update stage based on percentage
        if new_percentage >= 100:
            self.status.current_stage = "complete"
        elif new_percentage >= 50:
            self.status.current_stage = "full"
        elif new_percentage >= 10:
            self.status.current_stage = "partial"
        else:
            self.status.current_stage = "testing"

    def _handle_unhealthy_status(self, health_status: Dict[str, Any]):
        """Handle unhealthy status with potential rollback."""
        logger.warning("Unhealthy status detected", **health_status)

        # Determine rollback action based on severity
        if health_status["error_rate"] > self.config.auto_rollback_threshold * 2:
            # Critical error rate - immediate rollback
            self._emergency_rollback("Critical error rate detected")
        elif health_status["alerts_count"] > 3:
            # Multiple alerts - gradual rollback
            self._gradual_rollback("Multiple alerts detected")
        else:
            # Minor issues - pause rollout
            self._pause_rollout("Minor health issues detected")

    def _emergency_rollback(self, reason: str):
        """Emergency rollback to 0%."""
        logger.error(f"Emergency rollback: {reason}")

        self._set_rollout_percentage(0.0)
        self.status.current_stage = "emergency_rollback"

        # Record rollback in history
        self.rollout_history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "action": "emergency_rollback",
                "reason": reason,
                "from_percentage": self.status.current_percentage,
                "to_percentage": 0.0,
            }
        )

    def _gradual_rollback(self, reason: str):
        """Gradual rollback by reducing percentage."""
        current_percentage = self.status.current_percentage
        new_percentage = max(0.0, current_percentage - self.config.increment_percentage)

        logger.warning(
            f"Gradual rollback: {reason}",
            from_percentage=current_percentage,
            to_percentage=new_percentage,
        )

        self._set_rollout_percentage(new_percentage)
        self.status.current_stage = "rollback"

        # Record rollback in history
        self.rollout_history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "action": "gradual_rollback",
                "reason": reason,
                "from_percentage": current_percentage,
                "to_percentage": new_percentage,
            }
        )

    def _pause_rollout(self, reason: str):
        """Pause rollout without changing percentage."""
        logger.info(f"Pausing rollout: {reason}")

        self.status.current_stage = "paused"

        # Record pause in history
        self.rollout_history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "action": "pause",
                "reason": reason,
                "percentage": self.status.current_percentage,
            }
        )

    def _set_rollout_percentage(self, percentage: float):
        """Set the rollout percentage for all v4 features."""
        logger.info(f"Setting rollout percentage to {percentage}%")

        # Set percentage for all v4 flags
        for flag_name in api_v4_flags.flags:
            if flag_name.startswith("api_v4_"):
                api_v4_flags.set_rollout_percentage(flag_name, percentage)

        self.status.current_percentage = percentage

        # Update feature flag stages based on percentage
        if percentage >= 100:
            target_stage = MigrationStage.COMPLETE
        elif percentage >= 50:
            target_stage = MigrationStage.FULL
        elif percentage >= 10:
            target_stage = MigrationStage.PARTIAL
        else:
            target_stage = MigrationStage.TESTING

        # Update all v4 feature flags to the target stage
        for flag_name in api_v4_flags.flags:
            if flag_name.startswith("api_v4_"):
                api_v4_flags.set_stage(flag_name, target_stage)

        self.status.current_stage = target_stage.value

        # Estimate affected users (this would need to be calculated based on actual user base)
        # For now, we'll use a simple estimation
        self.status.total_users_affected = int(
            percentage * 1000
        )  # Assuming 1000 total users

    def _update_rollout_status(self):
        """Update the current rollout status."""
        try:
            # Get current metrics
            metrics = get_v4_metrics_summary(hours=1)  # Last hour

            # Calculate totals
            total_requests = 0
            total_errors = 0
            total_response_time = 0
            request_count = 0

            for endpoint, perf in metrics.get("performance", {}).items():
                total_requests += perf.get("request_count", 0)
                total_response_time += perf.get("avg_response_time_ms", 0) * perf.get(
                    "request_count", 0
                )
                request_count += perf.get("request_count", 0)

            for endpoint, errors in metrics.get("errors", {}).items():
                total_errors += errors.get("total_errors", 0)

            # Update status
            self.status.successful_requests = total_requests - total_errors
            self.status.failed_requests = total_errors
            self.status.error_rate = (
                (total_errors / total_requests * 100) if total_requests > 0 else 0
            )
            self.status.avg_response_time_ms = (
                (total_response_time / request_count) if request_count > 0 else 0
            )
            self.status.alerts_count = len(get_v4_alerts())

            # Determine overall health
            self.status.is_healthy = (
                self.status.error_rate < self.config.auto_rollback_threshold
                and self.status.alerts_count == 0
            )

        except Exception as e:
            logger.error(f"Error updating rollout status: {e}")

    def _load_rollout_status(self) -> Optional[RolloutStatus]:
        """Load rollout status from file."""
        try:
            status_file = os.path.join(os.path.dirname(__file__), "rollout_status.json")

            if not os.path.exists(status_file):
                return None

            with open(status_file, "r") as f:
                status_data = json.load(f)

            # Create RolloutStatus from saved data
            status = RolloutStatus(**status_data["status"])

            # Load history if available
            if "history" in status_data:
                self.rollout_history = status_data["history"]

            logger.info(f"Rollout status loaded from {status_file}")
            return status

        except Exception as e:
            logger.error(f"Error loading rollout status: {e}")
            return None

    def _save_rollout_status(self):
        """Save rollout status to file."""
        try:
            status_file = os.path.join(os.path.dirname(__file__), "rollout_status.json")

            status_data = {
                "config": asdict(self.config),
                "status": asdict(self.status),
                "history": self.rollout_history,
                "saved_at": datetime.now().isoformat(),
            }

            with open(status_file, "w") as f:
                json.dump(status_data, f, indent=2)

            logger.info(f"Rollout status saved to {status_file}")

        except Exception as e:
            logger.error(f"Error saving rollout status: {e}")

    def get_rollout_status(self) -> Dict[str, Any]:
        """Get current rollout status."""
        self._update_rollout_status()
        return asdict(self.status)

    def get_rollout_history(self) -> List[Dict[str, Any]]:
        """Get rollout history."""
        return self.rollout_history

    def is_user_in_rollout(self, user_id: str) -> bool:
        """Check if a specific user is in the v4 rollout."""
        if user_id in self.user_assignments:
            return self.user_assignments[user_id]

        # Use consistent hashing to determine user assignment
        hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        user_percentage = (hash_value % 100) + 1

        is_in_rollout = user_percentage <= self.status.current_percentage

        # Cache the assignment
        self.user_assignments[user_id] = is_in_rollout

        return is_in_rollout

    def force_rollout_percentage(self, percentage: float) -> Dict[str, Any]:
        """Force set rollout percentage (admin override)."""
        logger.warning(f"Admin override: forcing rollout percentage to {percentage}%")

        self._set_rollout_percentage(percentage)

        return {
            "status": "forced",
            "percentage": percentage,
            "timestamp": datetime.now().isoformat(),
        }

    def get_rollout_report(self) -> Dict[str, Any]:
        """Generate a comprehensive rollout report."""
        status = self.get_rollout_status()
        history = self.get_rollout_history()
        metrics = get_v4_metrics_summary(hours=24)  # Last 24 hours
        alerts = get_v4_alerts()

        return {
            "report_timestamp": datetime.now().isoformat(),
            "config": asdict(self.config),
            "current_status": status,
            "rollout_history": history,
            "metrics_summary": metrics,
            "active_alerts": len(alerts),
            "recommendations": self._generate_recommendations(status, metrics, alerts),
        }

    def _generate_recommendations(
        self, status: Dict, metrics: Dict, alerts: List
    ) -> List[str]:
        """Generate recommendations based on current status."""
        recommendations = []

        # Check error rate
        if status["error_rate"] > self.config.auto_rollback_threshold:
            recommendations.append(
                f"High error rate ({status['error_rate']:.1f}%). Consider rollback."
            )

        # Check response time
        if status["avg_response_time_ms"] > 1000:  # 1 second
            recommendations.append(
                f"High response time ({status['avg_response_time_ms']:.0f}ms). Consider optimization."
            )

        # Check alerts
        if status["alerts_count"] > 0:
            recommendations.append(
                f"{status['alerts_count']} active alerts. Review system health."
            )

        # Check rollout progress
        if status["current_percentage"] < 50 and status["is_healthy"]:
            recommendations.append(
                "System is healthy. Consider increasing rollout percentage."
            )

        if not recommendations:
            recommendations.append(
                "System is performing well. Continue with rollout plan."
            )

        return recommendations


def main():
    """Main function for command-line usage."""
    parser = argparse.ArgumentParser(description="Gradual Rollout Manager for API v4")
    parser.add_argument(
        "--action",
        choices=["start", "stop", "status", "report", "force"],
        default="status",
        help="Action to perform",
    )
    parser.add_argument(
        "--percentage", type=float, help="Rollout percentage (for force action)"
    )
    parser.add_argument("--config", help="Configuration file path")

    args = parser.parse_args()

    # Load configuration
    config = RolloutConfig()
    if args.config:
        try:
            with open(args.config, "r") as f:
                config_data = json.load(f)
                config = RolloutConfig(**config_data)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return

    # Create rollout manager
    manager = GradualRolloutManager(config)

    if args.action == "start":
        result = manager.start_rollout()
        print(json.dumps(result, indent=2))

    elif args.action == "stop":
        result = manager.stop_rollout()
        print(json.dumps(result, indent=2))

    elif args.action == "status":
        status = manager.get_rollout_status()
        print(json.dumps(status, indent=2))

    elif args.action == "report":
        report = manager.get_rollout_report()
        print(json.dumps(report, indent=2))

    elif args.action == "force":
        if args.percentage is None:
            print("Error: --percentage required for force action")
            return
        result = manager.force_rollout_percentage(args.percentage)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
