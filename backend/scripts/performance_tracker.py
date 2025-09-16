#!/usr/bin/env python3
"""
V5 API Performance Tracker

This script provides comprehensive performance tracking for v5 APIs,
including response times, error rates, throughput, and resource utilization.
"""

import os
import sys
import json
import time
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import requests
import psutil
import threading
from collections import deque, defaultdict

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from utils.feature_flags_v5 import FeatureFlagsV5
from utils.logging_config import get_logger

logger = get_logger(__name__)

@dataclass
class PerformanceMetric:
    """Individual performance metric measurement."""
    timestamp: str
    endpoint: str
    method: str
    response_time: float
    status_code: int
    error: bool
    user_id: Optional[str] = None
    request_size: int = 0
    response_size: int = 0

@dataclass
class AggregatedMetrics:
    """Aggregated performance metrics over a time window."""
    window_start: str
    window_end: str
    total_requests: int
    v5_requests: int
    v4_requests: int
    error_count: int
    error_rate: float
    avg_response_time: float
    p50_response_time: float
    p95_response_time: float
    p99_response_time: float
    max_response_time: float
    min_response_time: float
    throughput_rps: float
    total_data_transferred: int
    unique_users: int
    endpoint_breakdown: Dict[str, Dict[str, Any]]

@dataclass
class SystemMetrics:
    """System resource utilization metrics."""
    timestamp: str
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_free_gb: float
    network_bytes_sent: int
    network_bytes_recv: int
    active_connections: int
    load_average: Tuple[float, float, float]

