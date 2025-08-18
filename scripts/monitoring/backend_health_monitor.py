#!/usr/bin/env python3
"""
Backend Health Monitor for JewGo
================================

This script monitors the backend health and keeps it warm to prevent cold starts.
It can be run as a cron job or as a background service.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import os
import sys
import time
import json
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("backend_health.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


class BackendHealthMonitor:
    def __init__(self, backend_url: str = None):
        """Initialize the health monitor"""
        self.backend_url = backend_url or os.environ.get(
            "BACKEND_URL", "https://jewgo.onrender.com"
        )
        self.health_endpoint = f"{self.backend_url}/health"
        self.root_endpoint = f"{self.backend_url}/"
        self.stats_file = "backend_health_stats.json"
        self.stats = self.load_stats()

    def load_stats(self) -> Dict[str, Any]:
        """Load health statistics from file"""
        try:
            if os.path.exists(self.stats_file):
                with open(self.stats_file, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load stats: {e}")

        return {
            "total_checks": 0,
            "successful_checks": 0,
            "failed_checks": 0,
            "last_check": None,
            "last_success": None,
            "last_failure": None,
            "average_response_time": 0,
            "response_times": [],
        }

    def save_stats(self):
        """Save health statistics to file"""
        try:
            with open(self.stats_file, "w") as f:
                json.dump(self.stats, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save stats: {e}")

    def check_health(self) -> Dict[str, Any]:
        """Check backend health status"""
        start_time = time.time()
        result = {
            "timestamp": datetime.utcnow().isoformat(),
            "success": False,
            "response_time": 0,
            "status_code": None,
            "error": None,
            "data": None,
        }

        try:
            # Try health endpoint first
            response = requests.get(
                self.health_endpoint,
                timeout=10,
                headers={"User-Agent": "JewGo-Health-Monitor/1.0"},
            )

            result["status_code"] = response.status_code
            result["response_time"] = time.time() - start_time

            if response.status_code == 200:
                result["success"] = True
                result["data"] = response.json()
                logger.info(f"Health check successful: {result['response_time']:.2f}s")
            else:
                result["error"] = f"HTTP {response.status_code}"
                logger.warning(f"Health check failed: HTTP {response.status_code}")

        except requests.exceptions.Timeout:
            result["error"] = "Timeout"
            logger.error("Health check timeout")
        except requests.exceptions.ConnectionError:
            result["error"] = "Connection Error"
            logger.error("Health check connection error")
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Health check error: {e}")

        # Update statistics
        self.update_stats(result)

        return result

    def update_stats(self, result: Dict[str, Any]):
        """Update health statistics"""
        self.stats["total_checks"] += 1
        self.stats["last_check"] = result["timestamp"]

        if result["success"]:
            self.stats["successful_checks"] += 1
            self.stats["last_success"] = result["timestamp"]
        else:
            self.stats["failed_checks"] += 1
            self.stats["last_failure"] = result["timestamp"]

        # Update response time statistics
        if result["response_time"] > 0:
            self.stats["response_times"].append(result["response_time"])
            # Keep only last 100 response times
            if len(self.stats["response_times"]) > 100:
                self.stats["response_times"] = self.stats["response_times"][-100:]

            self.stats["average_response_time"] = sum(
                self.stats["response_times"]
            ) / len(self.stats["response_times"])

        self.save_stats()

    def warm_up_backend(self) -> bool:
        """Attempt to warm up the backend by making a request"""
        try:
            logger.info("Attempting to warm up backend...")

            # Make a request to the root endpoint to wake up the service
            response = requests.get(
                self.root_endpoint,
                timeout=15,
                headers={"User-Agent": "JewGo-Health-Monitor/1.0"},
            )

            if response.status_code == 200:
                logger.info("Backend warm-up successful")
                return True
            else:
                logger.warning(f"Backend warm-up failed: HTTP {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Backend warm-up error: {e}")
            return False

    def get_health_summary(self) -> Dict[str, Any]:
        """Get a summary of health statistics"""
        if not self.stats["last_check"]:
            return {"status": "No data available"}

        last_check = datetime.fromisoformat(
            self.stats["last_check"].replace("Z", "+00:00")
        )
        time_since_last = datetime.utcnow() - last_check.replace(tzinfo=None)

        success_rate = 0
        if self.stats["total_checks"] > 0:
            success_rate = (
                self.stats["successful_checks"] / self.stats["total_checks"]
            ) * 100

        return {
            "status": (
                "healthy"
                if success_rate > 95
                else "degraded" if success_rate > 80 else "unhealthy"
            ),
            "success_rate": f"{success_rate:.1f}%",
            "total_checks": self.stats["total_checks"],
            "successful_checks": self.stats["successful_checks"],
            "failed_checks": self.stats["failed_checks"],
            "average_response_time": f"{self.stats['average_response_time']:.2f}s",
            "last_check": self.stats["last_check"],
            "time_since_last_check": f"{time_since_last.total_seconds():.0f}s ago",
        }

    def run_monitoring_cycle(self, interval: int = 300):
        """Run continuous monitoring with specified interval (in seconds)"""
        logger.info(f"Starting backend health monitoring (interval: {interval}s)")

        while True:
            try:
                # Check health
                result = self.check_health()

                # If health check failed, try to warm up
                if not result["success"]:
                    logger.warning("Health check failed, attempting warm-up...")
                    self.warm_up_backend()

                # Log summary every 10 checks
                if self.stats["total_checks"] % 10 == 0:
                    summary = self.get_health_summary()
                    logger.info(f"Health summary: {summary}")

                # Wait for next check
                time.sleep(interval)

            except KeyboardInterrupt:
                logger.info("Monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Monitoring cycle error: {e}")
                time.sleep(interval)


def main():
    """Main function"""
    import argparse

    parser = argparse.ArgumentParser(description="JewGo Backend Health Monitor")
    parser.add_argument("--url", help="Backend URL (default: from BACKEND_URL env var)")
    parser.add_argument(
        "--interval",
        type=int,
        default=300,
        help="Check interval in seconds (default: 300)",
    )
    parser.add_argument("--once", action="store_true", help="Run check once and exit")
    parser.add_argument(
        "--warm-up", action="store_true", help="Just warm up the backend and exit"
    )
    parser.add_argument(
        "--summary", action="store_true", help="Show health summary and exit"
    )

    args = parser.parse_args()

    monitor = BackendHealthMonitor(args.url)

    if args.warm_up:
        success = monitor.warm_up_backend()
        sys.exit(0 if success else 1)

    if args.summary:
        summary = monitor.get_health_summary()
        print(json.dumps(summary, indent=2))
        sys.exit(0)

    if args.once:
        result = monitor.check_health()
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["success"] else 1)

    # Run continuous monitoring
    monitor.run_monitoring_cycle(args.interval)


if __name__ == "__main__":
    main()
