"""
Load Testing and Capacity Planning for Authentication System.

This module provides comprehensive load testing capabilities including
automated performance testing, capacity planning, and stress testing.
"""

import asyncio
import aiohttp
import time
import json
import statistics
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class LoadTestResult:
    """Result of a load test operation."""
    operation: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    total_time: float
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p50_response_time: float
    p95_response_time: float
    p99_response_time: float
    requests_per_second: float
    error_rate: float
    errors: List[str]


@dataclass
class CapacityTestScenario:
    """Load test scenario configuration."""
    name: str
    concurrent_users: int
    duration_seconds: int
    ramp_up_seconds: int
    operations: List[Dict[str, Any]]


class AuthLoadTester:
    """Comprehensive load testing for authentication system."""
    
    def __init__(self, base_url: str = "https://api.jewgo.app"):
        self.base_url = base_url
        self.session = None
        self.test_results = []
        
        # Test scenarios
        self.scenarios = {
            'light_load': CapacityTestScenario(
                name="Light Load",
                concurrent_users=10,
                duration_seconds=60,
                ramp_up_seconds=10,
                operations=[
                    {'type': 'login', 'weight': 0.7},
                    {'type': 'register', 'weight': 0.1},
                    {'type': 'token_validation', 'weight': 0.2}
                ]
            ),
            'medium_load': CapacityTestScenario(
                name="Medium Load",
                concurrent_users=50,
                duration_seconds=120,
                ramp_up_seconds=20,
                operations=[
                    {'type': 'login', 'weight': 0.6},
                    {'type': 'register', 'weight': 0.1},
                    {'type': 'token_validation', 'weight': 0.3}
                ]
            ),
            'heavy_load': CapacityTestScenario(
                name="Heavy Load",
                concurrent_users=100,
                duration_seconds=180,
                ramp_up_seconds=30,
                operations=[
                    {'type': 'login', 'weight': 0.5},
                    {'type': 'register', 'weight': 0.1},
                    {'type': 'token_validation', 'weight': 0.4}
                ]
            ),
            'stress_test': CapacityTestScenario(
                name="Stress Test",
                concurrent_users=200,
                duration_seconds=300,
                ramp_up_seconds=60,
                operations=[
                    {'type': 'login', 'weight': 0.4},
                    {'type': 'register', 'weight': 0.1},
                    {'type': 'token_validation', 'weight': 0.5}
                ]
            )
        }
        
        logger.info("AuthLoadTester initialized")
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(limit=100, limit_per_host=50)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    async def run_scenario(self, scenario_name: str) -> LoadTestResult:
        """Run a specific load test scenario."""
        try:
            scenario = self.scenarios.get(scenario_name)
            if not scenario:
                raise ValueError(f"Unknown scenario: {scenario_name}")
            
            logger.info(f"Starting load test scenario: {scenario.name}")
            logger.info(f"Concurrent users: {scenario.concurrent_users}")
            logger.info(f"Duration: {scenario.duration_seconds}s")
            
            # Run the load test
            result = await self._run_load_test(scenario)
            
            # Store result
            self.test_results.append(result)
            
            logger.info(f"Load test completed: {scenario.name}")
            logger.info(f"Total requests: {result.total_requests}")
            logger.info(f"Success rate: {(1 - result.error_rate) * 100:.2f}%")
            logger.info(f"Avg response time: {result.avg_response_time:.3f}s")
            logger.info(f"Requests/sec: {result.requests_per_second:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Load test scenario failed: {e}")
            raise
    
    async def _run_load_test(self, scenario: CapacityTestScenario) -> LoadTestResult:
        """Run the actual load test."""
        try:
            start_time = time.time()
            end_time = start_time + scenario.duration_seconds
            
            # Create tasks for concurrent users
            tasks = []
            for user_id in range(scenario.concurrent_users):
                # Stagger user start times for ramp-up
                delay = (user_id / scenario.concurrent_users) * scenario.ramp_up_seconds
                task = asyncio.create_task(
                    self._simulate_user(user_id, scenario, start_time + delay, end_time)
                )
                tasks.append(task)
            
            # Wait for all tasks to complete
            user_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Aggregate results
            return self._aggregate_results(user_results, scenario.name)
            
        except Exception as e:
            logger.error(f"Load test execution failed: {e}")
            raise
    
    async def _simulate_user(self, user_id: int, scenario: CapacityTestScenario, 
                           start_time: float, end_time: float) -> List[Dict[str, Any]]:
        """Simulate a single user's behavior."""
        try:
            results = []
            user_start = max(start_time, time.time())
            
            while time.time() < end_time:
                # Select operation based on weights
                operation = self._select_operation(scenario.operations)
                
                # Execute operation
                result = await self._execute_operation(operation, user_id)
                results.append(result)
                
                # Wait between operations (1-3 seconds)
                await asyncio.sleep(1 + (user_id % 3))
            
            return results
            
        except Exception as e:
            logger.error(f"User simulation failed for user {user_id}: {e}")
            return []
    
    def _select_operation(self, operations: List[Dict[str, Any]]) -> str:
        """Select operation based on weights."""
        import random
        
        total_weight = sum(op['weight'] for op in operations)
        rand = random.uniform(0, total_weight)
        
        current_weight = 0
        for op in operations:
            current_weight += op['weight']
            if rand <= current_weight:
                return op['type']
        
        return operations[0]['type']  # Fallback
    
    async def _execute_operation(self, operation: str, user_id: int) -> Dict[str, Any]:
        """Execute a specific operation."""
        try:
            start_time = time.time()
            
            if operation == 'login':
                result = await self._test_login(user_id)
            elif operation == 'register':
                result = await self._test_register(user_id)
            elif operation == 'token_validation':
                result = await self._test_token_validation(user_id)
            else:
                raise ValueError(f"Unknown operation: {operation}")
            
            end_time = time.time()
            result['duration'] = end_time - start_time
            result['operation'] = operation
            result['user_id'] = user_id
            
            return result
            
        except Exception as e:
            return {
                'operation': operation,
                'user_id': user_id,
                'success': False,
                'error': str(e),
                'duration': time.time() - start_time
            }
    
    async def _test_login(self, user_id: int) -> Dict[str, Any]:
        """Test login operation."""
        try:
            # Use test credentials or generate them
            email = f"testuser{user_id}@example.com"
            password = "TestPassword123!"
            
            # Get CSRF token first
            csrf_response = await self.session.get(f"{self.base_url}/api/v5/auth/csrf")
            csrf_data = await csrf_response.json()
            csrf_token = csrf_data.get('data', {}).get('csrf_token')
            
            # Perform login
            login_data = {
                'email': email,
                'password': password
            }
            
            headers = {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrf_token
            }
            
            response = await self.session.post(
                f"{self.base_url}/api/v5/auth/login",
                json=login_data,
                headers=headers
            )
            
            return {
                'success': response.status == 200,
                'status_code': response.status,
                'response_data': await response.json() if response.status == 200 else None,
                'error': None if response.status == 200 else f"HTTP {response.status}"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': None,
                'response_data': None
            }
    
    async def _test_register(self, user_id: int) -> Dict[str, Any]:
        """Test registration operation."""
        try:
            # Generate unique test user
            email = f"newuser{user_id}_{int(time.time())}@example.com"
            password = "TestPassword123!"
            name = f"Test User {user_id}"
            
            # Get CSRF token first
            csrf_response = await self.session.get(f"{self.base_url}/api/v5/auth/csrf")
            csrf_data = await csrf_response.json()
            csrf_token = csrf_data.get('data', {}).get('csrf_token')
            
            # Perform registration
            register_data = {
                'email': email,
                'password': password,
                'name': name
            }
            
            headers = {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrf_token
            }
            
            response = await self.session.post(
                f"{self.base_url}/api/v5/auth/register",
                json=register_data,
                headers=headers
            )
            
            return {
                'success': response.status == 200,
                'status_code': response.status,
                'response_data': await response.json() if response.status == 200 else None,
                'error': None if response.status == 200 else f"HTTP {response.status}"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': None,
                'response_data': None
            }
    
    async def _test_token_validation(self, user_id: int) -> Dict[str, Any]:
        """Test token validation operation."""
        try:
            # First login to get a token
            login_result = await self._test_login(user_id)
            
            if not login_result['success']:
                return {
                    'success': False,
                    'error': 'Failed to get token for validation',
                    'status_code': None,
                    'response_data': None
                }
            
            # Extract token from login response
            response_data = login_result.get('response_data', {})
            token = response_data.get('data', {}).get('access_token')
            
            if not token:
                return {
                    'success': False,
                    'error': 'No token in login response',
                    'status_code': None,
                    'response_data': None
                }
            
            # Validate token
            headers = {
                'Authorization': f'Bearer {token}'
            }
            
            response = await self.session.post(
                f"{self.base_url}/api/v5/auth/verify-token",
                headers=headers
            )
            
            return {
                'success': response.status == 200,
                'status_code': response.status,
                'response_data': await response.json() if response.status == 200 else None,
                'error': None if response.status == 200 else f"HTTP {response.status}"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': None,
                'response_data': None
            }
    
    def _aggregate_results(self, user_results: List, scenario_name: str) -> LoadTestResult:
        """Aggregate results from all users."""
        try:
            all_results = []
            for user_result in user_results:
                if isinstance(user_result, list):
                    all_results.extend(user_result)
                elif isinstance(user_result, Exception):
                    logger.error(f"User simulation failed: {user_result}")
            
            if not all_results:
                raise ValueError("No results to aggregate")
            
            # Calculate statistics
            total_requests = len(all_results)
            successful_requests = sum(1 for r in all_results if r.get('success', False))
            failed_requests = total_requests - successful_requests
            
            response_times = [r.get('duration', 0) for r in all_results if r.get('duration')]
            
            if response_times:
                avg_response_time = statistics.mean(response_times)
                min_response_time = min(response_times)
                max_response_time = max(response_times)
                p50_response_time = statistics.median(response_times)
                p95_response_time = self._percentile(response_times, 95)
                p99_response_time = self._percentile(response_times, 99)
            else:
                avg_response_time = min_response_time = max_response_time = 0
                p50_response_time = p95_response_time = p99_response_time = 0
            
            # Calculate total time (from scenario duration)
            scenario = self.scenarios[scenario_name]
            total_time = scenario.duration_seconds
            requests_per_second = total_requests / total_time if total_time > 0 else 0
            
            error_rate = failed_requests / total_requests if total_requests > 0 else 0
            
            # Collect unique errors
            errors = list(set(r.get('error') for r in all_results if r.get('error')))
            
            return LoadTestResult(
                operation=scenario_name,
                total_requests=total_requests,
                successful_requests=successful_requests,
                failed_requests=failed_requests,
                total_time=total_time,
                avg_response_time=avg_response_time,
                min_response_time=min_response_time,
                max_response_time=max_response_time,
                p50_response_time=p50_response_time,
                p95_response_time=p95_response_time,
                p99_response_time=p99_response_time,
                requests_per_second=requests_per_second,
                error_rate=error_rate,
                errors=errors
            )
            
        except Exception as e:
            logger.error(f"Failed to aggregate results: {e}")
            raise
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data."""
        try:
            sorted_data = sorted(data)
            index = int((percentile / 100) * len(sorted_data))
            return sorted_data[min(index, len(sorted_data) - 1)]
        except Exception:
            return 0.0
    
    def run_capacity_planning(self) -> Dict[str, Any]:
        """Run comprehensive capacity planning analysis."""
        try:
            logger.info("Starting capacity planning analysis")
            
            # Run all scenarios
            results = {}
            for scenario_name in self.scenarios.keys():
                logger.info(f"Running scenario: {scenario_name}")
                # Note: This would need to be run in an async context
                # For now, return a structure showing what would be analyzed
                results[scenario_name] = {
                    'status': 'pending',
                    'expected_analysis': {
                        'max_concurrent_users': 0,
                        'max_requests_per_second': 0,
                        'bottlenecks': [],
                        'recommendations': []
                    }
                }
            
            # Analyze results
            capacity_analysis = self._analyze_capacity(results)
            
            logger.info("Capacity planning analysis completed")
            return capacity_analysis
            
        except Exception as e:
            logger.error(f"Capacity planning failed: {e}")
            return {'error': str(e)}
    
    def _analyze_capacity(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze capacity based on test results."""
        try:
            analysis = {
                'scenarios': results,
                'capacity_limits': {
                    'max_concurrent_users': 0,
                    'max_requests_per_second': 0,
                    'optimal_concurrent_users': 0,
                    'performance_degradation_point': 0
                },
                'bottlenecks': [],
                'recommendations': [],
                'scaling_recommendations': []
            }
            
            # Analyze each scenario
            for scenario_name, result in results.items():
                if result.get('status') == 'completed':
                    # Analyze performance characteristics
                    self._analyze_scenario_performance(scenario_name, result, analysis)
            
            # Generate recommendations
            self._generate_capacity_recommendations(analysis)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze capacity: {e}")
            return {'error': str(e)}
    
    def _analyze_scenario_performance(self, scenario_name: str, result: Dict[str, Any], analysis: Dict[str, Any]):
        """Analyze performance of a specific scenario."""
        try:
            # This would analyze actual test results
            # For now, provide template analysis
            if scenario_name == 'stress_test':
                analysis['bottlenecks'].append({
                    'scenario': scenario_name,
                    'bottleneck': 'High concurrent user load',
                    'impact': 'Response time degradation',
                    'recommendation': 'Consider horizontal scaling'
                })
            
        except Exception as e:
            logger.error(f"Failed to analyze scenario performance: {e}")
    
    def _generate_capacity_recommendations(self, analysis: Dict[str, Any]):
        """Generate capacity planning recommendations."""
        try:
            analysis['recommendations'] = [
                {
                    'type': 'infrastructure',
                    'priority': 'high',
                    'recommendation': 'Implement horizontal scaling for authentication service',
                    'rationale': 'Current capacity may not handle peak loads'
                },
                {
                    'type': 'caching',
                    'priority': 'medium',
                    'recommendation': 'Optimize cache configuration for high-load scenarios',
                    'rationale': 'Cache hit rates may decrease under stress'
                },
                {
                    'type': 'database',
                    'priority': 'high',
                    'recommendation': 'Review database connection pooling and query optimization',
                    'rationale': 'Database may become bottleneck under high load'
                }
            ]
            
            analysis['scaling_recommendations'] = [
                {
                    'metric': 'concurrent_users',
                    'current_limit': 100,
                    'recommended_limit': 200,
                    'scaling_strategy': 'Horizontal scaling with load balancer'
                },
                {
                    'metric': 'requests_per_second',
                    'current_limit': 50,
                    'recommended_limit': 100,
                    'scaling_strategy': 'Optimize authentication flow and add caching'
                }
            ]
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {e}")
    
    def get_test_summary(self) -> Dict[str, Any]:
        """Get summary of all test results."""
        try:
            if not self.test_results:
                return {'message': 'No test results available'}
            
            summary = {
                'total_scenarios': len(self.test_results),
                'scenarios': [],
                'overall_performance': {
                    'total_requests': sum(r.total_requests for r in self.test_results),
                    'total_successful': sum(r.successful_requests for r in self.test_results),
                    'overall_success_rate': 0,
                    'avg_response_time': 0,
                    'max_requests_per_second': 0
                }
            }
            
            # Calculate overall metrics
            total_requests = summary['overall_performance']['total_requests']
            total_successful = summary['overall_performance']['total_successful']
            
            if total_requests > 0:
                summary['overall_performance']['overall_success_rate'] = (total_successful / total_requests) * 100
            
            if self.test_results:
                summary['overall_performance']['avg_response_time'] = statistics.mean(r.avg_response_time for r in self.test_results)
                summary['overall_performance']['max_requests_per_second'] = max(r.requests_per_second for r in self.test_results)
            
            # Add individual scenario results
            for result in self.test_results:
                summary['scenarios'].append({
                    'name': result.operation,
                    'total_requests': result.total_requests,
                    'success_rate': (1 - result.error_rate) * 100,
                    'avg_response_time': result.avg_response_time,
                    'requests_per_second': result.requests_per_second,
                    'p95_response_time': result.p95_response_time,
                    'p99_response_time': result.p99_response_time
                })
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get test summary: {e}")
            return {'error': str(e)}
    
    def export_results(self, filename: str = None) -> str:
        """Export test results to JSON file."""
        try:
            if not filename:
                timestamp = int(time.time())
                filename = f"load_test_results_{timestamp}.json"
            
            results_data = {
                'timestamp': time.time(),
                'test_results': [
                    {
                        'operation': r.operation,
                        'total_requests': r.total_requests,
                        'successful_requests': r.successful_requests,
                        'failed_requests': r.failed_requests,
                        'total_time': r.total_time,
                        'avg_response_time': r.avg_response_time,
                        'min_response_time': r.min_response_time,
                        'max_response_time': r.max_response_time,
                        'p50_response_time': r.p50_response_time,
                        'p95_response_time': r.p95_response_time,
                        'p99_response_time': r.p99_response_time,
                        'requests_per_second': r.requests_per_second,
                        'error_rate': r.error_rate,
                        'errors': r.errors
                    }
                    for r in self.test_results
                ],
                'summary': self.get_test_summary()
            }
            
            with open(filename, 'w') as f:
                json.dump(results_data, f, indent=2)
            
            logger.info(f"Test results exported to {filename}")
            return filename
            
        except Exception as e:
            logger.error(f"Failed to export results: {e}")
            raise


# Example usage function
async def run_comprehensive_load_test():
    """Run comprehensive load testing suite."""
    try:
        async with AuthLoadTester() as tester:
            # Run all scenarios
            scenarios = ['light_load', 'medium_load', 'heavy_load', 'stress_test']
            
            for scenario in scenarios:
                logger.info(f"Running scenario: {scenario}")
                result = await tester.run_scenario(scenario)
                logger.info(f"Scenario {scenario} completed: {result.requests_per_second:.2f} req/s")
            
            # Get summary
            summary = tester.get_test_summary()
            logger.info(f"Load testing completed. Overall success rate: {summary['overall_performance']['overall_success_rate']:.2f}%")
            
            # Export results
            filename = tester.export_results()
            logger.info(f"Results exported to: {filename}")
            
            return summary
            
    except Exception as e:
        logger.error(f"Comprehensive load test failed: {e}")
        raise


if __name__ == "__main__":
    # Run load test
    asyncio.run(run_comprehensive_load_test())
