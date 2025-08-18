#!/usr/bin/env python3
"""
Redis Monitoring Script for JewGo App
=====================================

This script monitors Redis performance and health metrics.
It can be used for development debugging and production monitoring.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import os
import sys
import time
import json
import redis
import argparse
from datetime import datetime
from typing import Dict, Any, Optional


class RedisMonitor:
    """Redis monitoring and health check utility."""

    def __init__(self, redis_url: str = None):
        """Initialize Redis monitor."""
        self.redis_url = redis_url or os.environ.get(
            "REDIS_URL", "redis://localhost:6379"
        )
        self.redis_client = None
        self.connect()

    def connect(self) -> bool:
        """Connect to Redis."""
        try:
            self.redis_client = redis.from_url(self.redis_url)
            self.redis_client.ping()
            print(f"✅ Connected to Redis at {self.redis_url}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to Redis: {e}")
            return False

    def get_basic_info(self) -> Dict[str, Any]:
        """Get basic Redis information."""
        try:
            info = self.redis_client.info()
            return {
                "redis_version": info.get("redis_version", "Unknown"),
                "uptime_in_seconds": info.get("uptime_in_seconds", 0),
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "used_memory_peak_human": info.get("used_memory_peak_human", "0B"),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "total_connections_received": info.get("total_connections_received", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "expired_keys": info.get("expired_keys", 0),
                "evicted_keys": info.get("evicted_keys", 0),
                "keyspace": info.get("db0", {}),
            }
        except Exception as e:
            print(f"❌ Error getting Redis info: {e}")
            return {}

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache-specific statistics."""
        try:
            # Get all keys with patterns
            patterns = ["restaurant:*", "search:*", "statistics:*", "jewgo:*"]
            stats = {}

            for pattern in patterns:
                keys = self.redis_client.keys(pattern)
                stats[pattern] = len(keys)

            # Get total keys
            total_keys = len(self.redis_client.keys("*"))
            stats["total_keys"] = total_keys

            return stats
        except Exception as e:
            print(f"❌ Error getting cache stats: {e}")
            return {}

    def test_cache_operations(self) -> Dict[str, Any]:
        """Test basic cache operations."""
        test_key = "jewgo:test:monitor"
        test_value = {"timestamp": datetime.now().isoformat(), "test": True}

        try:
            # Test set operation
            self.redis_client.setex(test_key, 60, json.dumps(test_value))

            # Test get operation
            retrieved = self.redis_client.get(test_key)
            retrieved_value = json.loads(retrieved) if retrieved else None

            # Test delete operation
            self.redis_client.delete(test_key)

            return {
                "set_operation": "success",
                "get_operation": "success" if retrieved_value else "failed",
                "delete_operation": "success",
                "data_integrity": (
                    retrieved_value == test_value if retrieved_value else False
                ),
            }
        except Exception as e:
            print(f"❌ Error testing cache operations: {e}")
            return {
                "set_operation": "failed",
                "get_operation": "failed",
                "delete_operation": "failed",
                "data_integrity": False,
            }

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics."""
        try:
            info = self.redis_client.info()

            # Calculate hit rate
            hits = info.get("keyspace_hits", 0)
            misses = info.get("keyspace_misses", 0)
            total_requests = hits + misses
            hit_rate = (hits / total_requests * 100) if total_requests > 0 else 0

            return {
                "hit_rate_percent": round(hit_rate, 2),
                "total_requests": total_requests,
                "hits": hits,
                "misses": misses,
                "commands_per_second": info.get("instantaneous_ops_per_sec", 0),
                "memory_usage_percent": self._calculate_memory_usage(info),
                "connected_clients": info.get("connected_clients", 0),
                "blocked_clients": info.get("blocked_clients", 0),
            }
        except Exception as e:
            print(f"❌ Error getting performance metrics: {e}")
            return {}

    def _calculate_memory_usage(self, info: Dict[str, Any]) -> float:
        """Calculate memory usage percentage."""
        try:
            used_memory = info.get("used_memory", 0)
            max_memory = info.get("maxmemory", 0)

            if max_memory > 0:
                return round((used_memory / max_memory) * 100, 2)
            else:
                return 0.0
        except:
            return 0.0

    def print_status_report(self):
        """Print a comprehensive status report."""
        print("\n" + "=" * 60)
        print("🔍 Redis Status Report")
        print("=" * 60)

        if not self.redis_client:
            print("❌ Redis is not connected")
            return

        # Basic info
        basic_info = self.get_basic_info()
        if basic_info:
            print(f"\n📊 Basic Information:")
            print(f"   Redis Version: {basic_info.get('redis_version', 'Unknown')}")
            print(f"   Uptime: {basic_info.get('uptime_in_seconds', 0)} seconds")
            print(f"   Connected Clients: {basic_info.get('connected_clients', 0)}")
            print(f"   Memory Usage: {basic_info.get('used_memory_human', '0B')}")
            print(f"   Peak Memory: {basic_info.get('used_memory_peak_human', '0B')}")

        # Cache stats
        cache_stats = self.get_cache_stats()
        if cache_stats:
            print(f"\n🗄️  Cache Statistics:")
            print(f"   Total Keys: {cache_stats.get('total_keys', 0)}")
            for pattern, count in cache_stats.items():
                if pattern != "total_keys":
                    print(f"   {pattern}: {count} keys")

        # Performance metrics
        perf_metrics = self.get_performance_metrics()
        if perf_metrics:
            print(f"\n⚡ Performance Metrics:")
            print(f"   Hit Rate: {perf_metrics.get('hit_rate_percent', 0)}%")
            print(f"   Total Requests: {perf_metrics.get('total_requests', 0)}")
            print(f"   Commands/sec: {perf_metrics.get('commands_per_second', 0)}")
            print(f"   Memory Usage: {perf_metrics.get('memory_usage_percent', 0)}%")

        # Test operations
        test_results = self.test_cache_operations()
        if test_results:
            print(f"\n🧪 Cache Operations Test:")
            for operation, status in test_results.items():
                status_icon = "✅" if status == "success" else "❌"
                print(f"   {operation}: {status_icon} {status}")

        print("\n" + "=" * 60)

    def continuous_monitoring(self, interval: int = 30):
        """Run continuous monitoring."""
        print(f"🔄 Starting continuous monitoring (interval: {interval}s)")
        print("Press Ctrl+C to stop")

        try:
            while True:
                self.print_status_report()
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n⏹️  Monitoring stopped")

    def export_metrics(self, filename: str = None):
        """Export metrics to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"redis_metrics_{timestamp}.json"

        metrics = {
            "timestamp": datetime.now().isoformat(),
            "redis_url": self.redis_url,
            "basic_info": self.get_basic_info(),
            "cache_stats": self.get_cache_stats(),
            "performance_metrics": self.get_performance_metrics(),
            "test_results": self.test_cache_operations(),
        }

        try:
            with open(filename, "w") as f:
                json.dump(metrics, f, indent=2)
            print(f"📁 Metrics exported to {filename}")
        except Exception as e:
            print(f"❌ Error exporting metrics: {e}")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Redis Monitor for JewGo App")
    parser.add_argument("--url", help="Redis URL (default: from REDIS_URL env var)")
    parser.add_argument(
        "--continuous", "-c", action="store_true", help="Run continuous monitoring"
    )
    parser.add_argument(
        "--interval", "-i", type=int, default=30, help="Monitoring interval in seconds"
    )
    parser.add_argument("--export", "-e", help="Export metrics to JSON file")

    args = parser.parse_args()

    # Initialize monitor
    monitor = RedisMonitor(args.url)

    if not monitor.redis_client:
        print("❌ Cannot connect to Redis. Exiting.")
        sys.exit(1)

    # Run based on arguments
    if args.export:
        monitor.export_metrics(args.export)
    elif args.continuous:
        monitor.continuous_monitoring(args.interval)
    else:
        monitor.print_status_report()


if __name__ == "__main__":
    main()