class PerformanceTracker:
    """Comprehensive performance tracking for v5 APIs."""
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.feature_flags = FeatureFlagsV5()
        
        # Metrics storage
        self.metrics_buffer: deque = deque(maxlen=10000)  # Keep last 10k metrics
        self.system_metrics_buffer: deque = deque(maxlen=1000)  # Keep last 1k system metrics
        self.aggregated_metrics: List[AggregatedMetrics] = []
        
        # Performance tracking configuration
        self.window_size_minutes = self.config.get('window_size_minutes', 5)
        self.aggregation_interval_seconds = self.config.get('aggregation_interval_seconds', 60)
        
        # System monitoring
        self.network_io_start = psutil.net_io_counters()
        self.last_network_check = time.time()
        
        # Threading for continuous monitoring
        self.monitoring_thread: Optional[threading.Thread] = None
        self.stop_monitoring = threading.Event()
        
        # API endpoints for monitoring
        self.api_base = os.environ.get('API_BASE_URL', 'https://api.jewgo.app')
        self.metrics_endpoint = f"{self.api_base}/v5/monitoring/metrics"
        
    def start_monitoring(self):
        """Start continuous performance monitoring."""
        if self.monitoring_thread and self.monitoring_thread.is_alive():
            logger.warning("Monitoring already running")
            return
        
        self.stop_monitoring.clear()
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        logger.info("Performance monitoring started")
    
    def stop_monitoring(self):
        """Stop continuous performance monitoring."""
        if self.monitoring_thread:
            self.stop_monitoring.set()
            self.monitoring_thread.join(timeout=5)
            logger.info("Performance monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop running in background thread."""
        while not self.stop_monitoring.is_set():
            try:
                # Collect system metrics
                system_metrics = self._collect_system_metrics()
                self.system_metrics_buffer.append(system_metrics)
                
                # Collect API metrics
                api_metrics = self._collect_api_metrics()
                if api_metrics:
                    self.metrics_buffer.extend(api_metrics)
                
                # Aggregate metrics if enough time has passed
                self._aggregate_metrics_if_needed()
                
                time.sleep(self.aggregation_interval_seconds)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(10)  # Wait before retrying
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Collect current system resource metrics."""
        # CPU and memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Network I/O
        current_time = time.time()
        network_io = psutil.net_io_counters()
        
        # Calculate network delta
        if hasattr(self, 'network_io_start'):
            bytes_sent = network_io.bytes_sent - self.network_io_start.bytes_sent
            bytes_recv = network_io.bytes_recv - self.network_io_start.bytes_recv
            self.network_io_start = network_io
        else:
            bytes_sent = 0
            bytes_recv = 0
        
        # Load average (Unix-like systems)
        try:
            load_avg = os.getloadavg()
        except (OSError, AttributeError):
            load_avg = (0.0, 0.0, 0.0)
        
        # Active connections (approximate)
        try:
            connections = len(psutil.net_connections())
        except (psutil.AccessDenied, OSError):
            connections = 0
        
        return SystemMetrics(
            timestamp=datetime.now().isoformat(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_mb=memory.used / (1024 * 1024),
            memory_available_mb=memory.available / (1024 * 1024),
            disk_usage_percent=(disk.used / disk.total) * 100,
            disk_free_gb=disk.free / (1024 * 1024 * 1024),
            network_bytes_sent=bytes_sent,
            network_bytes_recv=bytes_recv,
            active_connections=connections,
            load_average=load_avg
        )
    
    def _collect_api_metrics(self) -> List[PerformanceMetric]:
        """Collect API performance metrics from monitoring endpoint."""
        try:
            response = requests.get(
                self.metrics_endpoint,
                timeout=10,
                headers={'Accept': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_api_metrics(data)
            else:
                logger.warning(f"Failed to fetch API metrics: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error collecting API metrics: {e}")
            return []
    
    def _parse_api_metrics(self, data: Dict) -> List[PerformanceMetric]:
        """Parse API metrics from monitoring endpoint response."""
        metrics = []
        current_time = datetime.now().isoformat()
        
        # Parse request metrics
        requests_data = data.get('requests', {})
        for endpoint, endpoint_data in requests_data.items():
            if isinstance(endpoint_data, dict):
                for method, method_data in endpoint_data.items():
                    if isinstance(method_data, dict):
                        metrics.append(PerformanceMetric(
                            timestamp=current_time,
                            endpoint=endpoint,
                            method=method,
                            response_time=method_data.get('avg_response_time', 0.0),
                            status_code=method_data.get('status_code', 200),
                            error=method_data.get('error_rate', 0.0) > 0,
                            request_size=method_data.get('avg_request_size', 0),
                            response_size=method_data.get('avg_response_size', 0)
                        ))
        
        return metrics
    
    def _aggregate_metrics_if_needed(self):
        """Aggregate metrics if enough time has passed since last aggregation."""
        if not self.aggregated_metrics:
            # First aggregation
            self._aggregate_metrics()
            return
        
        last_aggregation = datetime.fromisoformat(self.aggregated_metrics[-1].window_end)
        time_since_last = (datetime.now() - last_aggregation).total_seconds()
        
        if time_since_last >= self.aggregation_interval_seconds:
            self._aggregate_metrics()
    
    def _aggregate_metrics(self):
        """Aggregate metrics over the current time window."""
        if not self.metrics_buffer:
            return
        
        # Calculate time window
        window_end = datetime.now()
        window_start = window_end - timedelta(minutes=self.window_size_minutes)
        
        # Filter metrics within the time window
        window_metrics = [
            m for m in self.metrics_buffer
            if window_start <= datetime.fromisoformat(m.timestamp) <= window_end
        ]
        
        if not window_metrics:
            return
        
        # Calculate aggregated metrics
        total_requests = len(window_metrics)
        v5_requests = sum(1 for m in window_metrics if '/v5/' in m.endpoint)
        v4_requests = total_requests - v5_requests
        error_count = sum(1 for m in window_metrics if m.error)
        error_rate = (error_count / total_requests) * 100 if total_requests > 0 else 0
        
        # Response time statistics
        response_times = [m.response_time for m in window_metrics]
        avg_response_time = statistics.mean(response_times) if response_times else 0
        p50_response_time = statistics.median(response_times) if response_times else 0
        p95_response_time = self._percentile(response_times, 95) if response_times else 0
        p99_response_time = self._percentile(response_times, 99) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        
        # Throughput (requests per second)
        window_duration_seconds = (window_end - window_start).total_seconds()
        throughput_rps = total_requests / window_duration_seconds if window_duration_seconds > 0 else 0
        
        # Data transfer
        total_data_transferred = sum(m.request_size + m.response_size for m in window_metrics)
        
        # Unique users
        unique_users = len(set(m.user_id for m in window_metrics if m.user_id))
        
        # Endpoint breakdown
        endpoint_breakdown = self._calculate_endpoint_breakdown(window_metrics)
        
        aggregated = AggregatedMetrics(
            window_start=window_start.isoformat(),
            window_end=window_end.isoformat(),
            total_requests=total_requests,
            v5_requests=v5_requests,
            v4_requests=v4_requests,
            error_count=error_count,
            error_rate=error_rate,
            avg_response_time=avg_response_time,
            p50_response_time=p50_response_time,
            p95_response_time=p95_response_time,
            p99_response_time=p99_response_time,
            max_response_time=max_response_time,
            min_response_time=min_response_time,
            throughput_rps=throughput_rps,
            total_data_transferred=total_data_transferred,
            unique_users=unique_users,
            endpoint_breakdown=endpoint_breakdown
        )
        
        self.aggregated_metrics.append(aggregated)
        
        # Keep only last 100 aggregated metrics
        if len(self.aggregated_metrics) > 100:
            self.aggregated_metrics = self.aggregated_metrics[-100:]
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate the given percentile of the data."""
        if not data:
            return 0.0
        
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    def _calculate_endpoint_breakdown(self, metrics: List[PerformanceMetric]) -> Dict[str, Dict[str, Any]]:
        """Calculate breakdown of metrics by endpoint."""
        endpoint_stats = defaultdict(lambda: {
            'requests': 0,
            'errors': 0,
            'response_times': [],
            'methods': set()
        })
        
        for metric in metrics:
            endpoint_stats[metric.endpoint]['requests'] += 1
            endpoint_stats[metric.endpoint]['methods'].add(metric.method)
            endpoint_stats[metric.endpoint]['response_times'].append(metric.response_time)
            if metric.error:
                endpoint_stats[metric.endpoint]['errors'] += 1
        
        # Convert to final format
        breakdown = {}
        for endpoint, stats in endpoint_stats.items():
            response_times = stats['response_times']
            breakdown[endpoint] = {
                'requests': stats['requests'],
                'errors': stats['errors'],
                'error_rate': (stats['errors'] / stats['requests']) * 100 if stats['requests'] > 0 else 0,
                'avg_response_time': statistics.mean(response_times) if response_times else 0,
                'p95_response_time': self._percentile(response_times, 95) if response_times else 0,
                'methods': list(stats['methods'])
            }
        
        return breakdown
    
    def get_current_performance_summary(self) -> Dict[str, Any]:
        """Get a summary of current performance metrics."""
        if not self.aggregated_metrics:
            return {'status': 'no_data'}
        
        latest = self.aggregated_metrics[-1]
        
        # Get latest system metrics
        latest_system = self.system_metrics_buffer[-1] if self.system_metrics_buffer else None
        
        return {
            'timestamp': latest.window_end,
            'requests': {
                'total': latest.total_requests,
                'v5': latest.v5_requests,
                'v4': latest.v4_requests,
                'v5_percentage': (latest.v5_requests / latest.total_requests) * 100 if latest.total_requests > 0 else 0
            },
            'performance': {
                'error_rate': latest.error_rate,
                'avg_response_time': latest.avg_response_time,
                'p95_response_time': latest.p95_response_time,
                'p99_response_time': latest.p99_response_time,
                'throughput_rps': latest.throughput_rps
            },
            'system': {
                'cpu_percent': latest_system.cpu_percent if latest_system else 0,
                'memory_percent': latest_system.memory_percent if latest_system else 0,
                'active_connections': latest_system.active_connections if latest_system else 0
            },
            'top_endpoints': self._get_top_endpoints(latest.endpoint_breakdown)
        }
    
    def _get_top_endpoints(self, endpoint_breakdown: Dict[str, Dict[str, Any]], limit: int = 5) -> List[Dict[str, Any]]:
        """Get top endpoints by request volume."""
        sorted_endpoints = sorted(
            endpoint_breakdown.items(),
            key=lambda x: x[1]['requests'],
            reverse=True
        )
        
        return [
            {
                'endpoint': endpoint,
                'requests': stats['requests'],
                'error_rate': stats['error_rate'],
                'avg_response_time': stats['avg_response_time']
            }
            for endpoint, stats in sorted_endpoints[:limit]
        ]
    
    def export_performance_data(self, filename: Optional[str] = None) -> str:
        """Export performance data to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"performance_data_{timestamp}.json"
        
        data = {
            'export_timestamp': datetime.now().isoformat(),
            'config': {
                'window_size_minutes': self.window_size_minutes,
                'aggregation_interval_seconds': self.aggregation_interval_seconds
            },
            'aggregated_metrics': [asdict(metric) for metric in self.aggregated_metrics],
            'system_metrics': [asdict(metric) for metric in self.system_metrics_buffer],
            'raw_metrics_count': len(self.metrics_buffer)
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        return filename

def main():
    """Main function for the performance tracker."""
    import argparse
    
    parser = argparse.ArgumentParser(description='V5 API Performance Tracker')
    parser.add_argument('action', choices=['start', 'stop', 'status', 'export'], 
                       help='Action to perform')
    parser.add_argument('--window-size', type=int, default=5, help='Aggregation window size in minutes')
    parser.add_argument('--interval', type=int, default=60, help='Aggregation interval in seconds')
    parser.add_argument('--export-file', type=str, help='Export filename')
    
    args = parser.parse_args()
    
    config = {
        'window_size_minutes': args.window_size,
        'aggregation_interval_seconds': args.interval
    }
    
    tracker = PerformanceTracker(config)
    
    if args.action == 'start':
        tracker.start_monitoring()
        print("🚀 Performance tracking started")
        print(f"   Window size: {args.window_size} minutes")
        print(f"   Aggregation interval: {args.interval} seconds")
        
        try:
            while True:
                time.sleep(10)
                summary = tracker.get_current_performance_summary()
                if summary.get('status') != 'no_data':
                    print("\n📊 Performance Summary:")
                    print(f"   Requests: {summary['requests']['total']} total, {summary['requests']['v5']} v5 ({summary['requests']['v5_percentage']:.1f}%)")
                    print(f"   Error Rate: {summary['performance']['error_rate']:.2f}%")
                    print(f"   Avg Response Time: {summary['performance']['avg_response_time']:.0f}ms")
                    print(f"   P95 Response Time: {summary['performance']['p95_response_time']:.0f}ms")
                    print(f"   Throughput: {summary['performance']['throughput_rps']:.1f} RPS")
                    print(f"   CPU: {summary['system']['cpu_percent']:.1f}%, Memory: {summary['system']['memory_percent']:.1f}%")
        except KeyboardInterrupt:
            print("\n👋 Stopping performance tracking...")
            tracker.stop_monitoring()
    
    elif args.action == 'stop':
        tracker.stop_monitoring()
        print("🛑 Performance tracking stopped")
    
    elif args.action == 'status':
        summary = tracker.get_current_performance_summary()
        if summary.get('status') == 'no_data':
            print("❌ No performance data available")
        else:
            print("📊 Current Performance Status:")
            print(json.dumps(summary, indent=2))
    
    elif args.action == 'export':
        filename = tracker.export_performance_data(args.export_file)
        print(f"📁 Performance data exported to: {filename}")

if __name__ == '__main__':
    main()
