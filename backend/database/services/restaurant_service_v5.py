"""
Enhanced restaurant service layer for v5 with improved business logic and caching.

Provides comprehensive restaurant operations with Google Places API integration,
hours parsing, image processing, review aggregation, caching strategies,
and event publishing for cache invalidation.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone, time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from utils.logging_config import get_logger

logger = get_logger(__name__)


class RestaurantServiceV5:
    """Enhanced restaurant service with v5 improvements and integrations."""
    
    # Business validation rules
    VALIDATION_RULES = {
        'name': {'required': True, 'min_length': 2, 'max_length': 200},
        'phone': {'pattern': r'^\+?[\d\s\-\(\)\.]{10,}$'},
        'email': {'pattern': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'},
        'website': {'max_length': 500},
        'kosher_category': {'allowed_values': ['kosher', 'kosher_style', 'vegetarian', 'vegan', 'not_kosher']},
        'status': {'allowed_values': ['active', 'pending', 'closed', 'suspended', 'deleted']},
        'latitude': {'range': [-90.0, 90.0]},
        'longitude': {'range': [-180.0, 180.0]}
    }
    
    # Hours parsing patterns
    HOURS_PATTERNS = {
        'closed': re.compile(r'^(closed|close)$', re.IGNORECASE),
        'time_range': re.compile(r'(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*-\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?', re.IGNORECASE),
        'single_time': re.compile(r'(\d{1,2}):?(\d{2})?\s*(am|pm)', re.IGNORECASE),
        '24_hour': re.compile(r'24\s*hours?|24/7|all\s*day', re.IGNORECASE)
    }
    
    def __init__(self, repository=None, cache_manager=None, event_publisher=None):
        """Initialize restaurant service with dependencies."""
        self.repository = repository
        if not self.repository:
            from database.repositories.entity_repository_v5 import get_entity_repository_v5
            self.repository = get_entity_repository_v5()
        
        self.cache_manager = cache_manager
        if not self.cache_manager:
            from cache.redis_manager_v5 import get_redis_manager_v5
            self.cache_manager = get_redis_manager_v5()
        
        self.event_publisher = event_publisher
        
        # External API clients
        self.places_client = None
        self.image_processor = None
        
        # Initialize external services
        self._init_external_services()
    
    def _init_external_services(self):
        """Initialize external service clients."""
        try:
            # Google Places API client
            import os
            google_api_key = os.getenv('GOOGLE_MAPS_API_KEY')
            if google_api_key:
                import googlemaps
                self.places_client = googlemaps.Client(key=google_api_key)
                logger.info("Google Places API client initialized")
        except ImportError:
            logger.warning("googlemaps library not available")
        except Exception as e:
            logger.error(f"Failed to initialize Google Places client: {e}")
    
    def get_entity_count(
        self,
        filters: Optional[Dict[str, Any]] = None,
        user_context: Optional[Dict[str, Any]] = None
    ) -> int:
        """Get total count of entities matching filters."""
        try:
            # Process and validate filters
            processed_filters = self._process_filters(filters)
            
            # Get count from repository
            count = self.repository.get_entity_count(
                entity_type='restaurants',
                filters=processed_filters
            )
            
            return count
            
        except Exception as e:
            logger.error(f"Error getting entity count: {e}")
            return 0

    def get_entities(
        self,
        filters: Optional[Dict[str, Any]] = None,
        cursor: Optional[str] = None,
        page: Optional[int] = None,
        limit: int = 20,
        sort: str = 'created_at_desc',
        include_relations: bool = False,
        user_context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Get entities (restaurants) with API-compatible interface.
        
        This method provides a unified interface for the entity API routes.
        """
        try:
            logger.info(f"DEBUG SERVICE: get_entities called with page={page}, sort={sort}")
            restaurants, next_cursor, prev_cursor = self.get_restaurants(
                cursor=cursor,
                page=page,
                limit=limit,
                sort_key=sort,
                filters=filters,
                include_relations=include_relations,
                user_context=user_context,
                use_cache=use_cache
            )
            
            return {
                'data': restaurants,
                'next_cursor': next_cursor,
                'prev_cursor': prev_cursor
            }
            
        except Exception as e:
            logger.error(f"Error getting entities: {e}")
            return {
                'data': [],
                'next_cursor': None,
                'prev_cursor': None
            }

    def get_restaurants(
        self,
        cursor: Optional[str] = None,
        page: Optional[int] = None,
        limit: int = 20,
        sort_key: str = 'created_at_desc',
        filters: Optional[Dict[str, Any]] = None,
        include_relations: bool = False,
        user_context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str]]:
        """
        Get restaurants with enhanced filtering and pagination.
        
        Args:
            cursor: Cursor for pagination
            limit: Maximum number of restaurants to return
            sort_key: Sorting strategy
            filters: Filtering criteria
            include_relations: Whether to include related data
            user_context: User context for personalization
            use_cache: Whether to use caching
            
        Returns:
            Tuple of (restaurants, next_cursor, prev_cursor)
        """
        try:
            # Check cache first if enabled
            cache_key = None
            if use_cache:
                cache_key = self._generate_cache_key('restaurants_list', {
                    'cursor': cursor,
                    'limit': limit,
                    'sort_key': sort_key,
                    'filters': filters,
                    'include_relations': include_relations,
                    'user_id': user_context.get('user_id') if user_context else None
                })
                
                cached_result = self.cache_manager.get(cache_key, prefix='cache')
                if cached_result:
                    logger.debug("Restaurant list cache hit")
                    return cached_result
            
            # Process and validate filters
            processed_filters = self._process_filters(filters)
            
            # Get restaurants from repository
            restaurants, next_cursor, prev_cursor = self.repository.get_entities_with_cursor(
                entity_type='restaurants',
                cursor=cursor,
                page=page,
                limit=limit,
                sort_key=sort_key,
                filters=processed_filters,
                include_relations=include_relations,
                user_context=user_context
            )
            
            # Enhance restaurant data
            enhanced_restaurants = []
            for restaurant in restaurants:
                enhanced = self._enhance_restaurant_data(restaurant, user_context)
                enhanced_restaurants.append(enhanced)
            
            result = (enhanced_restaurants, next_cursor, prev_cursor)
            
            # Cache result
            if use_cache and cache_key:
                self.cache_manager.set(
                    cache_key,
                    result,
                    ttl=300,  # 5 minutes
                    prefix='cache'
                )
            
            logger.info(f"Retrieved {len(enhanced_restaurants)} restaurants")
            return result
            
        except Exception as e:
            logger.error(f"Error getting restaurants: {e}")
            return [], None, None
    
    def get_restaurant_by_id(
        self,
        restaurant_id: int,
        include_relations: bool = True,
        user_context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Get restaurant by ID with enhanced data and caching.
        
        Args:
            restaurant_id: Restaurant ID
            include_relations: Whether to include related data
            user_context: User context for personalization
            use_cache: Whether to use caching
            
        Returns:
            Restaurant dictionary or None if not found
        """
        try:
            # Check cache first
            cache_key = None
            if use_cache:
                cache_key = f"restaurant:{restaurant_id}:relations:{include_relations}"
                if user_context:
                    cache_key += f":user:{user_context.get('user_id')}"
                
                cached_restaurant = self.cache_manager.get(cache_key, prefix='cache')
                if cached_restaurant:
                    logger.debug(f"Restaurant {restaurant_id} cache hit")
                    return cached_restaurant
            
            # Get restaurant from repository
            restaurant = self.repository.get_entity_by_id(
                entity_type='restaurants',
                entity_id=restaurant_id,
                include_relations=include_relations,
                user_context=user_context
            )
            
            if not restaurant:
                return None
            
            # Enhance restaurant data
            enhanced_restaurant = self._enhance_restaurant_data(restaurant, user_context)
            
            # Cache result
            if use_cache and cache_key:
                self.cache_manager.set(
                    cache_key,
                    enhanced_restaurant,
                    ttl=600,  # 10 minutes
                    prefix='cache'
                )
            
            logger.info(f"Retrieved restaurant {restaurant_id}")
            return enhanced_restaurant
            
        except Exception as e:
            logger.error(f"Error getting restaurant {restaurant_id}: {e}")
            return None
    
    def create_restaurant(
        self,
        data: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None,
        enrich_data: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Create new restaurant with validation and data enrichment.
        
        Args:
            data: Restaurant data
            user_context: User context for audit logging
            enrich_data: Whether to enrich data with external APIs
            
        Returns:
            Created restaurant dictionary or None if failed
        """
        try:
            # Validate restaurant data
            validation_errors = self._validate_restaurant_data(data, 'create')
            if validation_errors:
                logger.warning(f"Restaurant validation failed: {validation_errors}")
                return None
            
            # Enrich data if requested
            if enrich_data:
                data = self._enrich_restaurant_data(data)
            
            # Process hours if provided
            if data.get('hours'):
                data['hours'] = self._process_hours_data(data['hours'])
            
            # Create restaurant
            restaurant = self.repository.create_entity(
                entity_type='restaurants',
                data=data,
                user_context=user_context
            )
            
            if not restaurant:
                return None
            
            # Publish creation event
            self._publish_event('restaurant_created', {
                'restaurant_id': restaurant['id'],
                'user_id': user_context.get('user_id') if user_context else None
            })
            
            # Invalidate related caches
            self._invalidate_restaurant_caches(restaurant['id'])
            
            logger.info(f"Created restaurant {restaurant['id']}")
            return restaurant
            
        except Exception as e:
            logger.error(f"Error creating restaurant: {e}")
            return None
    
    def update_restaurant(
        self,
        restaurant_id: int,
        data: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None,
        enrich_data: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Update restaurant with validation and data processing.
        
        Args:
            restaurant_id: Restaurant ID
            data: Update data
            user_context: User context for audit logging
            enrich_data: Whether to enrich data with external APIs
            
        Returns:
            Updated restaurant dictionary or None if failed
        """
        try:
            # Validate update data
            validation_errors = self._validate_restaurant_data(data, 'update')
            if validation_errors:
                logger.warning(f"Restaurant update validation failed: {validation_errors}")
                return None
            
            # Enrich data if requested
            if enrich_data:
                data = self._enrich_restaurant_data(data)
            
            # Process hours if provided
            if data.get('hours'):
                data['hours'] = self._process_hours_data(data['hours'])
            
            # Update restaurant
            restaurant = self.repository.update_entity(
                entity_type='restaurants',
                entity_id=restaurant_id,
                data=data,
                user_context=user_context
            )
            
            if not restaurant:
                return None
            
            # Publish update event
            self._publish_event('restaurant_updated', {
                'restaurant_id': restaurant_id,
                'updated_fields': list(data.keys()),
                'user_id': user_context.get('user_id') if user_context else None
            })
            
            # Invalidate caches
            self._invalidate_restaurant_caches(restaurant_id)
            
            logger.info(f"Updated restaurant {restaurant_id}")
            return restaurant
            
        except Exception as e:
            logger.error(f"Error updating restaurant {restaurant_id}: {e}")
            return None
    
    def delete_restaurant(
        self,
        restaurant_id: int,
        user_context: Optional[Dict[str, Any]] = None,
        soft_delete: bool = True
    ) -> bool:
        """
        Delete restaurant with proper cleanup.
        
        Args:
            restaurant_id: Restaurant ID
            user_context: User context for audit logging
            soft_delete: Whether to perform soft delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            success = self.repository.delete_entity(
                entity_type='restaurants',
                entity_id=restaurant_id,
                soft_delete=soft_delete,
                user_context=user_context
            )
            
            if success:
                # Publish deletion event
                self._publish_event('restaurant_deleted', {
                    'restaurant_id': restaurant_id,
                    'soft_delete': soft_delete,
                    'user_id': user_context.get('user_id') if user_context else None
                })
                
                # Invalidate caches
                self._invalidate_restaurant_caches(restaurant_id)
                
                logger.info(f"Deleted restaurant {restaurant_id} (soft={soft_delete})")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting restaurant {restaurant_id}: {e}")
            return False
    
    def search_restaurants(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20,
        user_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search restaurants with enhanced search capabilities.
        
        Args:
            query: Search query
            filters: Additional filters
            limit: Maximum number of results
            user_context: User context for personalization
            
        Returns:
            List of matching restaurants
        """
        try:
            # Prepare search filters
            search_filters = filters.copy() if filters else {}
            search_filters['search'] = query.strip()
            
            # Get restaurants
            restaurants, _, _ = self.get_restaurants(
                limit=limit,
                sort_key='name_asc',  # For search, sort by relevance/name
                filters=search_filters,
                include_relations=False,
                user_context=user_context,
                use_cache=True
            )
            
            # Apply search ranking if needed
            ranked_restaurants = self._rank_search_results(restaurants, query)
            
            logger.info(f"Search for '{query}' returned {len(ranked_restaurants)} results")
            return ranked_restaurants
            
        except Exception as e:
            logger.error(f"Error searching restaurants with query '{query}': {e}")
            return []
    
    def _process_filters(self, filters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Process and normalize filter parameters."""
        if not filters:
            return {}
        
        processed = {}
        
        # Copy basic filters
        for key, value in filters.items():
            if value is not None and value != '':
                processed[key] = value
        
        # Process location filters
        if processed.get('latitude') and processed.get('longitude'):
            try:
                processed['latitude'] = float(processed['latitude'])
                processed['longitude'] = float(processed['longitude'])
                
                # Default radius if not provided
                if not processed.get('radius'):
                    processed['radius'] = 25  # 25 miles default
                else:
                    processed['radius'] = float(processed['radius'])
                    
            except (ValueError, TypeError):
                # Remove invalid location filters
                processed.pop('latitude', None)
                processed.pop('longitude', None)
                processed.pop('radius', None)
        
        # Process business types
        if processed.get('business_types'):
            if isinstance(processed['business_types'], str):
                processed['business_types'] = [processed['business_types']]
        
        return processed
    
    def _enhance_restaurant_data(self, restaurant: Dict[str, Any], user_context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Enhance restaurant data with computed fields and user-specific info."""
        try:
            enhanced = restaurant.copy()
            
            # Add computed fields
            enhanced['display_name'] = self._generate_display_name(restaurant)
            enhanced['is_open'] = self._is_restaurant_open(restaurant)
            enhanced['opening_hours_today'] = self._get_todays_hours(restaurant)
            
            # Add user-specific fields if user context provided
            if user_context:
                user_id = user_context.get('user_id')
                if user_id:
                    enhanced['user_rating'] = self._get_user_rating(restaurant['id'], user_id)
                    enhanced['user_favorite'] = self._is_user_favorite(restaurant['id'], user_id)
                    enhanced['user_visited'] = self._has_user_visited(restaurant['id'], user_id)
            
            # Format data for API response
            enhanced = self._format_restaurant_response(enhanced)
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Error enhancing restaurant data: {e}")
            return restaurant
    
    def _validate_restaurant_data(self, data: Dict[str, Any], operation: str) -> List[str]:
        """Validate restaurant data according to business rules."""
        errors = []
        
        try:
            for field, rules in self.VALIDATION_RULES.items():
                value = data.get(field)
                
                # Required field check
                if rules.get('required') and operation == 'create' and not value:
                    errors.append(f"{field} is required")
                    continue
                
                # Skip validation for None values in updates
                if value is None and operation == 'update':
                    continue
                
                # Length validation
                if value and isinstance(value, str):
                    min_length = rules.get('min_length')
                    max_length = rules.get('max_length')
                    
                    if min_length and len(value) < min_length:
                        errors.append(f"{field} must be at least {min_length} characters")
                    
                    if max_length and len(value) > max_length:
                        errors.append(f"{field} must be no more than {max_length} characters")
                
                # Pattern validation
                pattern = rules.get('pattern')
                if value and pattern and isinstance(value, str):
                    if not re.match(pattern, value):
                        errors.append(f"{field} format is invalid")
                
                # Allowed values validation
                allowed_values = rules.get('allowed_values')
                if value and allowed_values:
                    if value not in allowed_values:
                        errors.append(f"{field} must be one of: {', '.join(allowed_values)}")
                
                # Range validation
                value_range = rules.get('range')
                if value is not None and value_range:
                    try:
                        num_value = float(value)
                        if not (value_range[0] <= num_value <= value_range[1]):
                            errors.append(f"{field} must be between {value_range[0]} and {value_range[1]}")
                    except (ValueError, TypeError):
                        errors.append(f"{field} must be a valid number")
            
            return errors
            
        except Exception as e:
            logger.error(f"Error validating restaurant data: {e}")
            return [f"Validation error: {e}"]
    
    def _enrich_restaurant_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich restaurant data using external APIs."""
        try:
            enriched = data.copy()
            
            # Google Places API enrichment
            if self.places_client and data.get('name') and data.get('address'):
                places_data = self._enrich_with_google_places(data)
                if places_data:
                    enriched.update(places_data)
            
            # Geocoding if coordinates missing
            if not data.get('latitude') and data.get('address'):
                coordinates = self._geocode_address(data['address'])
                if coordinates:
                    enriched['latitude'] = coordinates[0]
                    enriched['longitude'] = coordinates[1]
            
            return enriched
            
        except Exception as e:
            logger.error(f"Error enriching restaurant data: {e}")
            return data
    
    def _enrich_with_google_places(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Enrich data using Google Places API."""
        try:
            if not self.places_client:
                return None
            
            # Search for place
            query = f"{data['name']} {data['address']}"
            places_result = self.places_client.places(query=query)
            
            if not places_result.get('results'):
                return None
            
            place = places_result['results'][0]
            place_id = place.get('place_id')
            
            if not place_id:
                return None
            
            # Get place details
            details_result = self.places_client.place(
                place_id=place_id,
                fields=['formatted_phone_number', 'website', 'opening_hours', 'rating', 'photos']
            )
            
            place_details = details_result.get('result', {})
            
            enriched = {}
            
            # Phone number
            if place_details.get('formatted_phone_number') and not data.get('phone'):
                enriched['phone'] = place_details['formatted_phone_number']
            
            # Website
            if place_details.get('website') and not data.get('website'):
                enriched['website'] = place_details['website']
            
            # Rating
            if place_details.get('rating'):
                enriched['google_rating'] = place_details['rating']
            
            # Hours
            opening_hours = place_details.get('opening_hours', {})
            if opening_hours.get('weekday_text') and not data.get('hours'):
                enriched['hours_text'] = opening_hours['weekday_text']
            
            return enriched
            
        except Exception as e:
            logger.warning(f"Error enriching with Google Places: {e}")
            return None
    
    def _geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """Geocode address to get coordinates."""
        try:
            if not self.places_client:
                return None
            
            geocode_result = self.places_client.geocode(address)
            
            if geocode_result:
                location = geocode_result[0]['geometry']['location']
                return location['lat'], location['lng']
            
            return None
            
        except Exception as e:
            logger.warning(f"Error geocoding address '{address}': {e}")
            return None
    
    def _process_hours_data(self, hours_data: Any) -> Optional[Dict[str, Any]]:
        """Process and normalize hours data."""
        try:
            if isinstance(hours_data, str):
                return self._parse_hours_text(hours_data)
            elif isinstance(hours_data, dict):
                return self._normalize_hours_dict(hours_data)
            elif isinstance(hours_data, list):
                return self._parse_hours_list(hours_data)
            else:
                return None
                
        except Exception as e:
            logger.warning(f"Error processing hours data: {e}")
            return None
    
    def _parse_hours_text(self, hours_text: str) -> Dict[str, Any]:
        """Parse hours text into structured format."""
        # This is a simplified implementation
        # In a real system, you'd have more sophisticated parsing
        return {
            'raw_text': hours_text,
            'parsed': False,
            'note': 'Manual parsing required'
        }
    
    def _normalize_hours_dict(self, hours_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize hours dictionary format."""
        normalized = {}
        
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        for day in days:
            if day in hours_dict:
                day_hours = hours_dict[day]
                if isinstance(day_hours, str):
                    normalized[day] = self._parse_day_hours(day_hours)
                else:
                    normalized[day] = day_hours
        
        return normalized
    
    def _parse_day_hours(self, day_hours: str) -> Dict[str, Any]:
        """Parse individual day hours."""
        day_hours = day_hours.strip().lower()
        
        if self.HOURS_PATTERNS['closed'].match(day_hours):
            return {'closed': True}
        
        if self.HOURS_PATTERNS['24_hour'].match(day_hours):
            return {'open_24h': True}
        
        # Try to parse time ranges
        time_match = self.HOURS_PATTERNS['time_range'].search(day_hours)
        if time_match:
            return {
                'open_time': f"{time_match.group(1)}:{time_match.group(2) or '00'}",
                'close_time': f"{time_match.group(4)}:{time_match.group(5) or '00'}",
                'raw': day_hours
            }
        
        return {'raw': day_hours, 'parsed': False}
    
    def _generate_display_name(self, restaurant: Dict[str, Any]) -> str:
        """Generate display name for restaurant."""
        name = restaurant.get('name', 'Unknown Restaurant')
        
        # Add kosher indicator if applicable
        kosher_category = restaurant.get('kosher_category')
        if kosher_category and kosher_category != 'not_kosher':
            if kosher_category == 'kosher':
                name += ' (Kosher)'
            elif kosher_category == 'kosher_style':
                name += ' (Kosher Style)'
        
        return name
    
    def _is_restaurant_open(self, restaurant: Dict[str, Any]) -> Optional[bool]:
        """Check if restaurant is currently open."""
        try:
            hours = restaurant.get('hours')
            if not hours:
                return None
            
            now = datetime.now()
            day_name = now.strftime('%A').lower()
            
            day_hours = hours.get(day_name)
            if not day_hours:
                return None
            
            if day_hours.get('closed'):
                return False
            
            if day_hours.get('open_24h'):
                return True
            
            # Check time ranges (simplified)
            # In a real implementation, you'd have more robust time parsing
            return None
            
        except Exception as e:
            logger.warning(f"Error checking if restaurant is open: {e}")
            return None
    
    def _get_todays_hours(self, restaurant: Dict[str, Any]) -> Optional[str]:
        """Get today's hours for display."""
        try:
            hours = restaurant.get('hours')
            if not hours:
                return None
            
            today = datetime.now().strftime('%A').lower()
            day_hours = hours.get(today)
            
            if not day_hours:
                return None
            
            if day_hours.get('closed'):
                return 'Closed'
            
            if day_hours.get('open_24h'):
                return 'Open 24 hours'
            
            open_time = day_hours.get('open_time')
            close_time = day_hours.get('close_time')
            
            if open_time and close_time:
                return f"{open_time} - {close_time}"
            
            return day_hours.get('raw', 'Hours available')
            
        except Exception as e:
            logger.warning(f"Error getting today's hours: {e}")
            return None
    
    def _get_user_rating(self, restaurant_id: int, user_id: str) -> Optional[float]:
        """Get user's rating for restaurant."""
        # This would query the reviews/ratings table
        # Simplified implementation
        return None
    
    def _is_user_favorite(self, restaurant_id: int, user_id: str) -> bool:
        """Check if restaurant is user's favorite."""
        # This would query the favorites table
        # Simplified implementation
        return False
    
    def _has_user_visited(self, restaurant_id: int, user_id: str) -> bool:
        """Check if user has visited restaurant."""
        # This would query the visits/check-ins table
        # Simplified implementation
        return False
    
    def _format_restaurant_response(self, restaurant: Dict[str, Any]) -> Dict[str, Any]:
        """Format restaurant data for API response."""
        # Remove internal fields, format dates, etc.
        formatted = restaurant.copy()
        
        # Format datetime fields
        for field in ['created_at', 'updated_at']:
            if field in formatted and formatted[field]:
                if isinstance(formatted[field], str):
                    # Already formatted
                    pass
                elif isinstance(formatted[field], datetime):
                    formatted[field] = formatted[field].isoformat()
        
        # Remove sensitive internal fields
        internal_fields = ['deleted_at', 'deleted_by', 'internal_notes']
        for field in internal_fields:
            formatted.pop(field, None)
        
        return formatted
    
    def _rank_search_results(self, restaurants: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Apply search ranking to results."""
        # Simplified ranking - in a real system you'd use more sophisticated algorithms
        query_lower = query.lower()
        
        def calculate_score(restaurant):
            score = 0
            name = restaurant.get('name', '').lower()
            description = restaurant.get('description', '').lower()
            
            # Exact name match gets highest score
            if query_lower == name:
                score += 100
            # Name starts with query
            elif name.startswith(query_lower):
                score += 80
            # Query appears in name
            elif query_lower in name:
                score += 60
            # Query appears in description
            elif query_lower in description:
                score += 40
            
            # Boost for highly rated restaurants
            rating = restaurant.get('rating', 0)
            if rating:
                score += rating * 5
            
            return score
        
        # Sort by score
        scored_restaurants = [(r, calculate_score(r)) for r in restaurants]
        scored_restaurants.sort(key=lambda x: x[1], reverse=True)
        
        return [r[0] for r in scored_restaurants]
    
    def _generate_cache_key(self, operation: str, params: Dict[str, Any]) -> str:
        """Generate cache key for operation."""
        # Create deterministic cache key
        import hashlib
        
        params_str = json.dumps(params, sort_keys=True, default=str)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
        
        return f"restaurant_service:{operation}:{params_hash}"
    
    def _invalidate_restaurant_caches(self, restaurant_id: int):
        """Invalidate restaurant-related caches."""
        try:
            # Invalidate specific restaurant caches
            patterns = [
                f"restaurant:{restaurant_id}:*",
                "restaurants_list:*",
                "restaurant_service:*"
            ]
            
            for pattern in patterns:
                keys = self.cache_manager.keys(pattern, prefix='cache')
                for key in keys:
                    self.cache_manager.delete(key, prefix='cache')
            
            # Trigger cache invalidation event
            self._publish_event('cache_invalidate', {
                'entity_type': 'restaurant',
                'entity_id': restaurant_id
            })
            
        except Exception as e:
            logger.error(f"Error invalidating restaurant caches: {e}")
    
    def _publish_event(self, event_type: str, data: Dict[str, Any]):
        """Publish event for cache invalidation and other processing."""
        try:
            if self.event_publisher:
                event = {
                    'type': event_type,
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'data': data
                }
                self.event_publisher.publish(event)
            
        except Exception as e:
            logger.error(f"Error publishing event {event_type}: {e}")


# Factory function
def get_restaurant_service_v5(
    repository=None,
    cache_manager=None,
    event_publisher=None
) -> RestaurantServiceV5:
    """Get restaurant service v5 instance."""
    return RestaurantServiceV5(repository, cache_manager, event_publisher)