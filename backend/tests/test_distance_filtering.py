"""
Tests for Distance Filtering Service
===================================

This module contains comprehensive tests for the distance filtering service,
including unit tests, integration tests, and performance benchmarks.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import unittest
import time
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, List, Any

from services.distance_filtering_service import (
    DistanceFilteringService,
    LocationFilter,
    DistanceResult
)


class TestDistanceFilteringService(unittest.TestCase):
    """Test cases for DistanceFilteringService."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_db_manager = Mock()
        self.service = DistanceFilteringService(self.mock_db_manager)
        
        # Sample restaurant data
        self.sample_restaurants = [
            {
                'id': 1,
                'name': 'Test Restaurant 1',
                'latitude': 25.7617,
                'longitude': -80.1918,
                'kosher_category': 'Meat',
                'status': 'active'
            },
            {
                'id': 2,
                'name': 'Test Restaurant 2',
                'latitude': 25.7618,
                'longitude': -80.1919,
                'kosher_category': 'Dairy',
                'status': 'active'
            }
        ]
    
    def test_validate_coordinates_valid(self):
        """Test coordinate validation with valid coordinates."""
        self.assertTrue(self.service.validate_coordinates(25.7617, -80.1918))
        self.assertTrue(self.service.validate_coordinates(0, 0))
        self.assertTrue(self.service.validate_coordinates(90, 180))
        self.assertTrue(self.service.validate_coordinates(-90, -180))
    
    def test_validate_coordinates_invalid(self):
        """Test coordinate validation with invalid coordinates."""
        self.assertFalse(self.service.validate_coordinates(91, 0))
        self.assertFalse(self.service.validate_coordinates(-91, 0))
        self.assertFalse(self.service.validate_coordinates(0, 181))
        self.assertFalse(self.service.validate_coordinates(0, -181))
    
    def test_calculate_distance(self):
        """Test distance calculation between two points."""
        # Miami to Miami Beach (approximately 5 miles)
        distance = self.service.calculate_distance(25.7617, -80.1918, 25.7907, -80.1300)
        self.assertGreater(distance, 4.5)
        self.assertLess(distance, 5.5)
        
        # Same point should be 0 distance
        distance = self.service.calculate_distance(25.7617, -80.1918, 25.7617, -80.1918)
        self.assertAlmostEqual(distance, 0, places=2)
    
    def test_format_distance(self):
        """Test distance formatting."""
        self.assertEqual(self.service.format_distance(0.05), "264ft")
        self.assertEqual(self.service.format_distance(0.5), "0.5mi")
        self.assertEqual(self.service.format_distance(5.0), "5.0mi")
        self.assertEqual(self.service.format_distance(10.5), "10.5mi")
    
    def test_build_distance_query(self):
        """Test building distance-aware SQL query."""
        location_filter = LocationFilter(
            latitude=25.7617,
            longitude=-80.1918,
            max_distance_miles=10.0
        )
        
        base_query = "SELECT * FROM restaurants"
        additional_filters = {'kosher_category': 'Meat', 'status': 'active'}
        
        query, params = self.service.build_distance_query(
            base_query, location_filter, additional_filters
        )
        
        # Check that query contains required elements
        self.assertIn('earth_box', query)
        self.assertIn('earth_distance', query)
        self.assertIn('ORDER BY', query)
        
        # Check parameters
        self.assertEqual(params['lat'], 25.7617)
        self.assertEqual(params['lng'], -80.1918)
        self.assertAlmostEqual(params['radius_meters'], 16093.4, places=1)
        self.assertEqual(params['kosher_category'], 'Meat')
        self.assertEqual(params['status'], 'active')
    
    @patch('services.distance_filtering_service.DistanceFilteringService.build_distance_query')
    def test_get_restaurants_within_radius(self, mock_build_query):
        """Test getting restaurants within radius."""
        # Mock the database response
        mock_cursor = Mock()
        mock_cursor.fetchall.return_value = [
            {
                'id': 1,
                'name': 'Test Restaurant',
                'latitude': 25.7617,
                'longitude': -80.1918,
                'distance_meters': 1609.34  # 1 mile
            }
        ]
        
        mock_conn = Mock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        self.mock_db_manager.get_connection.return_value.__enter__.return_value = mock_conn
        
        # Mock the query building
        mock_build_query.return_value = (
            "SELECT * FROM restaurants WHERE ...",
            {'lat': 25.7617, 'lng': -80.1918, 'radius_meters': 16093.4, 'limit': 10, 'offset': 0}
        )
        
        # Test the method
        results = self.service.get_restaurants_within_radius(
            latitude=25.7617,
            longitude=-80.1918,
            max_distance_miles=10.0,
            limit=10,
            offset=0
        )
        
        # Verify results
        self.assertEqual(len(results), 1)
        self.assertIsInstance(results[0], DistanceResult)
        self.assertEqual(results[0].distance_miles, 1.0)
        self.assertEqual(results[0].distance_meters, 1609.34)
        self.assertEqual(results[0].restaurant['name'], 'Test Restaurant')
    
    def test_get_distance_stats(self):
        """Test getting distance statistics."""
        # Mock the database response
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {
            'total_count': 5,
            'min_distance': 1609.34,  # 1 mile
            'max_distance': 8046.7,   # 5 miles
            'avg_distance': 3218.68   # 2 miles
        }
        
        mock_conn = Mock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        self.mock_db_manager.get_connection.return_value.__enter__.return_value = mock_conn
        
        # Test the method
        stats = self.service.get_distance_stats(
            latitude=25.7617,
            longitude=-80.1918,
            max_distance_miles=10.0
        )
        
        # Verify stats
        self.assertEqual(stats['total_count'], 5)
        self.assertAlmostEqual(stats['min_distance_miles'], 1.0, places=2)
        self.assertAlmostEqual(stats['max_distance_miles'], 5.0, places=2)
        self.assertAlmostEqual(stats['avg_distance_miles'], 2.0, places=2)
        self.assertEqual(stats['radius_miles'], 10.0)
    
    def test_error_handling(self):
        """Test error handling in distance filtering."""
        # Mock database error
        self.mock_db_manager.get_connection.side_effect = Exception("Database error")
        
        # Test that errors are handled gracefully
        results = self.service.get_restaurants_within_radius(
            latitude=25.7617,
            longitude=-80.1918,
            max_distance_miles=10.0
        )
        
        self.assertEqual(results, [])
    
    def test_performance_benchmark(self):
        """Benchmark performance of distance calculations."""
        start_time = time.time()
        
        # Perform 1000 distance calculations
        for _ in range(1000):
            self.service.calculate_distance(25.7617, -80.1918, 25.7907, -80.1300)
        
        end_time = time.time()
        elapsed_time = end_time - start_time
        
        # Should complete in reasonable time (less than 1 second)
        self.assertLess(elapsed_time, 1.0)
        
        print(f"Distance calculation benchmark: {elapsed_time:.4f} seconds for 1000 calculations")


