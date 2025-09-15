#!/usr/bin/env python3
"""
Performance tests for V5 API.

Tests the performance characteristics of v5 API endpoints
including response times, throughput, and resource usage.
"""

import pytest
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import statistics

from utils.logging_config import get_logger

logger = get_logger(__name__)


class TestV5Performance:
    """Performance tests for V5 API."""
    
    @pytest.fixture(autouse=True)
    def setup(self, app, client):
        """Setup test environment."""
        self.app = app
        self.client = client
        
    def test_entity_list_performance(self):
        """Test performance of entity listing endpoints."""
        endpoints = [
            '/api/v5/restaurants',
            '/api/v5/synagogues', 
            '/api/v5/mikvahs',
            '/api/v5/stores'
        ]
        
        for endpoint in endpoints:
            # Test single request
            start_time = time.time()
            response = self.client.get(f'{endpoint}?limit=20')
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            assert response.status_code == 200
            assert response_time < 1000  # Should respond within 1 second
            
            logger.info(f'{endpoint} response time: {response_time:.2f}ms')
    
    def test_concurrent_requests(self):
        """Test performance under concurrent load."""
        endpoint = '/api/v5/restaurants?limit=10'
        num_requests = 50
        max_workers = 10
        
        def make_request():
            start_time = time.time()
            response = self.client.get(endpoint)
            end_time = time.time()
            return {
                'status_code': response.status_code,
                'response_time': (end_time - start_time) * 1000,
                'success': response.status_code == 200
            }
        
        # Execute concurrent requests
        results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(make_request) for _ in range(num_requests)]
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        # Analyze results
        successful_requests = [r for r in results if r['success']]
        response_times = [r['response_time'] for r in successful_requests]
        
        assert len(successful_requests) >= num_requests * 0.95  # 95% success rate
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
            
            assert avg_response_time < 500  # Average under 500ms
            assert max_response_time < 2000  # Max under 2 seconds
            assert p95_response_time < 1000  # 95th percentile under 1 second
            
            logger.info(f'Concurrent requests - Avg: {avg_response_time:.2f}ms, '
                       f'Max: {max_response_time:.2f}ms, P95: {p95_response_time:.2f}ms')
    
    def test_search_performance(self):
        """Test search endpoint performance."""
        search_queries = [
            'kosher',
            'restaurant',
            'new york',
            'pizza',
            'deli'
        ]
        
        for query in search_queries:
            start_time = time.time()
            response = self.client.get(f'/api/v5/search?q={query}&entity_type=restaurants')
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000
            assert response.status_code == 200
            assert response_time < 2000  # Search should complete within 2 seconds
            
            logger.info(f'Search "{query}" response time: {response_time:.2f}ms')
    
    def test_etag_caching_performance(self):
        """Test ETag caching performance."""
        endpoint = '/api/v5/restaurants?limit=20'
        
        # First request (no cache)
        start_time = time.time()
        response1 = self.client.get(endpoint)
        end_time = time.time()
        first_request_time = (end_time - start_time) * 1000
        
        assert response1.status_code == 200
        etag = response1.headers.get('ETag')
        assert etag is not None
        
        # Second request with ETag (should be cached)
        start_time = time.time()
        response2 = self.client.get(endpoint, headers={'If-None-Match': etag})
        end_time = time.time()
        second_request_time = (end_time - start_time) * 1000
        
        assert response2.status_code == 304  # Not Modified
        assert second_request_time < first_request_time  # Cached should be faster
        
        logger.info(f'ETag caching - First: {first_request_time:.2f}ms, '
                   f'Second: {second_request_time:.2f}ms')
    
    def test_pagination_performance(self):
        """Test pagination performance with different page sizes."""
        page_sizes = [10, 20, 50, 100]
        
        for page_size in page_sizes:
            start_time = time.time()
            response = self.client.get(f'/api/v5/restaurants?limit={page_size}')
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000
            assert response.status_code == 200
            assert response_time < 1000  # Should respond within 1 second
            
            data = response.get_json()
            assert len(data['data']) <= page_size
            
            logger.info(f'Pagination (limit={page_size}) response time: {response_time:.2f}ms')
    
    def test_authentication_performance(self):
        """Test authentication endpoint performance."""
        # Test login performance
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        
        start_time = time.time()
        response = self.client.post('/api/v5/auth/login',
                                  data=json.dumps(login_data),
                                  content_type='application/json')
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000
        # Login might fail due to test user not existing, but should be fast
        assert response_time < 1000  # Should respond within 1 second
        
        logger.info(f'Login response time: {response_time:.2f}ms')
    
    def test_bulk_operations_performance(self):
        """Test bulk operations performance."""
        bulk_data = {
            "operations": [
                {
                    "type": "create",
                    "data": {
                        "name": f"Bulk Test Restaurant {i}",
                        "address": f"{i} Bulk St",
                        "kosher_category": "kosher"
                    }
                }
                for i in range(10)  # 10 operations
            ]
        }
        
        start_time = time.time()
        response = self.client.post('/api/v5/restaurants/bulk',
                                  data=json.dumps(bulk_data),
                                  content_type='application/json')
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000
        # Bulk operations might fail due to validation, but should be fast
        assert response_time < 5000  # Should complete within 5 seconds
        
        logger.info(f'Bulk operations (10 items) response time: {response_time:.2f}ms')
    
    def test_memory_usage(self):
        """Test memory usage during operations."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Make multiple requests to test memory usage
        for i in range(100):
            response = self.client.get('/api/v5/restaurants?limit=10')
            assert response.status_code == 200
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB for 100 requests)
        assert memory_increase < 100
        
        logger.info(f'Memory usage - Initial: {initial_memory:.2f}MB, '
                   f'Final: {final_memory:.2f}MB, Increase: {memory_increase:.2f}MB')
    
    def test_database_connection_pool(self):
        """Test database connection pool performance."""
        # Make many concurrent database requests
        num_requests = 100
        
        def make_db_request():
            start_time = time.time()
            response = self.client.get('/api/v5/restaurants?limit=1')
            end_time = time.time()
            return {
                'status_code': response.status_code,
                'response_time': (end_time - start_time) * 1000
            }
        
        results = []
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_db_request) for _ in range(num_requests)]
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        successful_requests = [r for r in results if r['status_code'] == 200]
        response_times = [r['response_time'] for r in successful_requests]
        
        assert len(successful_requests) >= num_requests * 0.95  # 95% success rate
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            assert avg_response_time < 1000  # Average under 1 second
            
            logger.info(f'Database connection pool - {len(successful_requests)}/{num_requests} '
                       f'successful, avg response time: {avg_response_time:.2f}ms')
    
    def test_error_handling_performance(self):
        """Test error handling performance."""
        # Test 404 performance
        start_time = time.time()
        response = self.client.get('/api/v5/restaurants/99999')
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000
        assert response.status_code == 404
        assert response_time < 500  # 404 should be fast
        
        # Test 400 performance
        start_time = time.time()
        response = self.client.post('/api/v5/restaurants',
                                  data=json.dumps({"invalid": "data"}),
                                  content_type='application/json')
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000
        assert response.status_code == 400
        assert response_time < 500  # 400 should be fast
        
        logger.info(f'Error handling - 404: {response_time:.2f}ms, 400: {response_time:.2f}ms')


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
