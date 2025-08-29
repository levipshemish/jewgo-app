"""
Distance Filtering Service for JewGo Backend
===========================================

This service provides efficient distance-based filtering using PostgreSQL's earthdistance extension.
It handles radius queries, distance calculations, and location-based sorting.

Features:
- Efficient radius queries using earthdistance extension
- Distance calculations in miles/kilometers
- Location-based sorting and filtering
- Integration with existing restaurant queries
- Performance optimized with spatial indexes

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class LocationFilter:
    """Location filter parameters for distance-based queries."""
    latitude: float
    longitude: float
    max_distance_miles: float
    sort_by_distance: bool = True


@dataclass
class DistanceResult:
    """Result of distance calculation with restaurant data."""
    restaurant: Dict[str, Any]
    distance_miles: float
    distance_meters: float


class DistanceFilteringService:
    """Service for handling distance-based restaurant filtering."""
    
    def __init__(self, db_manager):
        """Initialize the distance filtering service."""
        self.db_manager = db_manager
        self.earth_radius_miles = 3959  # Earth's radius in miles
        self.earth_radius_meters = 6371000  # Earth's radius in meters
    
    def build_distance_query(
        self, 
        base_query: str, 
        location_filter: LocationFilter,
        additional_filters: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Build a SQL query with distance filtering using earthdistance extension.
        
        Args:
            base_query: Base SELECT query without WHERE clause
            location_filter: Location filter parameters
            additional_filters: Additional filter conditions
            
        Returns:
            Tuple of (query, parameters)
        """
        # Convert miles to meters for earthdistance functions
        radius_meters = location_filter.max_distance_miles * 1609.34
        
        # Build the distance-aware query
        query = f"""
        {base_query}
        WHERE latitude IS NOT NULL 
          AND longitude IS NOT NULL
          AND earth_box(ll_to_earth(%(lat)s, %(lng)s), %(radius_meters)s) @> ll_to_earth(latitude, longitude)
          AND earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%(lat)s, %(lng)s)) <= %(radius_meters)s
        """
        
        # Add additional filters
        if additional_filters:
            filter_conditions = []
            for key, value in additional_filters.items():
                if value is not None:
                    if isinstance(value, (list, tuple)):
                        placeholders = ','.join([f'%({key}_{i})s' for i in range(len(value))])
                        filter_conditions.append(f"{key} IN ({placeholders})")
                        for i, val in enumerate(value):
                            additional_filters[f"{key}_{i}"] = val
                    else:
                        filter_conditions.append(f"{key} = %({key})s")
            
            if filter_conditions:
                query += " AND " + " AND ".join(filter_conditions)
        
        # Add distance calculation and sorting
        query += """
        ORDER BY earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%(lat)s, %(lng)s)) ASC
        """
        
        # Build parameters
        params = {
            'lat': location_filter.latitude,
            'lng': location_filter.longitude,
            'radius_meters': radius_meters,
            **(additional_filters or {})
        }
        
        return query, params
    
    def get_restaurants_within_radius(
        self,
        latitude: float,
        longitude: float,
        max_distance_miles: float,
        additional_filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[DistanceResult]:
        """
        Get restaurants within a specified radius with distance calculations.
        
        Args:
            latitude: User's latitude
            longitude: User's longitude
            max_distance_miles: Maximum distance in miles
            additional_filters: Additional filter conditions
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of DistanceResult objects with restaurant data and distances
        """
        try:
            location_filter = LocationFilter(
                latitude=latitude,
                longitude=longitude,
                max_distance_miles=max_distance_miles
            )
            
            # Build base query
            base_query = """
            SELECT 
                *,
                earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%(lat)s, %(lng)s)) AS distance_meters
            FROM restaurants
            """
            
            # Build complete query with distance filtering
            query, params = self.build_distance_query(
                base_query, 
                location_filter, 
                additional_filters
            )
            
            # Add pagination
            query += " LIMIT %(limit)s OFFSET %(offset)s"
            params.update({'limit': limit, 'offset': offset})
            
            # Execute query
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    results = cursor.fetchall()
                    
                    # Convert to DistanceResult objects
                    distance_results = []
                    for row in results:
                        restaurant = dict(row)
                        distance_meters = restaurant.pop('distance_meters', 0)
                        distance_miles = distance_meters / 1609.34
                        
                        distance_results.append(DistanceResult(
                            restaurant=restaurant,
                            distance_miles=distance_miles,
                            distance_meters=distance_meters
                        ))
                    
                    return distance_results
                    
        except Exception as e:
            logger.error(f"Error in distance filtering: {e}")
            return []
    
    def calculate_distance(
        self, 
        lat1: float, 
        lon1: float, 
        lat2: float, 
        lon2: float
    ) -> float:
        """
        Calculate distance between two points using Haversine formula.
        
        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates
            
        Returns:
            Distance in miles
        """
        import math
        
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        a = (math.sin(dlat/2)**2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return self.earth_radius_miles * c
    
    def format_distance(self, distance_miles: float) -> str:
        """
        Format distance for display.
        
        Args:
            distance_miles: Distance in miles
            
        Returns:
            Formatted distance string
        """
        if distance_miles < 0.1:
            return f"{int(distance_miles * 5280)}ft"
        elif distance_miles < 1:
            return f"{distance_miles:.1f}mi"
        else:
            return f"{distance_miles:.1f}mi"
    
    def validate_coordinates(self, latitude: float, longitude: float) -> bool:
        """
        Validate coordinate values.
        
        Args:
            latitude: Latitude value
            longitude: Longitude value
            
        Returns:
            True if coordinates are valid
        """
        return (-90 <= latitude <= 90 and -180 <= longitude <= 180)
    
    def get_distance_stats(
        self,
        latitude: float,
        longitude: float,
        max_distance_miles: float,
        additional_filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Get statistics about restaurants within radius.
        
        Args:
            latitude: User's latitude
            longitude: User's longitude
            max_distance_miles: Maximum distance in miles
            additional_filters: Additional filter conditions
            
        Returns:
            Dictionary with distance statistics
        """
        try:
            location_filter = LocationFilter(
                latitude=latitude,
                longitude=longitude,
                max_distance_miles=max_distance_miles
            )
            
            # Build count query
            base_query = """
            SELECT COUNT(*) as total_count,
                   MIN(earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%(lat)s, %(lng)s))) as min_distance,
                   MAX(earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%(lat)s, %(lng)s))) as max_distance,
                   AVG(earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%(lat)s, %(lng)s))) as avg_distance
            FROM restaurants
            """
            
            query, params = self.build_distance_query(
                base_query, 
                location_filter, 
                additional_filters
            )
            
            # Execute query
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    result = cursor.fetchone()
                    
                    if result:
                        return {
                            'total_count': result['total_count'],
                            'min_distance_miles': result['min_distance'] / 1609.34 if result['min_distance'] else 0,
                            'max_distance_miles': result['max_distance'] / 1609.34 if result['max_distance'] else 0,
                            'avg_distance_miles': result['avg_distance'] / 1609.34 if result['avg_distance'] else 0,
                            'radius_miles': max_distance_miles
                        }
                    
                    return {
                        'total_count': 0,
                        'min_distance_miles': 0,
                        'max_distance_miles': 0,
                        'avg_distance_miles': 0,
                        'radius_miles': max_distance_miles
                    }
                    
        except Exception as e:
            logger.error(f"Error getting distance stats: {e}")
            return {
                'total_count': 0,
                'min_distance_miles': 0,
                'max_distance_miles': 0,
                'avg_distance_miles': 0,
                'radius_miles': max_distance_miles,
                'error': str(e)
            }
