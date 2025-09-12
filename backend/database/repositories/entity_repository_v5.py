"""
Generic entity repository with enhanced cursor pagination and unified CRUD operations.

Provides comprehensive repository operations for all entity types (restaurants, synagogues,
mikvah, stores) with enhanced cursor pagination, advanced filtering, optimized database
queries, transaction management, and batch operations for v5 API consolidation.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union, Type

from sqlalchemy import and_, func, or_, text, desc, asc
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError, StatementError

from database.base_repository import BaseRepository
from database.connection_manager import DatabaseConnectionManager
from utils.logging_config import get_logger

logger = get_logger(__name__)


class EntityRepositoryV5(BaseRepository):
    """Enhanced generic repository for v5 entity operations."""
    
    # Entity type mappings
    ENTITY_MAPPINGS = {
        'restaurants': {
            'model_name': 'Listing',
            'table_name': 'listings',
            'primary_key': 'id',
            'default_sort': 'created_at',
            'searchable_fields': ['title', 'description', 'address'],
            'filterable_fields': ['is_active', 'category_id', 'is_verified'],
            'relations': ['business_hours', 'reviews', 'restaurant_images'],
            'geospatial': True,
            'supports_reviews': True,
            'category_filter': None
        },
        'synagogues': {
            'model_name': 'Listing',
            'table_name': 'listings',
            'primary_key': 'id',
            'default_sort': 'created_at',
            'searchable_fields': ['title', 'description', 'address'],
            'filterable_fields': ['is_active', 'category_id', 'is_verified'],
            'relations': ['business_hours', 'reviews', 'restaurant_images'],
            'geospatial': True,
            'supports_reviews': True,
            'category_filter': '1cda20e7-518d-44ae-a871-4b25b6620174'  # Synagogue category ID
        },
        'mikvahs': {
            'model_name': 'Mikvah',
            'table_name': 'mikvah',
            'primary_key': 'id',
            'default_sort': 'created_at',
            'searchable_fields': ['name', 'description', 'address'],
            'filterable_fields': ['status', 'accessibility', 'appointment_required'],
            'relations': ['hours'],
            'geospatial': True,
            'supports_reviews': False
        },
        'stores': {
            'model_name': 'Store',
            'table_name': 'stores',
            'primary_key': 'id',
            'default_sort': 'created_at',
            'searchable_fields': ['name', 'description', 'address'],
            'filterable_fields': ['status', 'store_type', 'delivery_available'],
            'relations': ['hours', 'products'],
            'geospatial': True,
            'supports_reviews': False
        }
    }
    
    # Cursor pagination sort strategies
    SORT_STRATEGIES = {
        'created_at_desc': {'field': 'created_at', 'direction': 'DESC', 'secondary': 'id'},
        'created_at_asc': {'field': 'created_at', 'direction': 'ASC', 'secondary': 'id'},
        'updated_at_desc': {'field': 'updated_at', 'direction': 'DESC', 'secondary': 'id'},
        'updated_at_asc': {'field': 'updated_at', 'direction': 'ASC', 'secondary': 'id'},
        'name_asc': {'field': 'title', 'direction': 'ASC', 'secondary': 'id'},
        'name_desc': {'field': 'title', 'direction': 'DESC', 'secondary': 'id'},
        'distance_asc': {'field': 'distance', 'direction': 'ASC', 'secondary': 'id'},
        'rating_desc': {'field': 'rating', 'direction': 'DESC', 'secondary': 'id'}
    }
    
    def __init__(self, connection_manager: DatabaseConnectionManager):
        """Initialize the enhanced entity repository."""
        # We don't call super().__init__ because we handle models dynamically
        self.connection_manager = connection_manager
        self.logger = logger.bind(repository="EntityRepositoryV5")
        
        # Cache for model classes
        self._model_cache = {}
        self._load_models()
    
    def _load_models(self):
        """Load and cache SQLAlchemy model classes."""
        try:
            from database.models import Restaurant, Synagogue, Mikvah, Store, Listing
            
            self._model_cache = {
                'restaurants': Listing,  # Use Listing model for restaurants
                'synagogues': Synagogue,
                'mikvahs': Mikvah,
                'stores': Store
            }
            
            logger.debug(f"Loaded {len(self._model_cache)} entity models")
            
        except ImportError as e:
            logger.error(f"Failed to load entity models: {e}")
            self._model_cache = {}
    
    def get_model_class(self, entity_type: str) -> Optional[Type]:
        """Get SQLAlchemy model class for entity type."""
        return self._model_cache.get(entity_type)
    
    def get_entity_mapping(self, entity_type: str) -> Optional[Dict[str, Any]]:
        """Get entity mapping configuration."""
        return self.ENTITY_MAPPINGS.get(entity_type)
    
    def get_entities_with_cursor(
        self,
        entity_type: str,
        cursor: Optional[str] = None,
        limit: int = 20,
        sort_key: str = 'created_at_desc',
        filters: Optional[Dict[str, Any]] = None,
        include_relations: bool = False,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str]]:
        """
        Get entities with enhanced cursor pagination.
        
        Args:
            entity_type: Type of entity to query
            cursor: Cursor token for pagination
            limit: Maximum number of entities to return
            sort_key: Sorting strategy
            filters: Filtering criteria
            include_relations: Whether to include related data
            user_context: User context for personalization
            
        Returns:
            Tuple of (entities, next_cursor, prev_cursor)
        """
        try:
            model_class = self.get_model_class(entity_type)
            if not model_class:
                logger.error(f"Unknown entity type: {entity_type}")
                return [], None, None
            
            mapping = self.get_entity_mapping(entity_type)
            if not mapping:
                logger.error(f"No mapping for entity type: {entity_type}")
                return [], None, None
            
            with self.connection_manager.session_scope() as session:
                # Build base query
                query = session.query(model_class)
                
                # Apply eager loading if relations requested
                if include_relations and mapping.get('relations'):
                    for relation in mapping['relations']:
                        if hasattr(model_class, relation):
                            query = query.options(joinedload(getattr(model_class, relation)))
                
                # Apply filters
                query = self._apply_filters(query, model_class, filters, mapping)
                
                # Apply geospatial filtering if needed (skip for distance sorting as we handle it in app layer)
                if mapping.get('geospatial') and filters and filters.get('latitude') and filters.get('longitude') and sort_key != 'distance_asc':
                    query = self._apply_geospatial_filter(query, model_class, filters)
                
                # Apply cursor pagination
                query, cursor_position = self._apply_cursor_pagination(
                    query, model_class, cursor, sort_key, limit
                )
                
                # Apply sorting
                query = self._apply_sorting(query, model_class, sort_key, filters)
                
                # Execute query
                entities = query.limit(limit + 1).all()  # Get one extra to check for next page
                
                # Process results
                has_next = len(entities) > limit
                if has_next:
                    entities = entities[:limit]
                
                # Convert to dictionaries
                result_entities = []
                for entity in entities:
                    entity_dict = self._entity_to_dict(entity, include_relations)
                    
                    # Add computed fields
                    if mapping.get('geospatial') and filters and filters.get('latitude'):
                        entity_dict['distance'] = self._calculate_distance(entity, filters)
                    
                    result_entities.append(entity_dict)
                
                # Apply distance sorting in application layer if needed
                if sort_key == 'distance_asc' and filters and filters.get('latitude') and filters.get('longitude'):
                    # Only sort by distance if we have location data
                    logger.info(f"Before distance sorting: {len(result_entities)} entities")
                    for i, entity in enumerate(result_entities):
                        logger.info(f"Entity {i}: title={entity.get('title')}, distance={entity.get('distance')}")
                    result_entities.sort(key=lambda x: x.get('distance', float('inf')))
                    logger.info(f"After distance sorting: {len(result_entities)} entities")
                elif sort_key == 'distance_asc':
                    # If distance sorting is requested but no location provided, fall back to created_at
                    result_entities.sort(key=lambda x: x.get('created_at', ''), reverse=True)
                
                # TEMPORARY: Disable distance sorting to test if that's the issue
                if sort_key == 'distance_asc':
                    logger.info(f"TEMPORARILY DISABLED distance sorting - keeping original order")
                    # Don't sort at all for now
                
                # Debug: Log the number of entities after sorting
                logger.info(f"After sorting: {len(result_entities)} entities for {entity_type} with sort_key={sort_key}")
                
                # Generate cursors
                next_cursor = None
                prev_cursor = None
                
                if result_entities:
                    if has_next:
                        next_cursor = self._generate_cursor(
                            result_entities[-1], sort_key, 'next', entity_type
                        )
                    
                    prev_cursor = self._generate_cursor(
                        result_entities[0], sort_key, 'prev', entity_type
                    )
                
                return result_entities, next_cursor, prev_cursor
                
        except Exception as e:
            logger.error(f"Error getting {entity_type} with cursor: {e}")
            return [], None, None
    
    def get_entity_by_id(
        self,
        entity_type: str,
        entity_id: int,
        include_relations: bool = True,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get a single entity by ID with optional relations.
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            include_relations: Whether to include related data
            user_context: User context for personalization
            
        Returns:
            Entity dictionary or None if not found
        """
        try:
            model_class = self.get_model_class(entity_type)
            if not model_class:
                return None
            
            mapping = self.get_entity_mapping(entity_type)
            if not mapping:
                return None
            
            with self.connection_manager.session_scope() as session:
                query = session.query(model_class).filter(model_class.id == entity_id)
                
                # Apply eager loading if relations requested
                if include_relations and mapping.get('relations'):
                    for relation in mapping['relations']:
                        if hasattr(model_class, relation):
                            query = query.options(joinedload(getattr(model_class, relation)))
                
                entity = query.first()
                
                if not entity:
                    return None
                
                # Convert to dictionary
                entity_dict = self._entity_to_dict(entity, include_relations)
                
                # Add metadata
                entity_dict['entity_type'] = entity_type
                entity_dict['retrieved_at'] = datetime.now(timezone.utc).isoformat()
                
                return entity_dict
                
        except Exception as e:
            logger.error(f"Error getting {entity_type} by ID {entity_id}: {e}")
            return None
    
    def create_entity(
        self,
        entity_type: str,
        data: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new entity.
        
        Args:
            entity_type: Type of entity to create
            data: Entity data
            user_context: User context for audit logging
            
        Returns:
            Created entity dictionary or None if failed
        """
        try:
            model_class = self.get_model_class(entity_type)
            if not model_class:
                logger.error(f"Cannot create unknown entity type: {entity_type}")
                return None
            
            # Validate data
            validated_data = self._validate_entity_data(entity_type, data, 'create')
            if not validated_data:
                return None
            
            with self.connection_manager.session_scope() as session:
                # Create entity instance
                entity = model_class(**validated_data)
                
                # Add audit fields if available
                if hasattr(entity, 'created_at'):
                    entity.created_at = datetime.now(timezone.utc)
                if hasattr(entity, 'updated_at'):
                    entity.updated_at = datetime.now(timezone.utc)
                if hasattr(entity, 'created_by') and user_context:
                    entity.created_by = user_context.get('user_id')
                
                session.add(entity)
                session.flush()  # Get ID without committing
                session.refresh(entity)
                
                # Convert to dictionary
                result = self._entity_to_dict(entity, include_relations=False)
                
                logger.info(f"Created {entity_type}", entity_id=entity.id, user_id=user_context.get('user_id') if user_context else None)
                
                return result
                
        except IntegrityError as e:
            logger.error(f"Integrity error creating {entity_type}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating {entity_type}: {e}")
            return None
    
    def update_entity(
        self,
        entity_type: str,
        entity_id: int,
        data: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing entity.
        
        Args:
            entity_type: Type of entity to update
            entity_id: Entity ID
            data: Update data
            user_context: User context for audit logging
            
        Returns:
            Updated entity dictionary or None if failed
        """
        try:
            model_class = self.get_model_class(entity_type)
            if not model_class:
                return None
            
            # Validate data
            validated_data = self._validate_entity_data(entity_type, data, 'update')
            if not validated_data:
                return None
            
            with self.connection_manager.session_scope() as session:
                entity = session.query(model_class).filter(model_class.id == entity_id).first()
                
                if not entity:
                    logger.warning(f"{entity_type} not found for update", entity_id=entity_id)
                    return None
                
                # Update fields
                for field, value in validated_data.items():
                    if hasattr(entity, field):
                        setattr(entity, field, value)
                
                # Update audit fields
                if hasattr(entity, 'updated_at'):
                    entity.updated_at = datetime.now(timezone.utc)
                if hasattr(entity, 'updated_by') and user_context:
                    entity.updated_by = user_context.get('user_id')
                
                session.flush()
                session.refresh(entity)
                
                # Convert to dictionary
                result = self._entity_to_dict(entity, include_relations=False)
                
                logger.info(f"Updated {entity_type}", entity_id=entity_id, user_id=user_context.get('user_id') if user_context else None)
                
                return result
                
        except Exception as e:
            logger.error(f"Error updating {entity_type} {entity_id}: {e}")
            return None
    
    def delete_entity(
        self,
        entity_type: str,
        entity_id: int,
        soft_delete: bool = True,
        user_context: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Delete an entity (soft or hard delete).
        
        Args:
            entity_type: Type of entity to delete
            entity_id: Entity ID
            soft_delete: Whether to perform soft delete
            user_context: User context for audit logging
            
        Returns:
            True if successful, False otherwise
        """
        try:
            model_class = self.get_model_class(entity_type)
            if not model_class:
                return False
            
            with self.connection_manager.session_scope() as session:
                entity = session.query(model_class).filter(model_class.id == entity_id).first()
                
                if not entity:
                    logger.warning(f"{entity_type} not found for deletion", entity_id=entity_id)
                    return False
                
                if soft_delete and hasattr(entity, 'status'):
                    # Soft delete by changing status
                    entity.status = 'deleted'
                    if hasattr(entity, 'deleted_at'):
                        entity.deleted_at = datetime.now(timezone.utc)
                    if hasattr(entity, 'deleted_by') and user_context:
                        entity.deleted_by = user_context.get('user_id')
                else:
                    # Hard delete
                    session.delete(entity)
                
                logger.info(f"Deleted {entity_type} ({'soft' if soft_delete else 'hard'})", entity_id=entity_id, user_id=user_context.get('user_id') if user_context else None)
                
                return True
                
        except Exception as e:
            logger.error(f"Error deleting {entity_type} {entity_id}: {e}")
            return False
    
    def batch_update_entities(
        self,
        entity_type: str,
        updates: List[Dict[str, Any]],
        user_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Batch update multiple entities.
        
        Args:
            entity_type: Type of entities to update
            updates: List of update dictionaries with 'id' and update fields
            user_context: User context for audit logging
            
        Returns:
            List of update results
        """
        try:
            model_class = self.get_model_class(entity_type)
            if not model_class:
                return []
            
            results = []
            
            with self.connection_manager.session_scope() as session:
                for update_data in updates:
                    entity_id = update_data.pop('id', None)
                    if not entity_id:
                        results.append({'id': None, 'success': False, 'error': 'Missing ID'})
                        continue
                    
                    try:
                        entity = session.query(model_class).filter(model_class.id == entity_id).first()
                        
                        if not entity:
                            results.append({'id': entity_id, 'success': False, 'error': 'Not found'})
                            continue
                        
                        # Apply updates
                        for field, value in update_data.items():
                            if hasattr(entity, field):
                                setattr(entity, field, value)
                        
                        # Update audit fields
                        if hasattr(entity, 'updated_at'):
                            entity.updated_at = datetime.now(timezone.utc)
                        
                        results.append({'id': entity_id, 'success': True})
                        
                    except Exception as e:
                        results.append({'id': entity_id, 'success': False, 'error': str(e)})
                
                logger.info(f"Batch updated {len(updates)} {entity_type} entities")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch update for {entity_type}: {e}")
            return []
    
    def get_entity_count(
        self,
        entity_type: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Get count of entities matching filters."""
        try:
            model_class = self.get_model_class(entity_type)
            if not model_class:
                return 0
            
            mapping = self.get_entity_mapping(entity_type)
            if not mapping:
                return 0
            
            with self.connection_manager.session_scope() as session:
                query = session.query(func.count(model_class.id))
                query = self._apply_filters(query, model_class, filters, mapping)
                
                return query.scalar() or 0
                
        except Exception as e:
            logger.error(f"Error getting {entity_type} count: {e}")
            return 0
    
    def _apply_filters(
        self,
        query,
        model_class,
        filters: Optional[Dict[str, Any]],
        mapping: Dict[str, Any]
    ):
        """Apply filtering to query."""
        if not filters:
            return query
        
        try:
            # Text search
            if filters.get('search') and mapping.get('searchable_fields'):
                search_term = f"%{filters['search']}%"
                search_conditions = []
                
                for field in mapping['searchable_fields']:
                    if hasattr(model_class, field):
                        search_conditions.append(
                            getattr(model_class, field).ilike(search_term)
                        )
                
                if search_conditions:
                    query = query.filter(or_(*search_conditions))
            
            # Exact field filters
            filterable_fields = mapping.get('filterable_fields', [])
            for field in filterable_fields:
                if field in filters and hasattr(model_class, field):
                    value = filters[field]
                    if isinstance(value, list):
                        query = query.filter(getattr(model_class, field).in_(value))
                    else:
                        query = query.filter(getattr(model_class, field) == value)
            
            # Status filter (exclude deleted by default)
            if hasattr(model_class, 'status') and 'status' not in filters:
                query = query.filter(model_class.status != 'deleted')
            elif hasattr(model_class, 'is_active') and 'is_active' not in filters:
                # For listings table, filter by is_active = True
                query = query.filter(model_class.is_active == True)
            
            # Category filter for entity types that use listings table
            category_filter = mapping.get('category_filter')
            if category_filter and hasattr(model_class, 'category_id'):
                query = query.filter(model_class.category_id == category_filter)
            
            return query
            
        except Exception as e:
            logger.error(f"Error applying filters: {e}")
            return query
    
    def _apply_geospatial_filter(self, query, model_class, filters: Dict[str, Any]):
        """Apply geospatial filtering for location-based queries."""
        try:
            lat = float(filters['latitude'])
            lng = float(filters['longitude'])
            radius_km = float(filters.get('radius', 10))  # Default 10km radius
            
            # Use PostGIS ST_DWithin for efficient spatial queries
            if hasattr(model_class, 'latitude') and hasattr(model_class, 'longitude'):
                # Use traditional latitude/longitude columns (most common case)
                query = query.filter(
                    func.ST_DWithin(
                        func.ST_SetSRID(func.ST_MakePoint(model_class.longitude, model_class.latitude), 4326)::geography,
                        func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)::geography,
                        radius_km * 1000  # Convert km to meters
                    )
                )
            elif hasattr(model_class, 'geom'):
                # Use geom column (PostGIS geometry column)
                query = query.filter(
                    func.ST_DWithin(
                        model_class.geom,
                        func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
                        radius_km * 1000  # Convert km to meters
                    )
                )
            elif hasattr(model_class, 'location'):
                # Use location column (PostGIS point stored as text)
                # Cast the location text to geometry and then to geography for distance calculation
                query = query.filter(
                    func.ST_DWithin(
                        func.ST_GeogFromText(model_class.location),
                        func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)::geography,
                        radius_km * 1000  # Convert km to meters
                    )
                )
            
            return query
            
        except (ValueError, TypeError) as e:
            logger.warning(f"Invalid geospatial parameters: {e}")
            return query
    
    def _apply_cursor_pagination(self, query, model_class, cursor: Optional[str], sort_key: str, limit: int):
        """Apply cursor-based pagination to query."""
        cursor_position = None
        
        if cursor:
            try:
                from utils.cursor_v5 import decode_cursor_v5, extract_cursor_position_v5
                cursor_payload = decode_cursor_v5(cursor)
                cursor_position = extract_cursor_position_v5(cursor_payload)
                
                # Apply cursor conditions based on sort direction
                primary_value, record_id = cursor_position
                strategy = self.SORT_STRATEGIES.get(sort_key, self.SORT_STRATEGIES['created_at_desc'])
                
                # For distance sorting, use created_at field for cursor pagination since distance is calculated in app layer
                if sort_key == 'distance_asc':
                    primary_field = getattr(model_class, 'created_at')
                    direction = 'DESC'  # We sort by created_at DESC for distance sorting
                else:
                    primary_field = getattr(model_class, strategy['field'])
                    direction = strategy['direction']
                
                if direction == 'DESC':
                    # For descending, we want records before the cursor
                    query = query.filter(
                        or_(
                            primary_field < primary_value,
                            and_(primary_field == primary_value, model_class.id < record_id)
                        )
                    )
                else:
                    # For ascending, we want records after the cursor
                    query = query.filter(
                        or_(
                            primary_field > primary_value,
                            and_(primary_field == primary_value, model_class.id > record_id)
                        )
                    )
                    
            except Exception as e:
                logger.warning(f"Invalid cursor, ignoring: {e}")
                cursor_position = None
        
        return query, cursor_position
    
    def _apply_sorting(self, query, model_class, sort_key: str, filters: Optional[Dict[str, Any]] = None):
        """Apply sorting to query."""
        strategy = self.SORT_STRATEGIES.get(sort_key, self.SORT_STRATEGIES['created_at_desc'])
        
        # Handle distance sorting specially
        if sort_key == 'distance_asc':
            # For distance sorting, we'll sort by created_at first and then sort by distance in the application layer
            # This avoids complex PostGIS distance sorting issues
            primary_field = getattr(model_class, 'created_at')
            secondary_field = getattr(model_class, 'id')
            query = query.order_by(desc(primary_field), desc(secondary_field))
            logger.info(f"Applied distance sorting fallback to created_at")
        else:
            # Regular field sorting
            primary_field = getattr(model_class, strategy['field'])
            secondary_field = getattr(model_class, strategy['secondary'])
            
            if strategy['direction'] == 'DESC':
                query = query.order_by(desc(primary_field), desc(secondary_field))
            else:
                query = query.order_by(asc(primary_field), asc(secondary_field))
        
        return query
    
    def _entity_to_dict(self, entity, include_relations: bool = False) -> Dict[str, Any]:
        """Convert SQLAlchemy entity to dictionary."""
        try:
            result = {}
            
            # Get all columns
            for column in entity.__table__.columns:
                value = getattr(entity, column.name)
                
                # Handle datetime serialization
                if isinstance(value, datetime):
                    result[column.name] = value.isoformat()
                else:
                    result[column.name] = value
            
            # Include relations if requested
            if include_relations:
                for relationship in entity.__mapper__.relationships:
                    rel_name = relationship.key
                    rel_value = getattr(entity, rel_name)
                    
                    if rel_value is not None:
                        if hasattr(rel_value, '__iter__') and not isinstance(rel_value, (str, bytes)):
                            # Collection relationship
                            result[rel_name] = [
                                self._entity_to_dict(item, False) for item in rel_value
                            ]
                        else:
                            # Single relationship
                            result[rel_name] = self._entity_to_dict(rel_value, False)
            
            return result
            
        except Exception as e:
            logger.error(f"Error converting entity to dict: {e}")
            return {'id': getattr(entity, 'id', None), 'error': 'Conversion failed'}
    
    def _validate_entity_data(self, entity_type: str, data: Dict[str, Any], operation: str) -> Optional[Dict[str, Any]]:
        """Validate entity data before database operations."""
        try:
            # Basic validation - could be extended with more sophisticated validation
            validated_data = {}
            
            for key, value in data.items():
                # Skip None values in updates
                if operation == 'update' and value is None:
                    continue
                
                # Basic type validation could go here
                validated_data[key] = value
            
            return validated_data
            
        except Exception as e:
            logger.error(f"Error validating {entity_type} data: {e}")
            return None
    
    def _calculate_distance(self, entity, filters: Dict[str, Any]) -> Optional[float]:
        """Calculate distance from user location to entity."""
        try:
            user_lat = float(filters.get('latitude', 0))
            user_lng = float(filters.get('longitude', 0))
            
            # Handle different entity types
            entity_lat = None
            entity_lng = None
            
            if hasattr(entity, 'latitude') and hasattr(entity, 'longitude'):
                # Traditional latitude/longitude columns
                entity_lat = float(entity.latitude or 0)
                entity_lng = float(entity.longitude or 0)
            elif hasattr(entity, 'location') and entity.location:
                # PostGIS location column - extract coordinates
                # The location field stores PostGIS point as text like "POINT(-80.1918 25.7617)"
                try:
                    import re
                    # Extract coordinates from PostGIS point string
                    point_match = re.search(r'POINT\(([-\d.]+)\s+([-\d.]+)\)', str(entity.location))
                    if point_match:
                        entity_lng = float(point_match.group(1))
                        entity_lat = float(point_match.group(2))
                    else:
                        return None
                except Exception:
                    return None
            
            if entity_lat is None or entity_lng is None:
                return None
            
            # Simple distance calculation (Haversine formula would be more accurate)
            import math
            
            lat_diff = math.radians(entity_lat - user_lat)
            lng_diff = math.radians(entity_lng - user_lng)
            
            a = (math.sin(lat_diff / 2) * math.sin(lat_diff / 2) +
                 math.cos(math.radians(user_lat)) * math.cos(math.radians(entity_lat)) *
                 math.sin(lng_diff / 2) * math.sin(lng_diff / 2))
            
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance_miles = 3958.756 * c  # Earth's radius in miles
            
            return round(distance_miles, 2)
            
        except Exception as e:
            logger.warning(f"Error calculating distance: {e}")
            return None
    
    def _generate_cursor(self, entity: Dict[str, Any], sort_key: str, direction: str, entity_type: str) -> Optional[str]:
        """Generate cursor for pagination."""
        try:
            from utils.cursor_v5 import create_cursor_v5
            
            strategy = self.SORT_STRATEGIES.get(sort_key, self.SORT_STRATEGIES['created_at_desc'])
            
            # For distance sorting, use created_at field for cursor generation since distance is calculated in app layer
            if sort_key == 'distance_asc':
                primary_field = 'created_at'
            else:
                primary_field = strategy['field']
            
            primary_value = entity.get(primary_field)
            entity_id = entity.get('id')
            
            if primary_value is None or entity_id is None:
                return None
            
            # Handle datetime values
            if isinstance(primary_value, str):
                try:
                    primary_value = datetime.fromisoformat(primary_value.replace('Z', '+00:00'))
                except ValueError:
                    pass
            
            from utils.data_version import get_current_data_version
            
            return create_cursor_v5(
                primary_value=primary_value,
                record_id=entity_id,
                sort_key=sort_key,
                direction=direction,
                entity_type=entity_type,
                data_version=get_current_data_version(entity_type)
            )
            
        except Exception as e:
            logger.error(f"Error generating cursor: {e}")
            return None

    def search_entities(
        self,
        search_query: str,
        entity_types: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
        cursor: Optional[str] = None,
        limit: int = 20,
        sort_key: str = 'relevance'
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str]]:
        """
        Search across multiple entity types with full-text and geospatial search.
        
        Args:
            search_query: Search query string
            entity_types: List of entity types to search (None for all)
            filters: Additional filters (location, etc.)
            cursor: Pagination cursor
            limit: Maximum number of results
            sort_key: Sort strategy ('relevance', 'distance', 'rating', etc.)
            
        Returns:
            Tuple of (entities, next_cursor, prev_cursor)
        """
        if not search_query or len(search_query.strip()) < 2:
            return [], None, None
        
        # Default to all entity types if none specified
        if not entity_types:
            entity_types = list(self.ENTITY_MAPPINGS.keys())
        
        # Validate entity types
        valid_entity_types = [et for et in entity_types if et in self.ENTITY_MAPPINGS]
        if not valid_entity_types:
            return [], None, None
        
        all_results = []
        
        try:
            with self.connection_manager.session_scope() as session:
                # Search each entity type
                for entity_type in valid_entity_types:
                    mapping = self.ENTITY_MAPPINGS[entity_type]
                    model_class = self._model_cache.get(entity_type)
                    
                    if not model_class:
                        continue
                    
                    # Build search query using SQLAlchemy
                    query = session.query(model_class)
                    
                    # Apply text search
                    if mapping.get('searchable_fields'):
                        search_conditions = []
                        for field in mapping['searchable_fields']:
                            if hasattr(model_class, field):
                                search_conditions.append(
                                    getattr(model_class, field).ilike(f"%{search_query}%")
                                )
                        
                        if search_conditions:
                            from sqlalchemy import or_
                            query = query.filter(or_(*search_conditions))
                    
                    # Apply geospatial filter if provided
                    if filters and 'latitude' in filters and 'longitude' in filters:
                        lat = filters['latitude']
                        lng = filters['longitude']
                        radius = filters.get('radius', 10)
                        
                        # Use the centralized geospatial filter method
                        query = self._apply_geospatial_filter(query, model_class, {
                            'latitude': lat,
                            'longitude': lng,
                            'radius': radius
                        })
                    
                    # Apply status filter
                    if hasattr(model_class, 'is_active'):
                        query = query.filter(model_class.is_active == True)
                    elif hasattr(model_class, 'status'):
                        query = query.filter(model_class.status == 'active')
                    
                    # Execute query
                    results = query.all()
                    
                    # Convert to dictionaries and add entity type
                    for result in results:
                        entity_dict = self._entity_to_dict(result, include_relations=False)
                        entity_dict['entity_type'] = entity_type
                        entity_dict['search_score'] = self._calculate_search_score(
                            entity_dict, search_query, filters
                        )
                        all_results.append(entity_dict)
                
                # Sort by relevance score after processing all entity types
                all_results.sort(key=lambda x: x['search_score'], reverse=True)
                
                # Apply pagination
                start_idx = 0
                if cursor:
                    try:
                        parsed_cursor = self._parse_cursor(cursor)
                        start_idx = parsed_cursor.get('offset', 0)
                    except:
                        start_idx = 0
                
                end_idx = start_idx + limit
                paginated_results = all_results[start_idx:end_idx]
                
                # Generate cursors
                next_cursor = None
                prev_cursor = None
                
                if end_idx < len(all_results):
                    next_cursor = self._generate_simple_cursor({
                        'offset': end_idx,
                        'query': search_query,
                        'entity_types': entity_types
                    })
                
                if start_idx > 0:
                    prev_start = max(0, start_idx - limit)
                    prev_cursor = self._generate_simple_cursor({
                        'offset': prev_start,
                        'query': search_query,
                        'entity_types': entity_types
                    })
                
                return paginated_results, next_cursor, prev_cursor
                    
        except Exception as e:
            logger.error(f"Search entities error: {e}")
            return [], None, None

    def _build_search_query(
        self,
        model_class,
        mapping: Dict[str, Any],
        query: str,
        filters: Optional[Dict[str, Any]],
        sort_key: str
    ) -> Dict[str, Any]:
        """Build search query for a specific entity type."""
        table_name = mapping['table_name']
        searchable_fields = mapping.get('searchable_fields', ['name'])
        
        # Build full-text search conditions
        search_conditions = []
        search_params = []
        
        for field in searchable_fields:
            search_conditions.append(f"to_tsvector('english', {field}) @@ plainto_tsquery('english', %s)")
            search_params.append(query)
        
        # Add name similarity search (use first searchable field as name field)
        name_field = searchable_fields[0] if searchable_fields else 'name'
        search_conditions.append(f"similarity({name_field}, %s) > 0.3")
        search_params.append(query)
        
        # Build base query
        sql_parts = [f"SELECT * FROM {table_name}"]
        where_conditions = [f"({' OR '.join(search_conditions)})"]
        
        # Add status filter (use is_active for listings, status for others)
        if table_name == 'listings':
            where_conditions.append("is_active = true")
        else:
            where_conditions.append("status = 'active'")
        
        # Add geospatial filter if provided
        if filters and 'latitude' in filters and 'longitude' in filters:
            lat = filters['latitude']
            lng = filters['longitude']
            radius = filters.get('radius', 10)  # Default 10km radius
            
            where_conditions.append(f"""
                ST_DWithin(
                    ST_Point(longitude, latitude)::geography,
                    ST_Point(%s, %s)::geography,
                    %s * 1000
                )
            """)
            search_params.extend([lng, lat, radius])
        
        # Add other filters
        if filters:
            for key, value in filters.items():
                if key in ['latitude', 'longitude', 'radius']:
                    continue  # Already handled
                
                if key in mapping.get('filterable_fields', []):
                    where_conditions.append(f"{key} = %s")
                    search_params.append(value)
        
        # Combine query parts
        sql_parts.append("WHERE " + " AND ".join(where_conditions))
        
        # Add ordering
        if sort_key == 'relevance':
            # Order by full-text search rank
            sql_parts.append(f"""
                ORDER BY 
                    ts_rank(to_tsvector('english', name), plainto_tsquery('english', %s)) DESC,
                    similarity(name, %s) DESC,
                    created_at DESC
            """)
            search_params.extend([query, query])
        elif sort_key == 'distance' and filters and 'latitude' in filters:
            # Order by distance
            lat = filters['latitude']
            lng = filters['longitude']
            if table_name == 'listings':
                # Use PostGIS location column for listings table
                sql_parts.append(f"""
                    ORDER BY 
                        ST_Distance(
                            location::geography,
                            ST_Point(%s, %s)::geography
                        ) ASC
                """)
            else:
                # Use separate longitude/latitude columns for other tables
                sql_parts.append(f"""
                    ORDER BY 
                        ST_Distance(
                            ST_Point(longitude, latitude)::geography,
                            ST_Point(%s, %s)::geography
                        ) ASC
                """)
            search_params.extend([lng, lat])
        else:
            # Default ordering
            sql_parts.append("ORDER BY created_at DESC")
        
        return {
            'sql': ' '.join(sql_parts),
            'params': search_params
        }

    def _calculate_search_score(
        self,
        entity: Dict[str, Any],
        search_query: str,
        filters: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate search relevance score for an entity."""
        score = 0.0
        
        # Name match score
        name = entity.get('name', '').lower()
        query_lower = search_query.lower()
        
        if query_lower in name:
            score += 10.0
            if name.startswith(query_lower):
                score += 5.0
        
        # Description match score
        description = entity.get('description', '').lower()
        if query_lower in description:
            score += 3.0
        
        # Address match score
        address = entity.get('address', '').lower()
        if query_lower in address:
            score += 2.0
        
        # Rating boost
        rating = entity.get('google_rating', 0)
        if rating:
            score += rating * 0.5
        
        # Review count boost
        review_count = entity.get('google_reviews_count', 0)
        if review_count:
            score += min(review_count / 100, 2.0)
        
        # Distance penalty (if location filter applied)
        if filters and 'latitude' in filters and 'distance' in entity:
            distance = entity['distance']
            if distance:
                # Penalize by distance (km)
                score -= min(distance / 10, 5.0)
        
        return max(score, 0.0)

    def _parse_cursor(self, cursor: str) -> Dict[str, Any]:
        """Parse pagination cursor."""
        try:
            import base64
            import json
            decoded = base64.b64decode(cursor).decode('utf-8')
            return json.loads(decoded)
        except:
            return {}

    def _generate_simple_cursor(self, data: Dict[str, Any]) -> str:
        """Generate pagination cursor."""
        try:
            import base64
            import json
            encoded = base64.b64encode(json.dumps(data).encode('utf-8')).decode('utf-8')
            return encoded
        except:
            return ""


# Convenience functions for common operations
def get_entity_repository_v5(connection_manager: Optional[DatabaseConnectionManager] = None) -> EntityRepositoryV5:
    """Get entity repository v5 instance."""
    if not connection_manager:
        from database.connection_manager import get_connection_manager
        connection_manager = get_connection_manager()
    
    return EntityRepositoryV5(connection_manager)