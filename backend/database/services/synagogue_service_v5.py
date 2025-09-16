"""
Synagogue service layer for v5 with business logic specific to synagogue operations.

Provides comprehensive synagogue operations including prayer time calculations,
service type management, capacity handling, Jewish calendar integration,
and location-based search with caching optimization.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone, time, timedelta
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from utils.logging_config import get_logger

logger = get_logger(__name__)


class SynagogueServiceV5:
    """Enhanced synagogue service with v5 improvements and Jewish calendar integration."""
    
    # Synagogue-specific validation rules
    VALIDATION_RULES = {
        'name': {'required': True, 'min_length': 2, 'max_length': 200},
        'phone': {'pattern': r'^\+?[\d\s\-\(\)\.]{10,}$'},
        'email': {'pattern': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'},
        'website': {'max_length': 500},
        'denomination': {
            'allowed_values': [
                'orthodox', 'conservative', 'reform', 'reconstructionist',
                'renewal', 'traditional', 'chassidic', 'sephardic', 'other'
            ]
        },
        'services_type': {
            'allowed_values': [
                'daily', 'shabbat_only', 'holidays_only', 'high_holidays_only',
                'special_occasions', 'by_appointment'
            ]
        },
        'status': {'allowed_values': ['active', 'pending', 'closed', 'suspended', 'deleted']},
        'latitude': {'range': [-90.0, 90.0]},
        'longitude': {'range': [-180.0, 180.0]},
        'capacity': {'range': [1, 10000]},
        'wheelchair_accessible': {'type': 'boolean'},
        'parking_available': {'type': 'boolean'}
    }
    
    # Prayer times configuration
    PRAYER_TIMES = {
        'shacharit': {'default_time': '07:00', 'window_minutes': 180},  # 3 hours
        'mincha': {'default_time': '18:30', 'window_minutes': 120},    # 2 hours
        'maariv': {'default_time': '20:00', 'window_minutes': 120},    # 2 hours
        'kabbalat_shabbat': {'default_time': '18:00', 'seasonal': True},
        'shabbat_shacharit': {'default_time': '09:00', 'window_minutes': 120},
        'shabbat_mincha': {'default_time': '17:30', 'seasonal': True}
    }
    
    # Jewish calendar API configuration
    JEWISH_CALENDAR_CONFIG = {
        'api_base_url': 'https://www.hebcal.com/hebcal',
        'default_options': {
            'v': 1,
            'cfg': 'json',
            'maj': 'on',   # Major holidays
            'min': 'on',   # Minor holidays
            'mod': 'on',   # Modern holidays
            'nx': 'on',    # Rosh Chodesh
            'year': 'now',
            'month': 'x',  # Entire year
            'ss': 'on',    # Sedra/Parsha
            'mf': 'on',    # Molad and Rosh Chodesh
        }
    }
    
    def __init__(self, repository=None, cache_manager=None, event_publisher=None):
        """Initialize synagogue service with dependencies."""
        self.repository = repository
        if not self.repository:
            from database.repositories.entity_repository_v5 import get_entity_repository_v5
            self.repository = get_entity_repository_v5()
        
        self.cache_manager = cache_manager
        if not self.cache_manager:
            from cache.redis_manager_v5 import get_redis_manager_v5
            self.cache_manager = get_redis_manager_v5()
        
        self.event_publisher = event_publisher
        
        # Jewish calendar service
        self.jewish_calendar = None
        self._init_jewish_calendar()
    
    def _init_jewish_calendar(self):
        """Initialize Jewish calendar integration."""
        try:
            import requests
            self.jewish_calendar_session = requests.Session()
            self.jewish_calendar_session.headers.update({
                'User-Agent': 'JewGo-Synagogue-Service/1.0'
            })
            logger.info("Jewish calendar integration initialized")
        except ImportError:
            logger.warning("requests library not available for Jewish calendar integration")
    
    def get_entities(
        self,
        filters: Optional[Dict[str, Any]] = None,
        cursor: Optional[str] = None,
        page: Optional[int] = None,
        limit: int = 20,
        sort: str = 'created_at_desc',
        include_relations: bool = False,
        include_filter_options: bool = False,
        user_context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Get entities (synagogues) with API-compatible interface.
        
        This method provides a unified interface for the entity API routes.
        """
        try:
            synagogues, next_cursor, prev_cursor, total_count = self.get_synagogues(
                cursor=cursor,
                page=page,
                limit=limit,
                sort_key=sort,
                filters=filters,
                include_relations=include_relations,
                user_context=user_context,
                use_cache=use_cache
            )
            
            response = {
                'data': synagogues,
                'next_cursor': next_cursor,
                'prev_cursor': prev_cursor,
                'total_count': total_count
            }
            # Optionally include filter options metadata on first page
            if include_filter_options and (page is None or page == 1):
                try:
                    response['filter_options'] = self._get_filter_options()
                except Exception as e:
                    # Don't fail the request if metadata can't be built
                    logger.error(f"Error getting filter options in get_entities: {e}")
                    # Return fallback options instead of empty dict
                    response['filter_options'] = {
                        'denominations': ['orthodox', 'conservative', 'reform', 'reconstructionist'],
                        'shulTypes': ['traditional', 'chabad', 'orthodox', 'sephardic'],
                        'shulCategories': ['ashkenazi', 'chabad', 'sephardic'],
                        'cities': [],
                        'states': [],
                        'ratings': [5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0],
                        'accessibility': ['has_disabled_access', 'has_parking'],
                        'services': ['has_daily_minyan', 'has_shabbat_services', 'has_holiday_services'],
                        'facilities': ['has_parking', 'has_kiddush_facilities', 'has_social_hall', 'has_library', 'has_hebrew_school']
                    }
            return response
            
        except Exception as e:
            logger.error(f"Error getting entities: {e}")
            return {
                'data': [],
                'next_cursor': None,
                'prev_cursor': None,
                'total_count': 0
            }

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
                entity_type='synagogues',
                filters=processed_filters
            )
            
            return count
            
        except Exception as e:
            logger.error(f"Error getting entity count: {e}")
            return 0

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
        
        return processed

    def _get_filter_options(self) -> Dict[str, Any]:
        """Build filter options metadata for synagogues UI using real database data.

        Returns filter options extracted from actual synagogue data in the database.
        """
        try:
            logger.info("Starting to get synagogue filter options from database")
            
            # Get all synagogues to extract unique values
            synagogues, _, _, _ = self.repository.get_entities_with_cursor(
                entity_type='synagogues',
                filters={},
                cursor=None,
                page=None,
                limit=1000,  # Get all synagogues for filter options
                sort_key='created_at_desc'
            )
            
            logger.info(f"Retrieved {len(synagogues)} synagogues for filter options")
            
            # Extract unique values from database
            denominations = set()
            shul_types = set()
            shul_categories = set()
            cities = set()
            states = set()
            ratings = set()
            
            for shul in synagogues:
                if shul.get('denomination'):
                    denominations.add(shul['denomination'])
                if shul.get('shul_type'):
                    shul_types.add(shul['shul_type'])
                if shul.get('shul_category'):
                    shul_categories.add(shul['shul_category'])
                if shul.get('city'):
                    cities.add(shul['city'])
                if shul.get('state'):
                    states.add(shul['state'])
                if shul.get('rating'):
                    # Round ratings to nearest 0.5 for cleaner filter options
                    rounded_rating = round(float(shul['rating']) * 2) / 2
                    ratings.add(rounded_rating)
            
            options: Dict[str, Any] = {
                'denominations': sorted(list(denominations)),
                'shulTypes': sorted(list(shul_types)),
                'shulCategories': sorted(list(shul_categories)),
                'cities': sorted(list(cities)),
                'states': sorted(list(states)),
                'ratings': sorted(list(ratings), reverse=True),  # Highest ratings first
                'accessibility': ['has_disabled_access', 'has_parking'],
                'services': ['has_daily_minyan', 'has_shabbat_services', 'has_holiday_services'],
                'facilities': ['has_parking', 'has_kiddush_facilities', 'has_social_hall', 'has_library', 'has_hebrew_school']
            }
            
            logger.info("Successfully retrieved synagogue filter options from database", 
                           options_count=len(options))
            return options
        except Exception as e:
            logger.error(f"Error getting synagogue filter options: {e}", exc_info=True)
            # Fallback to static options
            fallback_options = {
                'denominations': ['orthodox', 'conservative', 'reform', 'reconstructionist'],
                'shulTypes': ['traditional', 'chabad', 'orthodox', 'sephardic'],
                'shulCategories': ['ashkenazi', 'chabad', 'sephardic'],
                'cities': [],
                'states': [],
                'ratings': [5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0],
                'accessibility': ['has_disabled_access', 'has_parking'],
                'services': ['has_daily_minyan', 'has_shabbat_services', 'has_holiday_services'],
                'facilities': ['has_parking', 'has_kiddush_facilities', 'has_social_hall', 'has_library', 'has_hebrew_school']
            }
            logger.info(f"Returning fallback filter options: {fallback_options}")
            return fallback_options

    def get_filter_options(self) -> Dict[str, Any]:
        """Get available filter options for synagogues using efficient database queries."""
        try:
            # Use cache for filter options (they don't change frequently)
            cache_key = f"synagogue_filter_options_v2"
            if self.cache_manager:
                cached_options = self.cache_manager.get(cache_key)
                if cached_options:
                    logger.info("Retrieved synagogue filter options from cache")
                    return cached_options
            
            # Get filter options from database
            filter_options = self._get_filter_options()
            
            # Cache the results
            if self.cache_manager:
                self.cache_manager.set(cache_key, filter_options, ttl=3600)  # Cache for 1 hour
            
            return filter_options
            
        except Exception as e:
            logger.error(f"Error getting synagogue filter options: {e}")
            # Fallback to static options
            return {
                'denominations': ['orthodox', 'conservative', 'reform', 'reconstructionist'],
                'shulTypes': ['traditional', 'ashkenazi', 'sephardic', 'chabad'],
                'cities': [],
                'states': [],
                'ratings': [5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0],
                'accessibility': ['wheelchair_accessible', 'parking_available'],
                'services': ['daily_minyan', 'shabbat_services', 'holiday_services'],
                'facilities': ['parking', 'kiddush_facilities', 'social_hall', 'library', 'hebrew_school']
            }

    def get_synagogues(
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
        Get synagogues with enhanced filtering and Jewish calendar integration.
        
        Args:
            cursor: Cursor for pagination
            limit: Maximum number of synagogues to return
            sort_key: Sorting strategy
            filters: Filtering criteria
            include_relations: Whether to include related data
            user_context: User context for personalization
            use_cache: Whether to use caching
            
        Returns:
            Tuple of (synagogues, next_cursor, prev_cursor)
        """
        try:
            # Check cache first if enabled
            cache_key = None
            if use_cache:
                cache_key = self._generate_cache_key('synagogues_list', {
                    'cursor': cursor,
                    'limit': limit,
                    'sort_key': sort_key,
                    'filters': filters,
                    'include_relations': include_relations,
                    'user_id': user_context.get('user_id') if user_context else None
                })
                
                cached_result = self.cache_manager.get(cache_key, prefix='cache')
                if cached_result:
                    logger.debug("Synagogue list cache hit")
                    return cached_result
            
            # Process and validate filters
            processed_filters = self._process_synagogue_filters(filters)
            
            # Get synagogues from repository
            synagogues, next_cursor, prev_cursor, total_count = self.repository.get_entities_with_cursor(
                entity_type='synagogues',
                cursor=cursor,
                page=page,
                limit=limit,
                sort_key=sort_key,
                filters=processed_filters,
                include_relations=include_relations,
                user_context=user_context
            )
            
            # Enhance synagogue data
            enhanced_synagogues = []
            for synagogue in synagogues:
                enhanced = self._enhance_synagogue_data(synagogue, user_context)
                enhanced_synagogues.append(enhanced)
            
            result = (enhanced_synagogues, next_cursor, prev_cursor, total_count)
            
            # Cache result
            if use_cache and cache_key:
                self.cache_manager.set(
                    cache_key,
                    result,
                    ttl=300,  # 5 minutes
                    prefix='cache'
                )
            
            logger.info(f"Retrieved {len(enhanced_synagogues)} synagogues, total: {total_count}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting synagogues: {e}")
            return [], None, None, 0
    
    def get_entity(self, entity_id: int) -> Optional[Dict[str, Any]]:
        """
        Get entity by ID - wrapper for get_synagogue_by_id for API compatibility.
        
        Args:
            entity_id: Entity ID (synagogue ID)
            
        Returns:
            Synagogue dictionary or None if not found
        """
        return self.get_synagogue_by_id(entity_id)

    def get_synagogue_by_id(
        self,
        synagogue_id: int,
        include_relations: bool = True,
        user_context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Get synagogue by ID with enhanced data and prayer times.
        
        Args:
            synagogue_id: Synagogue ID
            include_relations: Whether to include related data
            user_context: User context for personalization
            use_cache: Whether to use caching
            
        Returns:
            Synagogue dictionary or None if not found
        """
        try:
            # Check cache first
            cache_key = None
            if use_cache:
                cache_key = f"synagogue:{synagogue_id}:relations:{include_relations}"
                if user_context:
                    cache_key += f":user:{user_context.get('user_id')}"
                
                cached_synagogue = self.cache_manager.get(cache_key, prefix='cache')
                if cached_synagogue:
                    logger.debug(f"Synagogue {synagogue_id} cache hit")
                    return cached_synagogue
            
            # Get synagogue from repository
            synagogue = self.repository.get_entity_by_id(
                entity_type='synagogues',
                entity_id=synagogue_id,
                include_relations=include_relations,
                user_context=user_context
            )
            
            if not synagogue:
                return None
            
            # Enhance synagogue data
            enhanced_synagogue = self._enhance_synagogue_data(synagogue, user_context)
            
            # Cache result
            if use_cache and cache_key:
                self.cache_manager.set(
                    cache_key,
                    enhanced_synagogue,
                    ttl=600,  # 10 minutes
                    prefix='cache'
                )
            
            logger.info(f"Retrieved synagogue {synagogue_id}")
            return enhanced_synagogue
            
        except Exception as e:
            logger.error(f"Error getting synagogue {synagogue_id}: {e}")
            return None
    
    def create_synagogue(
        self,
        data: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Create new synagogue with validation.
        
        Args:
            data: Synagogue data
            user_context: User context for audit logging
            
        Returns:
            Created synagogue dictionary or None if failed
        """
        try:
            # Validate synagogue data
            validation_errors = self._validate_synagogue_data(data, 'create')
            if validation_errors:
                logger.warning(f"Synagogue validation failed: {validation_errors}")
                return None
            
            # Process services and hours data
            if data.get('services'):
                data['services'] = self._process_services_data(data['services'])
            
            # Create synagogue
            synagogue = self.repository.create_entity(
                entity_type='synagogues',
                data=data,
                user_context=user_context
            )
            
            if not synagogue:
                return None
            
            # Publish creation event
            self._publish_event('synagogue_created', {
                'synagogue_id': synagogue['id'],
                'user_id': user_context.get('user_id') if user_context else None
            })
            
            # Invalidate related caches
            self._invalidate_synagogue_caches(synagogue['id'])
            
            logger.info(f"Created synagogue {synagogue['id']}")
            return synagogue
            
        except Exception as e:
            logger.error(f"Error creating synagogue: {e}")
            return None
    
    def update_synagogue(
        self,
        synagogue_id: int,
        data: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update synagogue with validation.
        
        Args:
            synagogue_id: Synagogue ID
            data: Update data
            user_context: User context for audit logging
            
        Returns:
            Updated synagogue dictionary or None if failed
        """
        try:
            # Validate update data
            validation_errors = self._validate_synagogue_data(data, 'update')
            if validation_errors:
                logger.warning(f"Synagogue update validation failed: {validation_errors}")
                return None
            
            # Process services data if provided
            if data.get('services'):
                data['services'] = self._process_services_data(data['services'])
            
            # Update synagogue
            synagogue = self.repository.update_entity(
                entity_type='synagogues',
                entity_id=synagogue_id,
                data=data,
                user_context=user_context
            )
            
            if not synagogue:
                return None
            
            # Publish update event
            self._publish_event('synagogue_updated', {
                'synagogue_id': synagogue_id,
                'updated_fields': list(data.keys()),
                'user_id': user_context.get('user_id') if user_context else None
            })
            
            # Invalidate caches
            self._invalidate_synagogue_caches(synagogue_id)
            
            logger.info(f"Updated synagogue {synagogue_id}")
            return synagogue
            
        except Exception as e:
            logger.error(f"Error updating synagogue {synagogue_id}: {e}")
            return None
    
    def delete_synagogue(
        self,
        synagogue_id: int,
        user_context: Optional[Dict[str, Any]] = None,
        soft_delete: bool = True
    ) -> bool:
        """
        Delete synagogue with proper cleanup.
        
        Args:
            synagogue_id: Synagogue ID
            user_context: User context for audit logging
            soft_delete: Whether to perform soft delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            success = self.repository.delete_entity(
                entity_type='synagogues',
                entity_id=synagogue_id,
                soft_delete=soft_delete,
                user_context=user_context
            )
            
            if success:
                # Publish deletion event
                self._publish_event('synagogue_deleted', {
                    'synagogue_id': synagogue_id,
                    'soft_delete': soft_delete,
                    'user_id': user_context.get('user_id') if user_context else None
                })
                
                # Invalidate caches
                self._invalidate_synagogue_caches(synagogue_id)
                
                logger.info(f"Deleted synagogue {synagogue_id} (soft={soft_delete})")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting synagogue {synagogue_id}: {e}")
            return False
    
    def get_prayer_times(
        self,
        synagogue_id: int,
        date: Optional[datetime] = None,
        timezone_name: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get prayer times for a specific synagogue and date.
        
        Args:
            synagogue_id: Synagogue ID
            date: Date for prayer times (defaults to today)
            timezone_name: Timezone name (defaults to synagogue's timezone)
            
        Returns:
            Prayer times dictionary or None if not available
        """
        try:
            # Get synagogue
            synagogue = self.get_synagogue_by_id(synagogue_id, use_cache=True)
            if not synagogue:
                return None
            
            # Use provided date or today
            if not date:
                date = datetime.now()
            
            # Determine timezone
            if not timezone_name:
                # Try to get timezone from synagogue location
                timezone_name = self._get_synagogue_timezone(synagogue)
            
            if timezone_name:
                try:
                    tz = ZoneInfo(timezone_name)
                    date = date.replace(tzinfo=tz)
                except Exception:
                    # Fallback to UTC
                    date = date.replace(tzinfo=timezone.utc)
            
            # Check cache for prayer times
            cache_key = f"prayer_times:{synagogue_id}:{date.date()}:{timezone_name}"
            cached_times = self.cache_manager.get(cache_key, prefix='cache')
            if cached_times:
                return cached_times
            
            # Calculate prayer times
            prayer_times = self._calculate_prayer_times(synagogue, date)
            
            # Get Jewish calendar information
            jewish_calendar_info = self._get_jewish_calendar_info(date)
            if jewish_calendar_info:
                prayer_times['jewish_calendar'] = jewish_calendar_info
            
            # Cache result for 24 hours
            self.cache_manager.set(
                cache_key,
                prayer_times,
                ttl=24 * 3600,
                prefix='cache'
            )
            
            return prayer_times
            
        except Exception as e:
            logger.error(f"Error getting prayer times for synagogue {synagogue_id}: {e}")
            return None
    
    def _process_synagogue_filters(self, filters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Process and normalize synagogue-specific filters."""
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
                
                if not processed.get('radius'):
                    processed['radius'] = 25  # 25 miles default
                else:
                    processed['radius'] = float(processed['radius'])
                    
            except (ValueError, TypeError):
                processed.pop('latitude', None)
                processed.pop('longitude', None)
                processed.pop('radius', None)
        
        # Process denomination filter
        if processed.get('denominations'):
            if isinstance(processed['denominations'], str):
                processed['denominations'] = [processed['denominations']]
        
        # Process services filter
        if processed.get('service_types'):
            if isinstance(processed['service_types'], str):
                processed['service_types'] = [processed['service_types']]
        
        # Process accessibility filters
        if processed.get('wheelchair_accessible'):
            processed['wheelchair_accessible'] = str(processed['wheelchair_accessible']).lower() == 'true'
        
        return processed
    
    def _enhance_synagogue_data(self, synagogue: Dict[str, Any], user_context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Enhance synagogue data with computed fields and prayer times."""
        try:
            enhanced = synagogue.copy()
            
            # Add computed fields
            enhanced['display_name'] = self._generate_display_name(synagogue)
            enhanced['services_summary'] = self._get_services_summary(synagogue)
            
            # Add today's prayer times if location available
            if synagogue.get('latitude') and synagogue.get('longitude'):
                today_times = self._get_basic_prayer_times(synagogue)
                if today_times:
                    enhanced['todays_times'] = today_times
            
            # Add Jewish calendar information for today
            today_jewish_info = self._get_jewish_calendar_info(datetime.now())
            if today_jewish_info:
                enhanced['jewish_calendar_today'] = today_jewish_info
            
            # Add user-specific fields if user context provided
            if user_context:
                user_id = user_context.get('user_id')
                if user_id:
                    enhanced['user_favorite'] = self._is_user_favorite_synagogue(synagogue['id'], user_id)
            
            # Format data for API response
            enhanced = self._format_synagogue_response(enhanced)
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Error enhancing synagogue data: {e}")
            return synagogue
    
    def _validate_synagogue_data(self, data: Dict[str, Any], operation: str) -> List[str]:
        """Validate synagogue data according to business rules."""
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
                
                # Type validation
                field_type = rules.get('type')
                if value is not None and field_type:
                    if field_type == 'boolean' and not isinstance(value, bool):
                        try:
                            # Try to convert string to boolean
                            if isinstance(value, str):
                                data[field] = value.lower() in ('true', '1', 'yes', 'on')
                        except:
                            errors.append(f"{field} must be a boolean value")
                
                # Length validation for strings
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
                    import re
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
            logger.error(f"Error validating synagogue data: {e}")
            return [f"Validation error: {e}"]
    
    def _process_services_data(self, services_data: Any) -> Dict[str, Any]:
        """Process and normalize services data."""
        try:
            if isinstance(services_data, dict):
                processed = {}
                
                # Process prayer times
                for prayer, config in self.PRAYER_TIMES.items():
                    if prayer in services_data:
                        processed[prayer] = self._parse_service_time(services_data[prayer])
                
                # Add special services
                if services_data.get('special_services'):
                    processed['special_services'] = services_data['special_services']
                
                if services_data.get('holiday_schedule'):
                    processed['holiday_schedule'] = services_data['holiday_schedule']
                
                return processed
            
            return {'raw_data': services_data}
            
        except Exception as e:
            logger.error(f"Error processing services data: {e}")
            return {'error': 'Processing failed'}
    
    def _parse_service_time(self, time_data: Any) -> Dict[str, Any]:
        """Parse service time data into structured format."""
        if isinstance(time_data, str):
            # Try to parse time string
            try:
                # Handle formats like "7:00 AM", "19:30", etc.
                import re
                time_match = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', time_data.upper())
                if time_match:
                    hour = int(time_match.group(1))
                    minute = int(time_match.group(2))
                    am_pm = time_match.group(3)
                    
                    if am_pm == 'PM' and hour < 12:
                        hour += 12
                    elif am_pm == 'AM' and hour == 12:
                        hour = 0
                    
                    return {
                        'time': f"{hour:02d}:{minute:02d}",
                        'raw': time_data
                    }
                else:
                    return {'raw': time_data, 'parsed': False}
            except Exception:
                return {'raw': time_data, 'error': 'Parse failed'}
        
        elif isinstance(time_data, dict):
            return time_data
        
        return {'value': time_data}
    
    def _calculate_prayer_times(self, synagogue: Dict[str, Any], date: datetime) -> Dict[str, Any]:
        """Calculate prayer times for synagogue and date."""
        try:
            # This is a simplified implementation
            # In a real system, you'd use a proper Jewish calendar library
            # like pyluach or integrate with HebCal API
            
            prayer_times = {}
            
            # Get basic times from synagogue services or use defaults
            services = synagogue.get('services', {})
            
            for prayer, config in self.PRAYER_TIMES.items():
                service_time = services.get(prayer)
                
                if service_time and isinstance(service_time, dict):
                    prayer_times[prayer] = service_time.get('time', config['default_time'])
                else:
                    prayer_times[prayer] = config['default_time']
            
            # Add seasonal adjustments (simplified)
            if date.month in [11, 12, 1, 2]:  # Winter months
                # Earlier candle lighting in winter
                if 'kabbalat_shabbat' in prayer_times:
                    # This would be calculated based on sunset times
                    prayer_times['kabbalat_shabbat'] = '17:30'
            else:  # Summer months
                if 'kabbalat_shabbat' in prayer_times:
                    prayer_times['kabbalat_shabbat'] = '19:00'
            
            return {
                'date': date.date().isoformat(),
                'times': prayer_times,
                'timezone': str(date.tzinfo) if date.tzinfo else 'UTC',
                'source': 'synagogue_schedule'
            }
            
        except Exception as e:
            logger.error(f"Error calculating prayer times: {e}")
            return {'error': 'Calculation failed'}
    
    def _get_jewish_calendar_info(self, date: datetime) -> Optional[Dict[str, Any]]:
        """Get Jewish calendar information for date."""
        try:
            # Check cache first
            cache_key = f"jewish_calendar:{date.date()}"
            cached_info = self.cache_manager.get(cache_key, prefix='cache')
            if cached_info:
                return cached_info
            
            # Try to fetch from HebCal API
            if hasattr(self, 'jewish_calendar_session'):
                params = self.JEWISH_CALENDAR_CONFIG['default_options'].copy()
                params.update({
                    'year': date.year,
                    'month': date.month,
                    'ss': 'on'  # Include sedra
                })
                
                try:
                    response = self.jewish_calendar_session.get(
                        self.JEWISH_CALENDAR_CONFIG['api_base_url'],
                        params=params,
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Extract relevant information for the specific date
                        calendar_info = self._parse_jewish_calendar_response(data, date)
                        
                        # Cache for 24 hours
                        self.cache_manager.set(
                            cache_key,
                            calendar_info,
                            ttl=24 * 3600,
                            prefix='cache'
                        )
                        
                        return calendar_info
                        
                except Exception as e:
                    logger.warning(f"Error fetching Jewish calendar data: {e}")
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting Jewish calendar info: {e}")
            return None
    
    def _parse_jewish_calendar_response(self, data: Dict[str, Any], date: datetime) -> Dict[str, Any]:
        """Parse Jewish calendar API response for specific date."""
        try:
            calendar_info = {
                'hebrew_date': None,
                'parsha': None,
                'holidays': [],
                'candle_lighting': None,
                'havdalah': None
            }
            
            items = data.get('items', [])
            target_date = date.date()
            
            for item in items:
                item_date_str = item.get('date')
                if not item_date_str:
                    continue
                
                try:
                    item_date = datetime.strptime(item_date_str, '%Y-%m-%d').date()
                    if item_date == target_date:
                        
                        category = item.get('category')
                        title = item.get('title')
                        hebrew = item.get('hebrew')
                        
                        if category == 'parashat':
                            calendar_info['parsha'] = {
                                'english': title,
                                'hebrew': hebrew
                            }
                        elif category in ['holiday', 'roshchodesh', 'fastday']:
                            calendar_info['holidays'].append({
                                'name': title,
                                'hebrew': hebrew,
                                'category': category
                            })
                        elif category == 'candles':
                            calendar_info['candle_lighting'] = item.get('title')
                        elif category == 'havdalah':
                            calendar_info['havdalah'] = item.get('title')
                        elif category == 'hebdate':
                            calendar_info['hebrew_date'] = {
                                'english': title,
                                'hebrew': hebrew
                            }
                
                except ValueError:
                    continue
            
            return calendar_info
            
        except Exception as e:
            logger.error(f"Error parsing Jewish calendar response: {e}")
            return {'error': 'Parse failed'}
    
    def _get_synagogue_timezone(self, synagogue: Dict[str, Any]) -> Optional[str]:
        """Get timezone for synagogue based on location."""
        # This is a simplified implementation
        # In a real system, you'd use a timezone lookup service
        
        latitude = synagogue.get('latitude')
        longitude = synagogue.get('longitude')
        
        if not latitude or not longitude:
            return None
        
        # Simple timezone mapping for major US cities
        # In production, use a proper timezone lookup service
        if -125 <= longitude <= -120:
            return 'America/Los_Angeles'
        elif -120 <= longitude <= -105:
            return 'America/Denver'
        elif -105 <= longitude <= -90:
            return 'America/Chicago'
        elif -90 <= longitude <= -65:
            return 'America/New_York'
        else:
            return 'UTC'
    
    def _get_basic_prayer_times(self, synagogue: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """Get basic prayer times for today."""
        try:
            services = synagogue.get('services', {})
            
            basic_times = {}
            for prayer in ['shacharit', 'mincha', 'maariv']:
                service = services.get(prayer)
                if service and isinstance(service, dict):
                    time_str = service.get('time')
                    if time_str:
                        basic_times[prayer] = time_str
            
            return basic_times if basic_times else None
            
        except Exception as e:
            logger.error(f"Error getting basic prayer times: {e}")
            return None
    
    def _generate_display_name(self, synagogue: Dict[str, Any]) -> str:
        """Generate display name for synagogue."""
        name = synagogue.get('name', 'Unknown Synagogue')
        denomination = synagogue.get('denomination')
        
        if denomination and denomination != 'other':
            name += f" ({denomination.title()})"
        
        return name
    
    def _get_services_summary(self, synagogue: Dict[str, Any]) -> str:
        """Get summary of synagogue services."""
        services_type = synagogue.get('services_type', 'unknown')
        
        services_map = {
            'daily': 'Daily services',
            'shabbat_only': 'Shabbat services only',
            'holidays_only': 'Holiday services only',
            'high_holidays_only': 'High Holiday services only',
            'special_occasions': 'Special occasion services',
            'by_appointment': 'Services by appointment'
        }
        
        return services_map.get(services_type, 'Service schedule varies')
    
    def _is_user_favorite_synagogue(self, synagogue_id: int, user_id: str) -> bool:
        """Check if synagogue is user's favorite."""
        # Simplified implementation
        return False
    
    def _format_synagogue_response(self, synagogue: Dict[str, Any]) -> Dict[str, Any]:
        """Format synagogue data for API response."""
        formatted = synagogue.copy()
        
        # Format datetime fields
        for field in ['created_at', 'updated_at']:
            if field in formatted and formatted[field]:
                if isinstance(formatted[field], str):
                    pass
                elif isinstance(formatted[field], datetime):
                    formatted[field] = formatted[field].isoformat()
        
        # Remove sensitive internal fields
        internal_fields = ['deleted_at', 'deleted_by', 'internal_notes']
        for field in internal_fields:
            formatted.pop(field, None)
        
        return formatted
    
    def _generate_cache_key(self, operation: str, params: Dict[str, Any]) -> str:
        """Generate cache key for operation."""
        import hashlib
        
        params_str = json.dumps(params, sort_keys=True, default=str)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
        
        return f"synagogue_service:{operation}:{params_hash}"
    
    def _invalidate_synagogue_caches(self, synagogue_id: int):
        """Invalidate synagogue-related caches."""
        try:
            patterns = [
                f"synagogue:{synagogue_id}:*",
                "synagogues_list:*",
                "synagogue_service:*",
                f"prayer_times:{synagogue_id}:*"
            ]
            
            for pattern in patterns:
                keys = self.cache_manager.keys(pattern, prefix='cache')
                for key in keys:
                    self.cache_manager.delete(key, prefix='cache')
            
            # Trigger cache invalidation event
            self._publish_event('cache_invalidate', {
                'entity_type': 'synagogue',
                'entity_id': synagogue_id
            })
            
        except Exception as e:
            logger.error(f"Error invalidating synagogue caches: {e}")
    
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
def get_synagogue_service_v5(
    repository=None,
    cache_manager=None,
    event_publisher=None
) -> SynagogueServiceV5:
    """Get synagogue service v5 instance."""
    return SynagogueServiceV5(repository, cache_manager, event_publisher)
