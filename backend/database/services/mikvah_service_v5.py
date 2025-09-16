#!/usr/bin/env python3
"""Enhanced Mikvah service for v5 API with comprehensive functionality.

This service provides mikvah management with Jewish calendar integration,
appointment scheduling, and specialized religious requirements.
"""

from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import requests
from flask import current_app
import calendar
from utils.logging_config import get_logger
from database.repositories.entity_repository_v5 import EntityRepositoryV5
from cache.redis_manager_v5 import RedisManagerV5
from utils.feature_flags_v5 import FeatureFlagsV5

logger = get_logger(__name__)


class MikvahServiceV5:
    """Enhanced mikvah service with Jewish calendar integration and appointment management."""
    
    def __init__(self, entity_repository: EntityRepositoryV5, redis_manager: RedisManagerV5, feature_flags: FeatureFlagsV5):
        """Initialize mikvah service.
        
        Args:
            entity_repository: Generic entity repository for database operations
            redis_manager: Redis manager for caching and session management
            feature_flags: Feature flags manager for gradual rollouts
        """
        self.repository = entity_repository
        self.redis_manager = redis_manager
        self.feature_flags = feature_flags
        self.logger = logger.bind(service="mikvah_v5")
        
        # External API configurations
        self.hebcal_api_base = "https://www.hebcal.com/converter"
        self.hebcal_timeout = 5
        
        # Cache configurations
        self.cache_config = {
            'mikvah_details': {'ttl': 3600, 'prefix': 'mikvah_v5'},  # 1 hour
            'jewish_calendar': {'ttl': 86400, 'prefix': 'jewish_cal'},  # 24 hours
            'mikvah_hours': {'ttl': 1800, 'prefix': 'mikvah_hours'},  # 30 minutes
            'appointments': {'ttl': 300, 'prefix': 'appointments'}  # 5 minutes
        }
        
        # Mikvah operating configurations
        self.operating_config = {
            'default_appointment_duration': 60,  # minutes
            'advance_booking_days': 30,
            'cancellation_window_hours': 24,
            'cleanup_time_minutes': 15
        }

    def get_entities(
        self,
        filters: Optional[Dict[str, Any]] = None,
        cursor: Optional[str] = None,
        page: Optional[int] = None,
        limit: int = 20,
        sort: str = 'created_at_desc',
        include_relations: bool = False,
        user_context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True,
        include_filter_options: bool = False
    ) -> Dict[str, Any]:
        """
        Get entities (mikvahs) with API-compatible interface.
        
        This method provides a unified interface for the entity API routes.
        """
        try:
            result = self.get_mikvahs(
                filters=filters,
                cursor=cursor,
                page=page,
                limit=limit,
                sort_key=sort
            )
            
            response = {
                'success': True,
                'data': result.get('data', []),
                'pagination': {
                    'next_cursor': result.get('pagination', {}).get('next_cursor'),
                    'prev_cursor': result.get('pagination', {}).get('prev_cursor'),
                    'limit': limit,
                    'has_more': result.get('pagination', {}).get('next_cursor') is not None
                },
                'meta': {
                    'total_count': result.get('total_count', 0),
                    'entity_type': 'mikvahs'
                }
            }
            
            # Optionally include filter options metadata on first page
            if include_filter_options and (page is None or page == 1):
                try:
                    response['filter_options'] = self.get_filter_options()
                except Exception as e:
                    # Don't fail the request if metadata can't be built
                    logger.error(f"Error getting filter options in get_entities: {e}")
                    # Return fallback options instead of empty dict
                    response['filter_options'] = {
                        'appointmentRequired': ['true', 'false'],
                        'statuses': ['active', 'inactive', 'pending'],
                        'cities': [],
                        'contactPersons': [],
                        'facilities': ['appointment_required', 'is_currently_open'],
                        'accessibility': ['appointment_required'],
                        'appointmentTypes': ['appointment_required', 'walk_in_available']
                    }
            
            return response
        except Exception as e:
            logger.error(f"Failed to get mikvahs: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': [],
                'pagination': {
                    'next_cursor': None,
                    'prev_cursor': None,
                    'limit': limit,
                    'has_more': False
                },
                'meta': {
                    'total_count': 0,
                    'entity_type': 'mikvahs'
                }
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
                entity_type='mikvahs',
                filters=processed_filters
            )
            
            return count
            
        except Exception as e:
            logger.error(f"Error getting entity count: {e}")
            return 0

    def get_entity(self, entity_id: int) -> Optional[Dict[str, Any]]:
        """
        Get entity by ID - wrapper for get_mikvah for API compatibility.
        
        Args:
            entity_id: Entity ID (mikvah ID)
            
        Returns:
            Mikvah dictionary or None if not found
        """
        return self.get_mikvah(entity_id)

    def get_mikvah(self, mikvah_id: int, enrich: bool = True) -> Optional[Dict[str, Any]]:
        """Get mikvah by ID with optional enrichment.
        
        Args:
            mikvah_id: Mikvah ID
            enrich: Whether to enrich with additional data
            
        Returns:
            Mikvah data with enrichment or None if not found
        """
        try:
            cache_key = f"mikvah_details:{mikvah_id}:{enrich}"
            cached = self.redis_manager.get(
                cache_key, 
                prefix=self.cache_config['mikvah_details']['prefix']
            )
            if cached:
                self.logger.debug("Retrieved mikvah from cache", mikvah_id=mikvah_id)
                return cached
                
            # Get base mikvah data
            mikvah = self.repository.get_entity_by_id('mikvahs', mikvah_id)
            if not mikvah:
                return None
                
            mikvah_data = self._format_mikvah_response(mikvah)
            
            if enrich:
                mikvah_data = self._enrich_mikvah_data(mikvah_data)
                
            # Cache the result
            self.redis_manager.set(
                cache_key,
                mikvah_data,
                ttl=self.cache_config['mikvah_details']['ttl'],
                prefix=self.cache_config['mikvah_details']['prefix']
            )
            
            self.logger.info("Retrieved mikvah successfully", mikvah_id=mikvah_id, enriched=enrich)
            return mikvah_data
            
        except Exception as e:
            self.logger.exception("Failed to get mikvah", mikvah_id=mikvah_id, error=str(e))
            return None

    def get_filter_options(self) -> Dict[str, Any]:
        """Get available filter options for mikvahs using real database data.

        Returns filter options extracted from actual mikvah data in the database.
        """
        try:
            # Get all mikvahs to extract unique values
            mikvahs, _, _, _ = self.repository.get_entities_with_cursor(
                entity_type='mikvahs',
                filters={},
                cursor=None,
                page=None,
                limit=1000,  # Get all mikvahs for filter options
                sort_key='created_at_desc'
            )
            
            # Extract unique values from database based on actual mikvah fields
            appointment_required = set()
            statuses = set()
            cities = set()
            states = set()
            contact_persons = set()
            
            for mikvah in mikvahs:
                if mikvah.get('appointment_required') is not None:
                    appointment_required.add(str(mikvah['appointment_required']))
                if mikvah.get('status'):
                    statuses.add(mikvah['status'])
                if mikvah.get('contact_person'):
                    contact_persons.add(mikvah['contact_person'])
                # Extract city from address if available
                if mikvah.get('address'):
                    # Try to extract city from address (this is a simple approach)
                    address_parts = mikvah['address'].split(',')
                    if len(address_parts) >= 2:
                        city = address_parts[-2].strip()
                        cities.add(city)
            
            options: Dict[str, Any] = {
                'appointmentRequired': sorted(list(appointment_required)),
                'statuses': sorted(list(statuses)),
                'cities': sorted(list(cities)),
                'contactPersons': sorted(list(contact_persons)),
                'facilities': ['appointment_required', 'is_currently_open'],
                'accessibility': ['appointment_required'],
                'appointmentTypes': ['appointment_required', 'walk_in_available']
            }
            
            self.logger.info("Successfully retrieved mikvah filter options from database", 
                           options_count=len(options))
            return options
        except Exception as e:
            self.logger.error(f"Error getting mikvah filter options: {e}")
            # Fallback to static options based on actual mikvah fields
            return {
                'appointmentRequired': ['true', 'false'],
                'statuses': ['active', 'inactive', 'pending'],
                'cities': [],
                'contactPersons': [],
                'facilities': ['appointment_required', 'is_currently_open'],
                'accessibility': ['appointment_required'],
                'appointmentTypes': ['appointment_required', 'walk_in_available']
            }

    def get_mikvahs(self, filters: Optional[Dict[str, Any]] = None, cursor: Optional[str] = None,
                   page: Optional[int] = None, limit: int = 20, sort_key: str = 'created_at_desc') -> Dict[str, Any]:
        """Get mikvahs with filtering and pagination.
        
        Args:
            filters: Filter criteria
            cursor: Pagination cursor
            limit: Number of results per page
            sort_key: Sort strategy
            
        Returns:
            Paginated mikvah results with metadata
        """
        try:
            # Normalize filters (e.g., coerce booleans, parse numbers)
            processed_filters = self._process_filters(filters)

            # Get paginated results from repository
            try:
                entities, next_cursor, prev_cursor, total_count = self.repository.get_entities_with_cursor(
                    entity_type='mikvahs',
                    filters=processed_filters,
                    cursor=cursor,
                    page=page,
                    limit=limit,
                    sort_key=sort_key
                )
                # Handle the 4-tuple return (entities, next_cursor, prev_cursor, total_count)
                entities, next_cursor, prev_cursor, total_count = entities, next_cursor, prev_cursor, total_count
            except Exception as e:
                self.logger.error(f"Error getting entities from repository: {e}")
                entities, next_cursor, prev_cursor, total_count = [], None, None, 0
            
            # Format result to match expected structure
            result = {
                'data': entities,
                'pagination': {
                    'next_cursor': next_cursor,
                    'prev_cursor': prev_cursor,
                    'has_more': next_cursor is not None
                },
                'total_count': total_count
            }
            
            # Enrich each mikvah with basic additional data
            enriched_mikvahs = []
            for mikvah in result['data']:
                mikvah_data = self._format_mikvah_response(mikvah)
                mikvah_data = self._add_availability_status(mikvah_data)
                enriched_mikvahs.append(mikvah_data)
            
            result['data'] = enriched_mikvahs
            self.logger.info("Retrieved mikvahs successfully", 
                           count=len(enriched_mikvahs), 
                           has_more=result['pagination']['has_more'])
            
            # Return dictionary format to match expected structure
            return {
                'data': enriched_mikvahs,
                'pagination': {
                    'next_cursor': result['pagination']['next_cursor'],
                    'prev_cursor': result['pagination']['prev_cursor'],
                    'has_more': result['pagination']['has_more']
                },
                'total_count': result['total_count']
            }
            
        except Exception as e:
            self.logger.exception("Failed to get mikvahs", error=str(e))
            return {
                'data': [],
                'pagination': {
                    'next_cursor': None,
                    'prev_cursor': None,
                    'has_more': False
                },
                'total_count': 0
            }

    # --- Generic API wrappers for parity with other services ---
    def create_entity(self, data: Dict[str, Any], user_context: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Create a mikvah (generic API wrapper).

        Returns the created entity dictionary on success, or None on failure.
        """
        try:
            # Normalize operating hours if present
            if 'operating_hours' in data and isinstance(data['operating_hours'], dict):
                data['operating_hours'] = self._validate_operating_hours(data['operating_hours'])

            # Remove obviously non-model fields that could cause SQLAlchemy errors
            data.pop('entity_type', None)

            created = self.repository.create_entity('mikvahs', data, user_context=user_context)
            if created:
                self._invalidate_mikvah_caches()
                self.logger.info("Created mikvah via wrapper", mikvah_id=created.get('id'))
            return created
        except Exception as e:
            self.logger.exception("Failed to create mikvah via wrapper", error=str(e))
            return None

    def update_entity(self, entity_id: int, data: Dict[str, Any], user_context: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Update a mikvah (generic API wrapper).

        Returns the updated entity dictionary on success, or None on failure.
        """
        try:
            # Normalize operating hours if present
            if 'operating_hours' in data and isinstance(data['operating_hours'], dict):
                data['operating_hours'] = self._validate_operating_hours(data['operating_hours'])

            # Ensure timestamp update
            data['updated_at'] = datetime.utcnow()

            updated = self.repository.update_entity('mikvahs', entity_id, data, user_context=user_context)
            if updated:
                self._invalidate_mikvah_caches(entity_id)
                self.logger.info("Updated mikvah via wrapper", mikvah_id=entity_id)
            return updated
        except Exception as e:
            self.logger.exception("Failed to update mikvah via wrapper", mikvah_id=entity_id, error=str(e))
            return None

    def _process_filters(self, filters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Process and normalize filter parameters for mikvah queries."""
        if not filters:
            return {}

        processed: Dict[str, Any] = {}

        # Copy non-empty values
        for key, value in filters.items():
            if value is not None and value != '':
                processed[key] = value

        # Coerce booleans from common string forms
        def to_bool(v: Any) -> Optional[bool]:
            if isinstance(v, bool):
                return v
            if isinstance(v, str):
                s = v.strip().lower()
                if s in ('true', '1', 'yes', 'y'): return True
                if s in ('false', '0', 'no', 'n'): return False
            return None

        for bool_key in ('is_active', 'requires_appointment', 'appointment_required'):
            if bool_key in processed:
                b = to_bool(processed[bool_key])
                if b is not None:
                    processed[bool_key] = b
                else:
                    # Remove invalid boolean to avoid filtering out all results
                    processed.pop(bool_key, None)

        # Normalize latitude/longitude and radius if present
        if 'latitude' in processed and 'longitude' in processed:
            try:
                processed['latitude'] = float(processed['latitude'])
                processed['longitude'] = float(processed['longitude'])
                if 'radius' in processed:
                    processed['radius'] = float(processed['radius'])
                else:
                    processed['radius'] = 25.0
            except (ValueError, TypeError):
                processed.pop('latitude', None)
                processed.pop('longitude', None)
                processed.pop('radius', None)

        # Bounds validation if provided already parsed
        if 'bounds' in processed:
            b = processed['bounds']
            if not (isinstance(b, dict) and 'ne' in b and 'sw' in b):
                processed.pop('bounds', None)

        return processed

    def create_mikvah(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create new mikvah with validation.
        
        Args:
            data: Mikvah creation data
            
        Returns:
            Created mikvah data or None if failed
        """
        try:
            # Validate required fields
            required_fields = ['name', 'address', 'phone', 'contact_person']
            if not all(field in data for field in required_fields):
                self.logger.warning("Missing required fields for mikvah creation", 
                                  missing=[f for f in required_fields if f not in data])
                return None
                
            # Set default values
            mikvah_data = {
                **data,
                'entity_type': 'mikvah',
                'status': 'active',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            # Parse and validate operating hours if provided
            if 'operating_hours' in data:
                mikvah_data['operating_hours'] = self._validate_operating_hours(data['operating_hours'])
                
            # Create mikvah
            result = self.repository.create_entity('mikvahs', mikvah_data)
            if result:
                self._invalidate_mikvah_caches()
                self.logger.info("Created mikvah successfully", mikvah_id=result.get('id'))
                
            return result
            
        except Exception as e:
            self.logger.exception("Failed to create mikvah", error=str(e))
            return None

    def update_mikvah(self, mikvah_id: int, data: Dict[str, Any]) -> bool:
        """Update mikvah with validation.
        
        Args:
            mikvah_id: Mikvah ID
            data: Update data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Validate operating hours if being updated
            if 'operating_hours' in data:
                data['operating_hours'] = self._validate_operating_hours(data['operating_hours'])
                
            data['updated_at'] = datetime.utcnow()
            
            success = self.repository.update_entity('mikvahs', mikvah_id, data)
            if success:
                self._invalidate_mikvah_caches(mikvah_id)
                self.logger.info("Updated mikvah successfully", mikvah_id=mikvah_id)
                
            return success
            
        except Exception as e:
            self.logger.exception("Failed to update mikvah", mikvah_id=mikvah_id, error=str(e))
            return False

    def delete_mikvah(self, mikvah_id: int) -> bool:
        """Delete mikvah (soft delete).
        
        Args:
            mikvah_id: Mikvah ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            success = self.repository.update_entity('mikvahs', mikvah_id, {
                'status': 'deleted',
                'deleted_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            
            if success:
                self._invalidate_mikvah_caches(mikvah_id)
                self.logger.info("Deleted mikvah successfully", mikvah_id=mikvah_id)
                
            return success
            
        except Exception as e:
            self.logger.exception("Failed to delete mikvah", mikvah_id=mikvah_id, error=str(e))
            return False

    def get_available_slots(self, mikvah_id: int, date: datetime) -> List[Dict[str, Any]]:
        """Get available appointment slots for a specific date.
        
        Args:
            mikvah_id: Mikvah ID
            date: Date to check availability
            
        Returns:
            List of available time slots
        """
        try:
            cache_key = f"available_slots:{mikvah_id}:{date.strftime('%Y-%m-%d')}"
            cached = self.redis_manager.get(
                cache_key,
                prefix=self.cache_config['appointments']['prefix']
            )
            if cached:
                return cached
                
            # Get mikvah operating hours
            mikvah = self.repository.get_entity_by_id('mikvahs', mikvah_id)
            if not mikvah:
                return []
                
            operating_hours = self._parse_operating_hours(mikvah, date)
            if not operating_hours:
                return []
                
            # Get existing appointments
            existing_appointments = self._get_existing_appointments(mikvah_id, date)
            
            # Generate available slots
            available_slots = self._generate_time_slots(
                operating_hours['open_time'],
                operating_hours['close_time'],
                existing_appointments,
                date
            )
            
            # Cache the result
            self.redis_manager.set(
                cache_key,
                available_slots,
                ttl=self.cache_config['appointments']['ttl'],
                prefix=self.cache_config['appointments']['prefix']
            )
            
            self.logger.info("Generated available slots", 
                           mikvah_id=mikvah_id, 
                           date=date.strftime('%Y-%m-%d'),
                           slots_count=len(available_slots))
            
            return available_slots
            
        except Exception as e:
            self.logger.exception("Failed to get available slots", 
                                mikvah_id=mikvah_id, 
                                date=date.strftime('%Y-%m-%d') if date else None,
                                error=str(e))
            return []

    def get_jewish_calendar_info(self, date: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        """Get Jewish calendar information for a date.
        
        Args:
            date: Date to get info for (defaults to today)
            
        Returns:
            Jewish calendar information or None if unavailable
        """
        if not date:
            date = datetime.now()
            
        try:
            cache_key = f"jewish_calendar:{date.strftime('%Y-%m-%d')}"
            cached = self.redis_manager.get(
                cache_key,
                prefix=self.cache_config['jewish_calendar']['prefix']
            )
            if cached:
                return cached
                
            # Check if feature is enabled
            if not self.feature_flags.is_enabled('jewish_calendar_integration'):
                return None
                
            # Call HebCal API
            calendar_info = self._fetch_jewish_calendar_data(date)
            
            if calendar_info:
                # Cache the result
                self.redis_manager.set(
                    cache_key,
                    calendar_info,
                    ttl=self.cache_config['jewish_calendar']['ttl'],
                    prefix=self.cache_config['jewish_calendar']['prefix']
                )
                
            return calendar_info
            
        except Exception as e:
            self.logger.exception("Failed to get Jewish calendar info", 
                                date=date.strftime('%Y-%m-%d'), 
                                error=str(e))
            return None

    def _format_mikvah_response(self, mikvah: Any) -> Dict[str, Any]:
        """Format mikvah record (ORM or dict) for API response."""
        try:
            if isinstance(mikvah, dict):
                # Repository returns dictionaries; map fields safely
                created_at = mikvah.get('created_at')
                updated_at = mikvah.get('updated_at')
                return {
                    'id': mikvah.get('id'),
                    'name': mikvah.get('name'),
                    'address': mikvah.get('address'),
                    'phone': mikvah.get('phone') or mikvah.get('phone_number'),
                    'contact_person': mikvah.get('contact_person'),
                    'email': mikvah.get('email'),
                    'website': mikvah.get('website'),
                    'operating_hours': mikvah.get('operating_hours') or {},
                    'features': mikvah.get('features') or [],
                    'appointment_required': (
                        mikvah.get('appointment_required')
                        if 'appointment_required' in mikvah
                        else mikvah.get('requires_appointment')
                    ),
                    'latitude': mikvah.get('latitude'),
                    'longitude': mikvah.get('longitude'),
                    'status': mikvah.get('status', 'active'),
                    'created_at': created_at,
                    'updated_at': updated_at,
                }
            else:
                # Fallback for ORM instances
                return {
                    'id': getattr(mikvah, 'id', None),
                    'name': getattr(mikvah, 'name', None),
                    'address': getattr(mikvah, 'address', None),
                    'phone': getattr(mikvah, 'phone', None) or getattr(mikvah, 'phone_number', None),
                    'contact_person': getattr(mikvah, 'contact_person', None),
                    'email': getattr(mikvah, 'email', None),
                    'website': getattr(mikvah, 'website', None),
                    'operating_hours': getattr(mikvah, 'operating_hours', {}) or {},
                    'features': getattr(mikvah, 'features', []) or [],
                    'appointment_required': (
                        getattr(mikvah, 'appointment_required', None)
                        if hasattr(mikvah, 'appointment_required')
                        else getattr(mikvah, 'requires_appointment', None)
                    ),
                    'latitude': float(getattr(mikvah, 'latitude')) if getattr(mikvah, 'latitude', None) is not None else None,
                    'longitude': float(getattr(mikvah, 'longitude')) if getattr(mikvah, 'longitude', None) is not None else None,
                    'status': getattr(mikvah, 'status', 'active'),
                    'created_at': (
                        getattr(getattr(mikvah, 'created_at', None), 'isoformat', lambda: None)()
                        if getattr(mikvah, 'created_at', None) is not None else None
                    ),
                    'updated_at': (
                        getattr(getattr(mikvah, 'updated_at', None), 'isoformat', lambda: None)()
                        if getattr(mikvah, 'updated_at', None) is not None else None
                    ),
                }
        except Exception as e:
            self.logger.warning("Failed to format mikvah response", error=str(e))
            return {'id': mikvah.get('id') if isinstance(mikvah, dict) else getattr(mikvah, 'id', None)}

    def _enrich_mikvah_data(self, mikvah_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich mikvah data with additional information.
        
        Args:
            mikvah_data: Base mikvah data
            
        Returns:
            Enriched mikvah data
        """
        try:
            # Add availability status
            mikvah_data = self._add_availability_status(mikvah_data)
            
            # Add Jewish calendar context if enabled
            if self.feature_flags.is_enabled('jewish_calendar_integration'):
                calendar_info = self.get_jewish_calendar_info()
                if calendar_info:
                    mikvah_data['jewish_calendar'] = calendar_info
                    
            # Add distance if coordinates are available
            if hasattr(current_app, 'user_location') and current_app.user_location:
                if mikvah_data.get('latitude') and mikvah_data.get('longitude'):
                    distance = self._calculate_distance(
                        current_app.user_location['latitude'],
                        current_app.user_location['longitude'],
                        mikvah_data['latitude'],
                        mikvah_data['longitude']
                    )
                    mikvah_data['distance_km'] = round(distance, 2)
                    
            return mikvah_data
            
        except Exception as e:
            self.logger.warning("Failed to enrich mikvah data", 
                              mikvah_id=mikvah_data.get('id'),
                              error=str(e))
            return mikvah_data

    def _add_availability_status(self, mikvah_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add current availability status to mikvah data.
        
        Args:
            mikvah_data: Mikvah data
            
        Returns:
            Mikvah data with availability status
        """
        try:
            now = datetime.now()
            today_hours = self._parse_operating_hours_for_day(mikvah_data.get('operating_hours', {}), now)
            
            if today_hours:
                current_time = now.time()
                is_open = today_hours['open_time'] <= current_time <= today_hours['close_time']
                mikvah_data['is_currently_open'] = is_open
                mikvah_data['next_opening'] = self._get_next_opening_time(mikvah_data.get('operating_hours', {}), now)
            else:
                mikvah_data['is_currently_open'] = False
                mikvah_data['next_opening'] = self._get_next_opening_time(mikvah_data.get('operating_hours', {}), now)
                
            return mikvah_data
            
        except Exception as e:
            self.logger.warning("Failed to add availability status", error=str(e))
            mikvah_data['is_currently_open'] = False
            return mikvah_data

    def _validate_operating_hours(self, operating_hours: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and normalize operating hours format.
        
        Args:
            operating_hours: Operating hours data
            
        Returns:
            Validated operating hours
        """
        days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        validated_hours = {}
        
        for day in days:
            if day in operating_hours:
                day_hours = operating_hours[day]
                if isinstance(day_hours, dict) and 'open' in day_hours and 'close' in day_hours:
                    validated_hours[day] = {
                        'open': day_hours['open'],
                        'close': day_hours['close'],
                        'closed': day_hours.get('closed', False)
                    }
                elif isinstance(day_hours, str) and day_hours.lower() == 'closed':
                    validated_hours[day] = {'closed': True}
                    
        return validated_hours

    def _parse_operating_hours_for_day(self, operating_hours: Dict[str, Any], date: datetime) -> Optional[Dict[str, Any]]:
        """Parse operating hours for a specific day.
        
        Args:
            operating_hours: Operating hours configuration
            date: Date to check
            
        Returns:
            Operating hours for the day or None if closed
        """
        day_name = date.strftime('%A').lower()
        day_hours = operating_hours.get(day_name)
        
        if not day_hours or day_hours.get('closed'):
            return None
            
        try:
            from datetime import time
            open_time = time.fromisoformat(day_hours['open'])
            close_time = time.fromisoformat(day_hours['close'])
            
            return {
                'open_time': open_time,
                'close_time': close_time
            }
        except (ValueError, KeyError):
            return None

    def _get_next_opening_time(self, operating_hours: Dict[str, Any], from_date: datetime) -> Optional[str]:
        """Get the next opening time from a given date.
        
        Args:
            operating_hours: Operating hours configuration
            from_date: Starting date to search from
            
        Returns:
            Next opening datetime as ISO string or None
        """
        for i in range(7):  # Check next 7 days
            check_date = from_date + timedelta(days=i)
            day_hours = self._parse_operating_hours_for_day(operating_hours, check_date)
            
            if day_hours:
                opening_datetime = datetime.combine(check_date.date(), day_hours['open_time'])
                if opening_datetime > from_date:
                    return opening_datetime.isoformat()
                    
        return None

    def _generate_time_slots(self, open_time, close_time, existing_appointments: List[Dict[str, Any]], date: datetime) -> List[Dict[str, Any]]:
        """Generate available time slots for a day.
        
        Args:
            open_time: Opening time
            close_time: Closing time
            existing_appointments: List of existing appointments
            date: Date for slots
            
        Returns:
            List of available time slots
        """
        slots = []
        current_time = datetime.combine(date.date(), open_time)
        end_time = datetime.combine(date.date(), close_time)
        
        duration_minutes = self.operating_config['default_appointment_duration']
        cleanup_minutes = self.operating_config['cleanup_time_minutes']
        
        while current_time + timedelta(minutes=duration_minutes) <= end_time:
            slot_end = current_time + timedelta(minutes=duration_minutes)
            
            # Check if slot conflicts with existing appointments
            is_available = True
            for appointment in existing_appointments:
                app_start = appointment['start_time']
                app_end = appointment['end_time']
                
                if (current_time < app_end and slot_end > app_start):
                    is_available = False
                    break
                    
            if is_available:
                slots.append({
                    'start_time': current_time.isoformat(),
                    'end_time': slot_end.isoformat(),
                    'duration_minutes': duration_minutes,
                    'available': True
                })
                
            current_time += timedelta(minutes=duration_minutes + cleanup_minutes)
            
        return slots

    def _get_existing_appointments(self, mikvah_id: int, date: datetime) -> List[Dict[str, Any]]:
        """Get existing appointments for a mikvah on a specific date.
        
        Args:
            mikvah_id: Mikvah ID
            date: Date to check
            
        Returns:
            List of existing appointments
        """
        try:
            # This would typically query an appointments table
            # For now, return empty list as placeholder
            return []
            
        except Exception as e:
            self.logger.warning("Failed to get existing appointments", 
                              mikvah_id=mikvah_id, 
                              error=str(e))
            return []

    def _fetch_jewish_calendar_data(self, date: datetime) -> Optional[Dict[str, Any]]:
        """Fetch Jewish calendar data from HebCal API.
        
        Args:
            date: Date to get calendar info for
            
        Returns:
            Jewish calendar information or None
        """
        try:
            params = {
                'gy': date.year,
                'gm': date.month,
                'gd': date.day,
                'g2h': 1,
                'cfg': 'json'
            }
            
            response = requests.get(
                self.hebcal_api_base,
                params=params,
                timeout=self.hebcal_timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'hebrew_date': data.get('hebrew'),
                    'hebrew_year': data.get('hy'),
                    'hebrew_month': data.get('hm'),
                    'hebrew_day': data.get('hd'),
                    'hebrew_month_name': data.get('hebrew_month_name'),
                    'is_holiday': data.get('events', []) != [],
                    'events': data.get('events', [])
                }
                
        except Exception as e:
            self.logger.warning("Failed to fetch Jewish calendar data", 
                              date=date.strftime('%Y-%m-%d'),
                              error=str(e))
            
        return None

    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates using Haversine formula.
        
        Args:
            lat1, lon1: First coordinate
            lat2, lon2: Second coordinate
            
        Returns:
            Distance in kilometers
        """
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth's radius in kilometers
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c

    def _invalidate_mikvah_caches(self, mikvah_id: Optional[int] = None):
        """Invalidate mikvah-related caches.
        
        Args:
            mikvah_id: Specific mikvah ID or None for all
        """
        try:
            if mikvah_id:
                # Invalidate specific mikvah caches
                patterns = [
                    f"mikvah_v5:mikvah_details:{mikvah_id}:*",
                    f"appointments:available_slots:{mikvah_id}:*"
                ]
            else:
                # Invalidate all mikvah-related caches
                patterns = [
                    "mikvah_v5:*",
                    "appointments:*",
                    "entity_v5:mikvahs:*"
                ]
                
            for pattern in patterns:
                self.redis_manager.delete_pattern(pattern)
                
            self.logger.debug("Invalidated mikvah caches", 
                            mikvah_id=mikvah_id,
                            patterns=patterns)
                            
        except Exception as e:
            self.logger.warning("Failed to invalidate mikvah caches", error=str(e))
