"""
Generic entity repository with enhanced cursor pagination and unified CRUD operations.

Provides comprehensive repository operations for all entity types (restaurants, synagogues,
mikvah, stores) with enhanced cursor pagination, advanced filtering, optimized database
queries, transaction management, and batch operations for v5 API consolidation.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Type

from sqlalchemy import and_, func, or_, text, desc, asc
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError

from database.base_repository import BaseRepository
from database.connection_manager import DatabaseConnectionManager
from utils.logging_config import get_logger

logger = get_logger(__name__)


class EntityRepositoryV5(BaseRepository):
    """Enhanced generic repository for v5 entity operations."""
    
    # Entity type mappings
    ENTITY_MAPPINGS = {
        'restaurants': {
            'model_name': 'Restaurant',
            'table_name': 'restaurants',
            'primary_key': 'id',
            'default_sort': 'created_at',
            'searchable_fields': ['name', 'short_description', 'address'],
            'filterable_fields': [
                'status', 
                'kosher_category', 
                'certifying_agency',
                'agency',  # Alias for certifying_agency
                'listing_type',
                'price_range',
                'city',
                'state',
                'is_cholov_yisroel',
                'is_pas_yisroel',
                'cholov_stam'
            ],
            'relations': ['restaurant_images'],
            'geospatial': True,
            'supports_reviews': True,
            'category_filter': None
        },
        'synagogues': {
            'model_name': 'Synagogue',
            'table_name': 'shuls',
            'primary_key': 'id',
            'default_sort': 'created_at',
            'searchable_fields': ['name', 'description', 'address'],
            'filterable_fields': ['status', 'denomination', 'accessibility'],
            'relations': ['hours', 'reviews'],
            'geospatial': True,
            'supports_reviews': True,
            'category_filter': None
        },
        'mikvahs': {
            'model_name': 'Mikvah',
            'table_name': 'mikvah',
            'primary_key': 'id',
            'default_sort': 'created_at',
            'searchable_fields': ['name', 'description', 'address'],
            'filterable_fields': ['status', 'mikvah_type', 'requires_appointment', 'is_active'],
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
        'name_asc': {'field': 'name', 'direction': 'ASC', 'secondary': 'id'},
        'name_desc': {'field': 'name', 'direction': 'DESC', 'secondary': 'id'},
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
        
        # Detect PostGIS availability and cache the result
        self._postgis_available = False
        try:
            with self.connection_manager.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')
                """))
                row = result.fetchone()
                self._postgis_available = bool(row and row[0])
                logger.info(f"PostGIS availability: {self._postgis_available}")
        except Exception as e:
            logger.warning(f"Could not determine PostGIS availability; assuming false: {e}")
            self._postgis_available = False
    
    def _load_models(self):
        """Load and cache SQLAlchemy model classes."""
        try:
            from database.models import Restaurant, Synagogue, Mikvah, Store
            
            self._model_cache = {
                'restaurants': Restaurant,  # Use Restaurant model for restaurants
                'synagogues': Synagogue,
                'mikvahs': Mikvah,
                'stores': Store
            }
            
            logger.info(f"Loaded {len(self._model_cache)} entity models: {list(self._model_cache.keys())}")
            
        except ImportError as e:
            logger.error(f"Failed to load entity models: {e}")
            self._model_cache = {}
    
    def get_model_class(self, entity_type: str) -> Optional[Type]:
        """Get SQLAlchemy model class for entity type."""
        return self._model_cache.get(entity_type)
    
    def get_entity_mapping(self, entity_type: str) -> Optional[Dict[str, Any]]:
        """Get entity mapping configuration."""
        return self.ENTITY_MAPPINGS.get(entity_type)
    
    def _get_entities_with_distance_pagination(
        self,
        entity_type: str,
        page: int,
        limit: int,
        filters: Optional[Dict[str, Any]] = None,
        include_relations: bool = False,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str]]:
        """
        Get entities with distance sorting using offset-based pagination.
        
        This method loads all entities, sorts them by distance, then returns
        the appropriate page slice. This is necessary because distance sorting
        is done in the application layer after the database query.
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
                # Build base query to get ALL entities (no limit)
                query = session.query(model_class)
                
                # Apply eager loading if relations requested
                if include_relations and mapping.get('relations'):
                    for relation in mapping['relations']:
                        if hasattr(model_class, relation):
                            query = query.options(joinedload(getattr(model_class, relation)))
                
                # Apply filters
                query = self._apply_filters(query, model_class, filters, mapping)
                
                # Apply geospatial filtering if needed
                logger.info(f"DEBUG: Distance pagination - geospatial={mapping.get('geospatial')}, has_filters={bool(filters)}, has_lat={bool(filters and filters.get('latitude'))}, has_lng={bool(filters and filters.get('longitude'))}")
                # TEMPORARY DEBUG: Disable geospatial filtering to test
                logger.info("DEBUG: Distance pagination - TEMPORARILY DISABLING geospatial filter for debugging")
                # if mapping.get('geospatial') and filters and filters.get('latitude') and filters.get('longitude'):
                #     logger.info(f"DEBUG: Distance pagination - Applying geospatial filter")
                #     query = self._apply_geospatial_filter(query, model_class, filters)
                # else:
                #     logger.info(f"DEBUG: Distance pagination - Skipping geospatial filter")
                
                # Execute query to get all entities
                try:
                    all_entities = query.all()
                    logger.info(f"Distance pagination: Loaded {len(all_entities)} total entities for {entity_type}")
                except Exception as e:
                    logger.error(f"Query execution failed: {e}")
                    return [], None, None
                
                # Convert to dictionaries and add distance
                result_entities = []
                for entity in all_entities:
                    entity_dict = self._entity_to_dict(entity, include_relations)
                    
                    # Add computed distance field
                    if mapping.get('geospatial') and filters and filters.get('latitude'):
                        entity_dict['distance'] = self._calculate_distance(entity, filters)
                        # Strict application-layer radius enforcement (fallback or double-check)
                        radius_km = None
                        if filters.get('_radius_km') is not None:
                            radius_km = float(filters.get('_radius_km'))
                        elif filters.get('radius') is not None:
                            # radius from query is in km
                            radius_km = float(filters.get('radius'))
                        if radius_km is not None:
                            distance_miles = entity_dict.get('distance', float('inf'))
                            radius_miles = radius_km * 0.621371
                            if distance_miles > radius_miles:
                                continue  # Drop out-of-radius entities
                    
                    result_entities.append(entity_dict)
                
                # Sort by distance
                if filters and filters.get('latitude') and filters.get('longitude'):
                    result_entities.sort(key=lambda x: x.get('distance', float('inf')))
                
                # Calculate pagination
                total_count = len(result_entities)
                offset = (page - 1) * limit
                end_offset = offset + limit
                
                
                # Get the page slice
                page_entities = result_entities[offset:end_offset]
                
                
                # Generate pagination info
                has_next = end_offset < total_count
                has_prev = page > 1
                
                next_cursor = None
                prev_cursor = None
                
                if has_next:
                    next_cursor = f"page_{page + 1}"
                if has_prev:
                    prev_cursor = f"page_{page - 1}"
                
                
                logger.info(f"Distance pagination: Page {page}, offset {offset}-{end_offset}, returned {len(page_entities)} entities, total: {total_count}")
                
                return page_entities, next_cursor, prev_cursor, total_count
                
        except Exception as e:
            logger.error(f"Error getting {entity_type} with distance pagination: {e}")
            return [], None, None, 0
    
    def _get_entities_with_page_pagination(
        self,
        entity_type: str,
        page: int,
        limit: int,
        sort_key: str,
        filters: Optional[Dict[str, Any]] = None,
        include_relations: bool = False,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str]]:
        """
        Get entities with page-based pagination for non-distance sorting.
        
        This method provides consistent page-based pagination for all sorting types
        when the page parameter is provided, similar to distance sorting.
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
                
                # Apply geospatial filtering if needed
                if mapping.get('geospatial') and filters and filters.get('latitude') and filters.get('longitude'):
                    query = self._apply_geospatial_filter(query, model_class, filters)
                
                # Apply sorting
                query = self._apply_sorting(query, model_class, sort_key, filters)
                
                # Calculate offset for page-based pagination
                offset = (page - 1) * limit
                
                # Execute query with page-based pagination
                entities = query.offset(offset).limit(limit).all()
                
                # Convert to dictionaries
                result_entities = []
                for entity in entities:
                    entity_dict = self._entity_to_dict(entity, include_relations)
                    
                    # Add computed fields
                    if mapping.get('geospatial') and filters and filters.get('latitude'):
                        distance = self._calculate_distance(entity, filters)
                        entity_dict['distance'] = distance
                        # Strict application-layer radius enforcement (fallback or double-check)
                        radius_km = None
                        if filters.get('_radius_km') is not None:
                            radius_km = float(filters.get('_radius_km'))
                        elif filters.get('radius') is not None:
                            radius_km = float(filters.get('radius'))
                        if radius_km is not None:
                            distance_miles = distance or float('inf')
                            radius_miles = radius_km * 0.621371
                            if distance_miles > radius_miles:
                                continue  # Drop out-of-radius entities
                    
                    result_entities.append(entity_dict)
                
                # Get total count for pagination info
                count_query = session.query(model_class)
                count_query = self._apply_filters(count_query, model_class, filters, mapping)
                if mapping.get('geospatial') and filters and filters.get('latitude') and filters.get('longitude'):
                    count_query = self._apply_geospatial_filter(count_query, model_class, filters)
                
                total_count = count_query.count()
                
                # Generate pagination info
                has_next = offset + limit < total_count
                has_prev = page > 1
                
                next_cursor = None
                prev_cursor = None
                
                if has_next:
                    next_cursor = f"page_{page + 1}"
                if has_prev:
                    prev_cursor = f"page_{page - 1}"
                
                logger.info(f"Page pagination: Page {page}, offset {offset}-{offset + len(result_entities)}, returned {len(result_entities)} entities, total: {total_count}")
                
                return result_entities, next_cursor, prev_cursor, total_count
                
        except Exception as e:
            logger.error(f"Error getting {entity_type} with page pagination: {e}")
            return [], None, None, 0
    
    def get_entities_with_cursor(
        self,
        entity_type: str,
        cursor: Optional[str] = None,
        page: Optional[int] = None,
        limit: int = 20,
        sort_key: str = 'created_at_desc',
        filters: Optional[Dict[str, Any]] = None,
        include_relations: bool = False,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str], int]:
        """
        Get entities with enhanced cursor pagination.
        
        Args:
            entity_type: Type of entity to query
            cursor: Cursor token for pagination
            page: Page number for offset-based pagination (used with distance sorting)
            limit: Maximum number of entities to return
            sort_key: Sorting strategy
            filters: Filtering criteria
            include_relations: Whether to include related data
            user_context: User context for personalization
            
        Returns:
            Tuple of (entities, next_cursor, prev_cursor, total_count)
        """
        try:
            
            # Special handling for distance sorting with page-based pagination
            if sort_key == 'distance_asc' and page is not None:
                return self._get_entities_with_distance_pagination(
                    entity_type, page, limit, filters, include_relations, user_context
                )
            
            # Handle page-based pagination for all sorting types when page parameter is provided
            if page is not None:
                return self._get_entities_with_page_pagination(
                    entity_type, page, limit, sort_key, filters, include_relations, user_context
                )
            model_class = self.get_model_class(entity_type)
            if not model_class:
                logger.error(f"Unknown entity type: {entity_type}")
                return [], None, None, 0
            
            mapping = self.get_entity_mapping(entity_type)
            logger.info(f"Processing {entity_type} with model: {model_class.__name__}, mapping: {mapping}")
            if not mapping:
                logger.error(f"No mapping for entity type: {entity_type}")
                return [], None, None, 0
            
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
                
                # Apply geospatial filtering if needed
                if mapping.get('geospatial') and filters and filters.get('latitude') and filters.get('longitude'):
                    query = self._apply_geospatial_filter(query, model_class, filters)
                
                # Apply cursor pagination
                query, cursor_position = self._apply_cursor_pagination(
                    query, model_class, cursor, sort_key, limit
                )
                
                # Apply sorting
                query = self._apply_sorting(query, model_class, sort_key, filters)
                
                # Execute query
                try:
                    entities = query.limit(limit + 1).all()  # Get one extra to check for next page
                    logger.info(f"Query executed successfully: {len(entities)} entities returned for limit={limit}")
                    logger.info(f"DEBUG PAGINATION: entities count={len(entities)}, limit={limit}, limit+1={limit+1}")
                except Exception as e:
                    logger.error(f"Query execution failed: {e}")
                    entities = []
                
                # Process results - fetch one extra to check if there are more
                has_next = len(entities) > limit
                logger.info(f"DEBUG PAGINATION: has_next={has_next} (entities={len(entities)} > limit={limit})")
                if has_next:
                    entities = entities[:limit]  # Keep only the requested limit
                    logger.info(f"DEBUG PAGINATION: Trimmed entities to {len(entities)} for response")
                
                # Convert to dictionaries
                result_entities = []
                for entity in entities:
                    entity_dict = self._entity_to_dict(entity, include_relations)
                    
                    # Add computed fields
                    if mapping.get('geospatial') and filters and filters.get('latitude'):
                        distance = self._calculate_distance(entity, filters)
                        entity_dict['distance'] = distance
                        
                        # Apply radius filter in application layer if PostGIS failed
                        if filters.get('_radius_km'):
                            distance_miles = distance or float('inf')
                            radius_miles = filters['_radius_km'] * 0.621371  # Convert km to miles
                            if distance_miles > radius_miles:
                                continue  # Skip this entity as it's outside the radius
                        
                        if distance is not None:
                            logger.debug(f"Added distance {distance:.2f} miles for entity {entity_dict.get('id', 'unknown')} ({entity_dict.get('name', 'unknown')})")
                        else:
                            logger.debug(f"No distance calculated for entity {entity_dict.get('id', 'unknown')} ({entity_dict.get('name', 'unknown')})")
                    
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
                
                # Distance sorting is now properly implemented
                
                # Debug: Log the number of entities after sorting
                logger.info(f"After sorting: {len(result_entities)} entities for {entity_type} with sort_key={sort_key}")
                
                # Generate cursors
                next_cursor = None
                prev_cursor = None
                
                logger.info(f"DEBUG CURSOR: result_entities count={len(result_entities)}, has_next={has_next}")
                
                # Disable cursor pagination for distance sorting since it's done in application layer
                if sort_key == 'distance_asc':
                    logger.info("DEBUG CURSOR: Distance sorting detected - disabling cursor pagination")
                elif result_entities:
                    if has_next:
                        logger.info("DEBUG CURSOR: Generating next_cursor for last entity")
                        next_cursor = self._generate_cursor(
                            result_entities[-1], sort_key, 'next', entity_type
                        )
                        logger.info(f"DEBUG CURSOR: Generated next_cursor={next_cursor}")
                    else:
                        logger.info("DEBUG CURSOR: No next_cursor generated because has_next=False")
                    
                    prev_cursor = self._generate_cursor(
                        result_entities[0], sort_key, 'prev', entity_type
                    )
                    logger.info(f"DEBUG CURSOR: Generated prev_cursor={prev_cursor}")
                else:
                    logger.info("DEBUG CURSOR: No cursors generated because result_entities is empty")
                
                # Get total count for cursor pagination
                total_count = self.get_entity_count(entity_type, filters)
                logger.info(f"Total count for {entity_type}: {total_count}")
                
                return result_entities, next_cursor, prev_cursor, total_count
                
        except Exception as e:
            logger.error(f"Error getting {entity_type} with cursor: {e}")
            return [], None, None, 0
    
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
                # Include geospatial filtering in counts when applicable
                if mapping.get('geospatial') and filters and filters.get('latitude') and filters.get('longitude'):
                    query = self._apply_geospatial_filter(query, model_class, filters)
                
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
            
            # Handle special filters that need custom logic
            # Rating filter (minimum rating)
            if filters.get('ratingMin') and hasattr(model_class, 'google_rating'):
                try:
                    min_rating = float(filters['ratingMin'])
                    query = query.filter(model_class.google_rating >= min_rating)
                except (ValueError, TypeError):
                    pass
            
            # Kosher details filter
            if filters.get('kosherDetails') and hasattr(model_class, 'is_cholov_yisroel'):
                kosher_detail = filters['kosherDetails']
                if kosher_detail == 'Cholov Yisroel':
                    query = query.filter(model_class.is_cholov_yisroel == True)
                elif kosher_detail == 'Pas Yisroel':
                    query = query.filter(model_class.is_pas_yisroel == True)
                elif kosher_detail == 'Cholov Stam':
                    query = query.filter(model_class.cholov_stam == True)
            
            # Handle agency filter (alias for certifying_agency)
            if filters.get('agency') and hasattr(model_class, 'certifying_agency'):
                query = query.filter(model_class.certifying_agency == filters['agency'])
            
            # Handle category filter (alias for kosher_category)
            if filters.get('category') and hasattr(model_class, 'kosher_category'):
                query = query.filter(model_class.kosher_category == filters['category'])
            
            # Hours filter - using proper JSONB queries
            if filters.get('hoursFilter') and hasattr(model_class, 'hours_json'):
                hours_filter = filters.get('hoursFilter')
                
                if hours_filter == 'openNow':
                    # Filter by 'open_now' boolean directly from JSONB
                    query = query.filter(model_class.hours_json['open_now'].astext == 'true')
                elif hours_filter in ['morning', 'afternoon', 'evening', 'lateNight']:
                    # For time periods, ensure hours_json exists and has periods data
                    query = query.filter(
                        model_class.hours_json.isnot(None),
                        model_class.hours_json['periods'].isnot(None)
                    )
            
            # Exact field filters for remaining fields
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
                # Filter out deleted records and only show active records by default
                query = query.filter(model_class.status == 'active')
            elif hasattr(model_class, 'is_active') and 'is_active' not in filters:
                # For tables with is_active field, filter by is_active = True
                query = query.filter(model_class.is_active == True)
            
            # Category filter for entity types that support categories
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
            logger.info(f"DEBUG: _apply_geospatial_filter called with filters: {filters}")
            # Handle bounds filtering (for map viewport)
            if 'bounds' in filters:
                bounds = filters['bounds']
                if isinstance(bounds, dict) and 'ne' in bounds and 'sw' in bounds:
                    ne_lat = float(bounds['ne']['lat'])
                    ne_lng = float(bounds['ne']['lng'])
                    sw_lat = float(bounds['sw']['lat'])
                    sw_lng = float(bounds['sw']['lng'])
                    
                    # Use PostGIS ST_MakeEnvelope for bounds filtering
                    if hasattr(model_class, 'latitude') and hasattr(model_class, 'longitude'):
                        # Use traditional latitude/longitude columns (most common case)
                        query = query.filter(
                            func.ST_Within(
                                func.ST_SetSRID(func.ST_MakePoint(model_class.longitude, model_class.latitude), 4326),
                                func.ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
                            )
                        )
                    elif hasattr(model_class, 'geom'):
                        # Use geom column (PostGIS geometry column)
                        query = query.filter(
                            func.ST_Within(
                                model_class.geom,
                                func.ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
                            )
                        )
                    elif hasattr(model_class, 'location'):
                        # Use location column (PostGIS point stored as text)
                        query = query.filter(
                            func.ST_Within(
                                func.ST_GeogFromText(model_class.location),
                                func.ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
                            )
                        )
                    
                    logger.debug(f"Applied bounds filter: ne=({ne_lat}, {ne_lng}), sw=({sw_lat}, {sw_lng})")
                    return query
            
            # Handle radius-based filtering (for location-based search)
            if 'latitude' in filters and 'longitude' in filters:
                lat = float(filters['latitude'])
                lng = float(filters['longitude'])
                radius_km = float(filters.get('radius', 160))  # Default 160km radius (100mi)
                # Always set fallback radius for application-layer enforcement
                filters['_radius_km'] = radius_km
                
                # If PostGIS not available, apply coarse bbox filter and mark for app-layer filtering
                if not getattr(self, '_postgis_available', False) and hasattr(model_class, 'latitude') and hasattr(model_class, 'longitude'):
                    from math import cos, radians
                    lat_delta = radius_km / 110.574
                    try:
                        lng_delta = radius_km / (111.320 * max(0.1, cos(radians(lat))))
                    except Exception:
                        lng_delta = radius_km / 111.320
                    query = query.filter(
                        and_(
                            getattr(model_class, 'latitude').isnot(None),
                            getattr(model_class, 'longitude').isnot(None),
                            getattr(model_class, 'latitude') >= (lat - lat_delta),
                            getattr(model_class, 'latitude') <= (lat + lat_delta),
                            getattr(model_class, 'longitude') >= (lng - lng_delta),
                            getattr(model_class, 'longitude') <= (lng + lng_delta),
                        )
                    )
                    filters['_radius_km'] = radius_km
                    logger.info("Applied bbox geospatial fallback; PostGIS unavailable")
                elif hasattr(model_class, 'latitude') and hasattr(model_class, 'longitude'):
                    # Use traditional latitude/longitude columns (most common case)
                    # Cast to geography so distance is in meters
                    query = query.filter(
                        func.ST_DWithin(
                            func.cast(
                                func.ST_SetSRID(func.ST_MakePoint(getattr(model_class, 'longitude'), getattr(model_class, 'latitude')), 4326),
                                text('geography')
                            ),
                            func.cast(
                                func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
                                text('geography')
                            ),
                            radius_km * 1000  # meters
                        )
                    )
                    logger.info(f"Applied PostGIS geospatial filter: lat={lat}, lng={lng}, radius={radius_km}km")
                elif hasattr(model_class, 'geom'):
                    # Use geom column (PostGIS geometry column)
                    query = query.filter(
                        func.ST_DWithin(
                            func.cast(getattr(model_class, 'geom'), text('geography')),
                            func.cast(func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326), text('geography')),
                            radius_km * 1000
                        )
                    )
                elif hasattr(model_class, 'location'):
                    # Use location column (PostGIS point stored as text)
                    # Cast the location text to geometry and then to geography for distance calculation
                    query = query.filter(
                        func.ST_DWithin(
                            func.ST_GeogFromText(getattr(model_class, 'location')),
                            func.cast(func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326), text('geography')),
                            radius_km * 1000
                        )
                    )
                
                logger.debug(f"Applied geospatial filter: lat={lat}, lng={lng}, radius={radius_km}km")
            
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
            logger.info("Applied distance sorting fallback to created_at")
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
                # Traditional latitude/longitude columns (restaurants table)
                entity_lat = float(entity.latitude or 0)
                entity_lng = float(entity.longitude or 0)
                logger.debug(f"Using lat/lng columns: entity_lat={entity_lat}, entity_lng={entity_lng}")
            elif hasattr(entity, 'location') and entity.location:
                # PostGIS location column - extract coordinates
                # The location field stores PostGIS point as text like "POINT(-80.1918 25.7617)"
                try:
                    import re
                    location_str = str(entity.location)
                    logger.debug(f"PostGIS location string: {location_str}")
                    
                    # Extract coordinates from PostGIS point string
                    point_match = re.search(r'POINT\(([-\d.]+)\s+([-\d.]+)\)', location_str)
                    if point_match:
                        entity_lng = float(point_match.group(1))
                        entity_lat = float(point_match.group(2))
                        logger.debug(f"Extracted from PostGIS: entity_lat={entity_lat}, entity_lng={entity_lng}")
                    else:
                        logger.warning(f"Could not parse PostGIS location: {location_str}")
                        return None
                except Exception as e:
                    logger.warning(f"Error parsing PostGIS location: {e}")
                    return None
            
            if entity_lat is None or entity_lng is None or entity_lat == 0 or entity_lng == 0:
                logger.warning(f"Missing or invalid coordinates: entity_lat={entity_lat}, entity_lng={entity_lng}")
                return None
            
            # Additional validation for reasonable coordinate ranges
            if not (-90 <= entity_lat <= 90) or not (-180 <= entity_lng <= 180):
                logger.warning(f"Coordinates out of valid range: entity_lat={entity_lat}, entity_lng={entity_lng}")
                return None
            
            if not (-90 <= user_lat <= 90) or not (-180 <= user_lng <= 180):
                logger.warning(f"User coordinates out of valid range: user_lat={user_lat}, user_lng={user_lng}")
                return None
            
            # Debug logging
            logger.debug(f"Distance calculation: user=({user_lat}, {user_lng}), entity=({entity_lat}, {entity_lng})")
            
            # Special debug for Mizrachi restaurants
            if hasattr(entity, 'name') and 'mizrachi' in entity.name.lower():
                logger.warning(f"Mizrachi restaurant found: {entity.name} at coordinates ({entity_lat}, {entity_lng})")
            
            # Simple distance calculation (Haversine formula would be more accurate)
            import math
            
            lat_diff = math.radians(entity_lat - user_lat)
            lng_diff = math.radians(entity_lng - user_lng)
            
            a = (math.sin(lat_diff / 2) * math.sin(lat_diff / 2) +
                 math.cos(math.radians(user_lat)) * math.cos(math.radians(entity_lat)) *
                 math.sin(lng_diff / 2) * math.sin(lng_diff / 2))
            
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance_miles = 3958.756 * c  # Earth's radius in miles
            
            logger.debug(f"Calculated distance: {distance_miles:.2f} miles")
            
            # Special debug for Mizrachi restaurants
            if hasattr(entity, 'name') and 'mizrachi' in entity.name.lower():
                logger.warning(f"Mizrachi restaurant distance calculation: {entity.name} = {distance_miles:.2f} miles")
            
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
                        radius = filters.get('radius', 160)
                        
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
        
        # Add status filter (all tables use status column)
        where_conditions.append("status = 'active'")
        
        # Add geospatial filter if provided
        if filters and 'latitude' in filters and 'longitude' in filters:
            lat = filters['latitude']
            lng = filters['longitude']
            radius = filters.get('radius', 160)  # Default 160km radius (100mi)
            
            where_conditions.append("""
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
            sql_parts.append("""
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
            # All tables use separate longitude/latitude columns
            sql_parts.append("""
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


    def increment_view_count(self, restaurant_id: int) -> bool:
        """
        Increment the view count for a restaurant.
        
        Args:
            restaurant_id: Restaurant ID to increment view count for
            
        Returns:
            True if successful, False otherwise
        """
        try:
            from database.models import Restaurant
            
            with self.connection_manager.session_scope() as session:
                # Get the restaurant
                restaurant = session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
                if not restaurant:
                    logger.warning(f"Restaurant {restaurant_id} not found for view count increment")
                    return False
                
                # Increment view count
                if restaurant.view_count is None:
                    restaurant.view_count = 1
                else:
                    restaurant.view_count += 1
                
                # Update the updated_at timestamp
                from datetime import datetime, timezone
                restaurant.updated_at = datetime.now(timezone.utc)
                
                session.commit()
                logger.info(f"Incremented view count for restaurant {restaurant_id} to {restaurant.view_count}")
                return True
                
        except Exception as e:
            logger.exception(f"Failed to increment view count for restaurant {restaurant_id}", error=str(e))
            return False


# Convenience functions for common operations
def get_entity_repository_v5(connection_manager: Optional[DatabaseConnectionManager] = None) -> EntityRepositoryV5:
    """Get entity repository v5 instance."""
    if not connection_manager:
        from database.connection_manager import get_connection_manager
        connection_manager = get_connection_manager()
    
    return EntityRepositoryV5(connection_manager)