class TestLocationFilter(unittest.TestCase):
    """Test cases for LocationFilter dataclass."""
    
    def test_location_filter_creation(self):
        """Test LocationFilter creation."""
        location_filter = LocationFilter(
            latitude=25.7617,
            longitude=-80.1918,
            max_distance_miles=10.0,
            sort_by_distance=True
        )
        
        self.assertEqual(location_filter.latitude, 25.7617)
        self.assertEqual(location_filter.longitude, -80.1918)
        self.assertEqual(location_filter.max_distance_miles, 10.0)
        self.assertTrue(location_filter.sort_by_distance)
    
    def test_location_filter_defaults(self):
        """Test LocationFilter default values."""
        location_filter = LocationFilter(
            latitude=25.7617,
            longitude=-80.1918,
            max_distance_miles=10.0
        )
        
        self.assertTrue(location_filter.sort_by_distance)  # Default value


class TestDistanceResult(unittest.TestCase):
    """Test cases for DistanceResult dataclass."""
    
    def test_distance_result_creation(self):
        """Test DistanceResult creation."""
        restaurant_data = {'id': 1, 'name': 'Test Restaurant'}
        
        result = DistanceResult(
            restaurant=restaurant_data,
            distance_miles=5.0,
            distance_meters=8046.7
        )
        
        self.assertEqual(result.restaurant, restaurant_data)
        self.assertEqual(result.distance_miles, 5.0)
        self.assertEqual(result.distance_meters, 8046.7)


if __name__ == '__main__':
    unittest.main()
