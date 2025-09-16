#!/usr/bin/env python3
"""
Simple Load Test for JewGo Authentication System.

This script performs basic load testing to validate performance improvements.
"""

import requests
import time
import json
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any
import sys

class SimpleLoadTester:
    """Simple load tester for authentication endpoints."""
    
    def __init__(self, base_url: str = "https://api.jewgo.app"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
        
    def test_endpoint(self, endpoint: str, method: str = "GET", data: Dict = None, headers: Dict = None) -> Dict[str, Any]:
        """Test a single endpoint."""
        try:
            start_time = time.time()
            
            if method.upper() == "GET":
                response = self.session.get(f"{self.base_url}{endpoint}", headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(f"{self.base_url}{endpoint}", json=data, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                'endpoint': endpoint,
                'method': method,
                'status_code': response.status_code,
                'duration': duration,
                'success': 200 <= response.status_code < 300,
                'response_size': len(response.content),
                'timestamp': start_time
            }
            
        except Exception as e:
            return {
                'endpoint': endpoint,
                'method': method,
                'status_code': None,
                'duration': time.time() - start_time if 'start_time' in locals() else 0,
                'success': False,
                'error': str(e),
                'response_size': 0,
                'timestamp': time.time()
            }
    
    def get_csrf_token(self) -> str:
        """Get CSRF token for authenticated requests."""
        try:
            response = self.session.get(f"{self.base_url}/api/v5/auth/csrf", timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get('data', {}).get('csrf_token', '')
            return ''
        except Exception:
            return ''
    
    def test_authentication_flow(self, num_requests: int = 10) -> Dict[str, Any]:
        """Test authentication flow with multiple requests."""
        print(f"🧪 Testing authentication flow with {num_requests} requests...")
        
        # Test endpoints
        endpoints = [
            {'endpoint': '/api/v5/auth/csrf', 'method': 'GET'},
            {'endpoint': '/api/v5/auth/health', 'method': 'GET'},
            {'endpoint': '/api/v5/auth/login', 'method': 'POST', 'data': {
                'email': 'test@example.com',
                'password': 'testpassword'
            }},
            {'endpoint': '/api/v5/auth/register', 'method': 'POST', 'data': {
                'email': f'test{int(time.time())}@example.com',
                'password': 'testpassword123',
                'name': 'Test User'
            }}
        ]
        
        results = []
        
        for i in range(num_requests):
            print(f"  Request {i+1}/{num_requests}...")
            
            for endpoint_config in endpoints:
                # Get CSRF token for POST requests
                headers = {}
                if endpoint_config['method'] == 'POST':
                    csrf_token = self.get_csrf_token()
                    if csrf_token:
                        headers['X-CSRF-Token'] = csrf_token
                
                result = self.test_endpoint(
                    endpoint_config['endpoint'],
                    endpoint_config['method'],
                    endpoint_config.get('data'),
                    headers
                )
                results.append(result)
                
                # Small delay between requests
                time.sleep(0.1)
        
        return self.analyze_results(results)
    
    def test_concurrent_requests(self, num_concurrent: int = 5, requests_per_user: int = 10) -> Dict[str, Any]:
        """Test concurrent requests to simulate load."""
        print(f"🚀 Testing {num_concurrent} concurrent users with {requests_per_user} requests each...")
        
        def worker(user_id: int) -> List[Dict[str, Any]]:
            """Worker function for concurrent testing."""
            user_results = []
            
            for i in range(requests_per_user):
                # Test different endpoints
                endpoints = [
                    '/api/v5/auth/csrf',
                    '/api/v5/auth/health',
                    '/api/v5/auth/login'
                ]
                
                for endpoint in endpoints:
                    result = self.test_endpoint(endpoint)
                    result['user_id'] = user_id
                    result['request_id'] = i
                    user_results.append(result)
                    time.sleep(0.05)  # Small delay
            
            return user_results
        
        all_results = []
        
        with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            futures = [executor.submit(worker, i) for i in range(num_concurrent)]
            
            for future in as_completed(futures):
                try:
                    user_results = future.result()
                    all_results.extend(user_results)
                except Exception as e:
                    print(f"❌ Worker failed: {e}")
        
        return self.analyze_results(all_results)
    
    def analyze_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze test results and provide statistics."""
        if not results:
            return {'error': 'No results to analyze'}
        
        # Basic statistics
        total_requests = len(results)
        successful_requests = sum(1 for r in results if r.get('success', False))
        failed_requests = total_requests - successful_requests
        
        # Duration statistics
        durations = [r['duration'] for r in results if r.get('duration')]
        
        if durations:
            avg_duration = statistics.mean(durations)
            min_duration = min(durations)
            max_duration = max(durations)
            p50_duration = statistics.median(durations)
            p95_duration = self.percentile(durations, 95)
            p99_duration = self.percentile(durations, 99)
        else:
            avg_duration = min_duration = max_duration = 0
            p50_duration = p95_duration = p99_duration = 0
        
        # Endpoint breakdown
        endpoint_stats = {}
        for result in results:
            endpoint = result['endpoint']
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {
                    'total': 0,
                    'successful': 0,
                    'failed': 0,
                    'durations': []
                }
            
            endpoint_stats[endpoint]['total'] += 1
            if result.get('success', False):
                endpoint_stats[endpoint]['successful'] += 1
            else:
                endpoint_stats[endpoint]['failed'] += 1
            endpoint_stats[endpoint]['durations'].append(result['duration'])
        
        # Calculate endpoint averages
        for endpoint, stats in endpoint_stats.items():
            if stats['durations']:
                stats['avg_duration'] = statistics.mean(stats['durations'])
                stats['success_rate'] = (stats['successful'] / stats['total']) * 100
            else:
                stats['avg_duration'] = 0
                stats['success_rate'] = 0
        
        # Error analysis
        errors = {}
        for result in results:
            if not result.get('success', False):
                error_key = f"HTTP {result.get('status_code', 'Unknown')}"
                if 'error' in result:
                    error_key = result['error']
                
                errors[error_key] = errors.get(error_key, 0) + 1
        
        return {
            'summary': {
                'total_requests': total_requests,
                'successful_requests': successful_requests,
                'failed_requests': failed_requests,
                'success_rate': (successful_requests / total_requests) * 100 if total_requests > 0 else 0,
                'avg_duration_ms': avg_duration * 1000,
                'min_duration_ms': min_duration * 1000,
                'max_duration_ms': max_duration * 1000,
                'p50_duration_ms': p50_duration * 1000,
                'p95_duration_ms': p95_duration * 1000,
                'p99_duration_ms': p99_duration * 1000
            },
            'endpoint_stats': endpoint_stats,
            'errors': errors,
            'performance_grade': self.calculate_performance_grade(avg_duration, (successful_requests / total_requests) * 100)
        }
    
    def percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data."""
        if not data:
            return 0.0
        
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def calculate_performance_grade(self, avg_duration: float, success_rate: float) -> str:
        """Calculate performance grade based on duration and success rate."""
        if success_rate < 80:
            return "F"
        elif success_rate < 90:
            return "D"
        elif success_rate < 95:
            return "C"
        elif avg_duration > 1.0:  # More than 1 second
            return "B"
        elif avg_duration > 0.5:  # More than 500ms
            return "A-"
        elif avg_duration > 0.2:  # More than 200ms
            return "A"
        else:
            return "A+"
    
    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive load test."""
        print("🚀 Starting Comprehensive Load Test for JewGo Authentication System")
        print("=" * 70)
        
        test_results = {}
        
        # Test 1: Basic endpoint health
        print("\n📊 Test 1: Basic Endpoint Health Check")
        health_results = []
        health_endpoints = [
            '/api/v5/auth/health',
            '/api/v5/auth/csrf',
            '/healthz',
            '/readyz'
        ]
        
        for endpoint in health_endpoints:
            result = self.test_endpoint(endpoint)
            health_results.append(result)
            print(f"  {endpoint}: {result['status_code']} ({result['duration']:.3f}s)")
        
        test_results['health_check'] = self.analyze_results(health_results)
        
        # Test 2: Authentication flow
        print("\n🔐 Test 2: Authentication Flow")
        auth_results = self.test_authentication_flow(5)
        test_results['authentication_flow'] = auth_results
        
        # Test 3: Concurrent load
        print("\n⚡ Test 3: Concurrent Load Test")
        concurrent_results = self.test_concurrent_requests(3, 5)
        test_results['concurrent_load'] = concurrent_results
        
        # Overall analysis
        print("\n📈 Overall Performance Analysis")
        print("=" * 70)
        
        all_results = []
        for test_name, results in test_results.items():
            if 'summary' in results:
                summary = results['summary']
                print(f"\n{test_name.upper()}:")
                print(f"  Success Rate: {summary['success_rate']:.2f}%")
                print(f"  Avg Response Time: {summary['avg_duration_ms']:.2f}ms")
                print(f"  P95 Response Time: {summary['p95_duration_ms']:.2f}ms")
                print(f"  Performance Grade: {results.get('performance_grade', 'N/A')}")
        
        return test_results

def main():
    """Main function to run load tests."""
    try:
        # Get base URL from command line or use default
        base_url = sys.argv[1] if len(sys.argv) > 1 else "https://api.jewgo.app"
        
        print(f"🎯 Testing JewGo Authentication System at: {base_url}")
        
        # Create load tester
        tester = SimpleLoadTester(base_url)
        
        # Run comprehensive test
        results = tester.run_comprehensive_test()
        
        # Export results
        timestamp = int(time.time())
        filename = f"load_test_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n💾 Results exported to: {filename}")
        
        # Final summary
        print("\n🎉 Load Testing Complete!")
        print("=" * 70)
        
        return results
        
    except Exception as e:
        print(f"❌ Load test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
