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
        
        # PostGIS availability will be detected lazily on first use
        self._postgis_available = None
        self._postgis_check_attempted = False
    
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
    
    def _check_postgis_availability(self) -> bool:
        """Lazily check PostGIS availability and cache the result."""
        if self._postgis_check_attempted:
            return self._postgis_available or False
            
        self._postgis_check_attempted = True
        self._postgis_available = False
        
        try:
            # Ensure connection manager is available and connected
            if not hasattr(self.connection_manager, 'engine') or self.connection_manager.engine is None:
                logger.warning("Database engine not available for PostGIS check")
                return False
                
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
            
        return self._postgis_available
    
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
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str], int]:
        """Delegate to generic page pagination with distance-aware sorting."""
        return self._get_entities_with_page_pagination(
            entity_type=entity_type,
            page=page,
            limit=limit,
            sort_key='distance_asc',
            filters=filters,
            include_relations=include_relations,
            user_context=user_context,
        )

    def _get_entities_with_page_pagination(
        self,
        entity_type: str,
        page: int,
        limit: int,
        sort_key: str,
        filters: Optional[Dict[str, Any]] = None,
        include_relations: bool = False,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str], int]:
        """Get entities with page-based pagination for any sort strategy."""
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
                query = session.query(model_class)

                if include_relations and mapping.get('relations'):
                    for relation in mapping['relations']:
                        if hasattr(model_class, relation):
                            query = query.options(joinedload(getattr(model_class, relation)))

                query = self._apply_filters(query, model_class, filters, mapping)

                lat = lng = None
                distance_expr = None
                distance_label = None
                geospatial_enabled = mapping.get('geospatial') and filters and filters.get('latitude') and filters.get('longitude')
                if geospatial_enabled:
                    query = self._apply_geospatial_filter(query, model_class, filters)
                    try:
                        lat = float(filters['latitude'])
                        lng = float(filters['longitude'])
                        distance_expr = self._build_distance_expression(model_class, lat, lng)
                        if distance_expr is not None:
                            distance_label = 'distance_meters'
                            query = query.add_columns(distance_expr.label(distance_label))
                    except (TypeError, ValueError):
                        logger.warning("Invalid coordinates supplied; skipping distance projection")
                        distance_expr = None

                query = self._apply_sorting(query, model_class, sort_key, filters)

                offset = (page - 1) * limit
                rows = query.offset(offset).limit(limit).all()

                result_entities: List[Dict[str, Any]] = []

                for row in rows:
                    entity_obj, dist_value = self._extract_entity_and_distance(row, distance_label)
                    entity_dict = self._entity_to_dict(entity_obj, include_relations)
                    if distance_expr is not None:
                        raw_miles = None
                        if dist_value is not None:
                            try:
                                raw_miles = float(dist_value) / 1609.344
                            except (TypeError, ValueError):
                                raw_miles = None
                        entity_dict['distance_raw'] = raw_miles
                        entity_dict['distance'] = None if raw_miles is None else round(raw_miles, 2)
                    result_entities.append(entity_dict)

                if geospatial_enabled:
                    if distance_expr is None:
                        # Fallback: compute distances in bulk via earthdistance helper
                        try:
                            lat_val = float(filters['latitude']) if filters and filters.get('latitude') else None
                            lng_val = float(filters['longitude']) if filters and filters.get('longitude') else None
                        except (TypeError, ValueError):
                            lat_val = lng_val = None

                        if lat_val is not None and lng_val is not None:
                            ids = [entity.get('id') for entity in result_entities if entity.get('id') is not None]
                            if ids:
                                distance_map = self._bulk_distance_miles(session, model_class, ids, lat_val, lng_val)
                                for entity_dict in result_entities:
                                    dist = distance_map.get(entity_dict.get('id'))
                                    if dist is not None:
                                        entity_dict['distance'] = round(dist, 2)
                                    else:
                                        entity_dict.setdefault('distance', None)
                        else:
                            for entity_dict in result_entities:
                                entity_dict.setdefault('distance', None)
                    else:
                        # Normalize distance field when column projection succeeded
                        for entity_dict in result_entities:
                            entity_dict.setdefault('distance', None)

                count_query = session.query(model_class)
                count_query = self._apply_filters(count_query, model_class, filters, mapping)
                if geospatial_enabled:
                    count_query = self._apply_geospatial_filter(count_query, model_class, filters)
                total_count = count_query.count()

                has_next = offset + limit < total_count
                has_prev = page > 1
                next_cursor = f"page_{page + 1}" if has_next else None
                prev_cursor = f"page_{page - 1}" if has_prev else None

                logger.info(
                    f"Page pagination: Page {page}, offset {offset}-{offset + len(result_entities)}, "
                    f"returned {len(result_entities)} entities, total: {total_count}"
                )

                for entity_dict in result_entities:
                    entity_dict.pop('distance_raw', None)

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
        """Get entities with enhanced cursor pagination."""
        try:
            if sort_key == 'distance_asc' and page is not None:
                return self._get_entities_with_distance_pagination(
                    entity_type, page, limit, filters, include_relations, user_context
                )

            if page is not None:
                return self._get_entities_with_page_pagination(
                    entity_type, page, limit, sort_key, filters, include_relations, user_context
                )

            model_class = self.get_model_class(entity_type)
            if not model_class:
                logger.error(f"Unknown entity type: {entity_type}")
                return [], None, None, 0

            mapping = self.get_entity_mapping(entity_type)
            if not mapping:
                logger.error(f"No mapping for entity type: {entity_type}")
                return [], None, None, 0

            with self.connection_manager.session_scope() as session:
                query = session.query(model_class)

                if include_relations and mapping.get('relations'):
                    for relation in mapping['relations']:
                        if hasattr(model_class, relation):
                            query = query.options(joinedload(getattr(model_class, relation)))

                query = self._apply_filters(query, model_class, filters, mapping)

                geospatial_enabled = mapping.get('geospatial') and filters and filters.get('latitude') and filters.get('longitude')
                lat = lng = None
                distance_expr = None
                distance_label = None
                if geospatial_enabled:
                    query = self._apply_geospatial_filter(query, model_class, filters)
                    try:
                        lat = float(filters['latitude'])
                        lng = float(filters['longitude'])
                        distance_expr = self._build_distance_expression(model_class, lat, lng)
                        if distance_expr is not None:
                            distance_label = 'distance_meters'
                            query = query.add_columns(distance_expr.label(distance_label))
                    except (TypeError, ValueError):
                        logger.warning("Invalid coordinates supplied; skipping distance projection")
                        distance_expr = None

                query, cursor_position = self._apply_cursor_pagination(
                    query, model_class, cursor, sort_key, limit, filters, distance_expr
                )
                query = self._apply_sorting(query, model_class, sort_key, filters)

                rows = query.limit(limit + 1).all()
                has_next = len(rows) > limit
                if has_next:
                    rows = rows[:limit]

                result_entities: List[Dict[str, Any]] = []

                for row in rows:
                    entity_obj, dist_value = self._extract_entity_and_distance(row, distance_label)
                    entity_dict = self._entity_to_dict(entity_obj, include_relations)
                    if distance_expr is not None:
                        raw_miles = None
                        if dist_value is not None:
                            try:
                                raw_miles = float(dist_value) / 1609.344
                            except (TypeError, ValueError):
                                raw_miles = None
                        entity_dict['distance_raw'] = raw_miles
                        entity_dict['distance'] = None if raw_miles is None else round(raw_miles, 2)
                    result_entities.append(entity_dict)

                if geospatial_enabled:
                    if distance_expr is None:
                        try:
                            lat_val = float(filters['latitude']) if filters and filters.get('latitude') else None
                            lng_val = float(filters['longitude']) if filters and filters.get('longitude') else None
                        except (TypeError, ValueError):
                            lat_val = lng_val = None

                        if lat_val is not None and lng_val is not None:
                            ids = [entity.get('id') for entity in result_entities if entity.get('id') is not None]
                            if ids:
                                distance_map = self._bulk_distance_miles(session, model_class, ids, lat_val, lng_val)
                                for entity_dict in result_entities:
                                    dist = distance_map.get(entity_dict.get('id'))
                                    if dist is not None:
                                        entity_dict['distance'] = round(dist, 2)
                                    else:
                                        entity_dict.setdefault('distance', None)
                        else:
                            for entity_dict in result_entities:
                                entity_dict.setdefault('distance', None)
                    else:
                        for entity_dict in result_entities:
                            entity_dict.setdefault('distance', None)

                next_cursor = None
                prev_cursor = None
                if result_entities:
                    if has_next:
                        next_cursor = self._generate_cursor(result_entities[-1], sort_key, 'next', entity_type)
                    prev_cursor = self._generate_cursor(result_entities[0], sort_key, 'prev', entity_type)

                total_count = self.get_entity_count(entity_type, filters)
                for entity_dict in result_entities:
                    entity_dict.pop('distance_raw', None)
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
            if 'bounds' in filters:
                bounds = filters['bounds']
                if isinstance(bounds, dict) and 'ne' in bounds and 'sw' in bounds:
                    ne_lat = float(bounds['ne']['lat'])
                    ne_lng = float(bounds['ne']['lng'])
                    sw_lat = float(bounds['sw']['lat'])
                    sw_lng = float(bounds['sw']['lng'])

                    if hasattr(model_class, 'latitude') and hasattr(model_class, 'longitude'):
                        query = query.filter(
                            func.ST_Within(
                                func.ST_SetSRID(func.ST_MakePoint(model_class.longitude, model_class.latitude), 4326),
                                func.ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
                            )
                        )
                    elif hasattr(model_class, 'geom'):
                        query = query.filter(
                            func.ST_Within(
                                model_class.geom,
                                func.ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
                            )
                        )
                    elif hasattr(model_class, 'location'):
                        query = query.filter(
                            func.ST_Within(
                                func.ST_GeogFromText(model_class.location),
                                func.ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
                            )
                        )
                    return query

            if 'latitude' in filters and 'longitude' in filters:
                lat = float(filters['latitude'])
                lng = float(filters['longitude'])
                radius_km = float(filters.get('radius', 160))

                if self._check_postgis_availability() and hasattr(model_class, 'latitude') and hasattr(model_class, 'longitude'):
                    try:
                        query = query.filter(
                            func.ST_DWithin(
                                func.ST_SetSRID(func.ST_MakePoint(getattr(model_class, 'longitude'), getattr(model_class, 'latitude')), 4326).cast(text('geography')),
                                func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326).cast(text('geography')),
                                radius_km * 1000
                            )
                        )
                        return query
                    except Exception as postgis_error:
                        logger.warning(f"PostGIS geospatial filter failed: {postgis_error}")

                if hasattr(model_class, 'latitude') and hasattr(model_class, 'longitude'):
                    try:
                        radius_meters = radius_km * 1000
                        query = query.filter(
                            and_(
                                getattr(model_class, 'latitude').isnot(None),
                                getattr(model_class, 'longitude').isnot(None),
                                func.earth_distance(
                                    func.ll_to_earth(getattr(model_class, 'latitude'), getattr(model_class, 'longitude')),
                                    func.ll_to_earth(lat, lng)
                                ) <= radius_meters
                            )
                        )
                        return query
                    except Exception as earth_error:
                        logger.warning(f"earthdistance geospatial filter failed: {earth_error}")
                        try:
                            from math import cos, radians
                            lat_delta = radius_km / 110.574
                            lng_delta = radius_km / (111.320 * max(0.1, cos(radians(lat))))
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
                            return query
                        except Exception as bbox_error:
                            logger.warning(f"Bounding box geospatial fallback failed: {bbox_error}")

                if hasattr(model_class, 'geom'):
                    try:
                        query = query.filter(
                            func.ST_DWithin(
                                model_class.geom,
                                func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
                                radius_km * 1000
                            )
                        )
                        return query
                    except Exception as geom_error:
                        logger.warning(f"Geom-based geospatial filter failed: {geom_error}")

            return query
        except Exception as e:
            logger.error(f"Error applying geospatial filter: {e}")
            return query

    def _apply_cursor_pagination(
        self,
        query,
        model_class,
        cursor: Optional[str],
        sort_key: str,
        limit: int,
        filters: Optional[Dict[str, Any]] = None,
        distance_expr=None,
    ):
        """Apply cursor-based pagination to query."""
        cursor_position = None

        if cursor:
            try:
                from utils.cursor_v5 import decode_cursor_v5, extract_cursor_position_v5

                cursor_payload = decode_cursor_v5(cursor)
                cursor_position = extract_cursor_position_v5(cursor_payload)

                primary_value, record_id = cursor_position
                strategy = self.SORT_STRATEGIES.get(sort_key, self.SORT_STRATEGIES['created_at_desc'])

                primary_field = None
                direction = strategy['direction']
                if sort_key == 'distance_asc':
                    if distance_expr is None and filters and filters.get('latitude') and filters.get('longitude'):
                        distance_expr = self._build_distance_expression(
                            model_class, filters['latitude'], filters['longitude']
                        )
                    if distance_expr is not None:
                        primary_field = distance_expr
                        direction = 'ASC'
                        try:
                            primary_value = float(primary_value)
                        except (TypeError, ValueError):
                            logger.warning("Invalid distance value in cursor; falling back to created_at")
                            primary_field = getattr(model_class, strategy['field'])
                            direction = strategy['direction']

                if primary_field is None:
                    primary_field = getattr(model_class, strategy['field'])

                if direction == 'DESC':
                    query = query.filter(
                        or_(
                            primary_field < primary_value,
                            and_(primary_field == primary_value, model_class.id < record_id)
                        )
                    )
                else:
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

    def _extract_entity_and_distance(self, row, distance_label: Optional[str]):
        """Extract entity object and distance value from a SQLAlchemy row."""
        if not distance_label:
            return row, None

        entity_obj = row
        distance_value = None

        mapping = getattr(row, '_mapping', None)

        if hasattr(row, '__getitem__'):
            try:
                entity_obj = row[0]
            except Exception:
                entity_obj = row
            if distance_value is None:
                try:
                    distance_value = row[1]
                except Exception:
                    distance_value = None

        if distance_value is None and mapping is not None:
            distance_value = mapping.get(distance_label)

        if distance_value is None and hasattr(row, distance_label):
            distance_value = getattr(row, distance_label)

        return entity_obj, distance_value

    def _build_distance_expression(self, model_class, lat: float, lng: float):
        """Construct a database-side distance expression in meters."""
        try:
            if not hasattr(model_class, 'latitude') or not hasattr(model_class, 'longitude'):
                return None
            lat_val = float(lat)
            lng_val = float(lng)
        except (TypeError, ValueError):
            logger.warning("Invalid latitude/longitude provided for distance expression")
            return None

        from sqlalchemy import func

        # Attempt PostGIS distance regardless of cached availability; fallback to earthdistance on failure
        try:
            self._check_postgis_availability()
            entity_point = func.ST_SetSRID(
                func.ST_MakePoint(getattr(model_class, 'longitude'), getattr(model_class, 'latitude')),
                4326,
            ).cast(text('geography'))
            user_point = func.ST_SetSRID(func.ST_MakePoint(lng_val, lat_val), 4326).cast(text('geography'))
            return func.ST_Distance(entity_point, user_point)
        except Exception as postgis_error:
            logger.warning(f"PostGIS distance expression failed: {postgis_error}")

        try:
            return func.earth_distance(
                func.ll_to_earth(getattr(model_class, 'latitude'), getattr(model_class, 'longitude')),
                func.ll_to_earth(lat_val, lng_val)
            )
        except Exception as earth_error:
            logger.error(f"earthdistance expression failed: {earth_error}")
            return None

    def _bulk_distance_miles(self, session, model_class, ids, lat: float, lng: float) -> Dict[int, float]:
        """Compute distances for a list of IDs, returning miles."""
        if not ids:
            return {}

        result: Dict[int, float] = {}
        from sqlalchemy import func

        # Attempt database-side distance calculation first
        try:
            distance_expr = self._build_distance_expression(model_class, lat, lng)
            if distance_expr is not None:
                rows = (
                    session.query(model_class.id, distance_expr.label('distance_meters'))
                    .filter(model_class.id.in_(ids))
                    .all()
                )
                for row in rows:
                    entity_id, distance_meters = row[0], row[1]
                    if entity_id is None or distance_meters is None:
                        continue
                    try:
                        result[int(entity_id)] = float(distance_meters) / 1609.344
                    except (TypeError, ValueError):
                        continue
                return result
        except Exception as db_error:
            logger.warning(f"Bulk distance DB computation failed: {db_error}")

        # Fallback: compute in Python using haversine
        try:
            rows = (
                session.query(
                    model_class.id,
                    getattr(model_class, 'latitude').label('lat'),
                    getattr(model_class, 'longitude').label('lng'),
                )
                .filter(model_class.id.in_(ids))
                .all()
            )
        except Exception as fetch_error:
            logger.warning(f"Bulk distance fallback fetch failed: {fetch_error}")
            return result

        from math import radians, cos, sin, asin, sqrt

        lat1 = radians(lat)
        lng1 = radians(lng)

        for row in rows:
            entity_id, lat2, lng2 = row
            if entity_id is None or lat2 is None or lng2 is None:
                continue
            try:
                lat2_rad = radians(float(lat2))
                lng2_rad = radians(float(lng2))
            except (TypeError, ValueError):
                continue

            dlat = lat2_rad - lat1
            dlng = lng2_rad - lng1
            a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2_rad) * sin(dlng / 2) ** 2
            c = 2 * asin(sqrt(a))
            miles = 3958.8 * c  # Earth's radius in miles
            result[int(entity_id)] = round(miles, 4)

        return result

    def _apply_sorting(self, query, model_class, sort_key: str, filters: Optional[Dict[str, Any]] = None):
        """Apply sorting to query."""
        strategy = self.SORT_STRATEGIES.get(sort_key, self.SORT_STRATEGIES['created_at_desc'])

        if sort_key == 'distance_asc':
            if filters and filters.get('latitude') and filters.get('longitude'):
                distance_expr = self._build_distance_expression(model_class, filters['latitude'], filters['longitude'])
                if distance_expr is not None:
                    return query.order_by(distance_expr.asc(), model_class.id.asc())
                logger.warning("Distance sorting requested but distance expression unavailable; falling back to created_at")
            else:
                logger.info("Distance sorting requested without coordinates; falling back to created_at")
            primary_field = getattr(model_class, 'created_at')
            secondary_field = getattr(model_class, 'id')
            return query.order_by(desc(primary_field), desc(secondary_field))

        primary_field = getattr(model_class, strategy['field'])
        secondary_field = getattr(model_class, strategy['secondary'])

        if strategy['direction'] == 'DESC':
            return query.order_by(desc(primary_field), desc(secondary_field))
        return query.order_by(asc(primary_field), asc(secondary_field))



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
    
    def _generate_cursor(self, entity: Dict[str, Any], sort_key: str, direction: str, entity_type: str) -> Optional[str]:
        """Generate cursor for pagination."""
        try:
            from utils.cursor_v5 import create_cursor_v5
            
            strategy = self.SORT_STRATEGIES.get(sort_key, self.SORT_STRATEGIES['created_at_desc'])

            if sort_key == 'distance_asc':
                primary_value = entity.get('distance_raw', entity.get('distance'))
                if primary_value is not None:
                    try:
                        primary_value = float(primary_value)
                    except (TypeError, ValueError):
                        primary_value = None
                if primary_value is None:
                    primary_field = 'created_at'
                    primary_value = entity.get(primary_field)
                else:
                    primary_field = 'distance'
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
    ) -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str], int]:
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

    def increment_share_count(self, restaurant_id: int) -> bool:
        """
        Increment the share count for a restaurant.
        
        Args:
            restaurant_id: Restaurant ID to increment share count for
            
        Returns:
            True if successful, False otherwise
        """
        try:
            from database.models import Restaurant
            
            with self.connection_manager.session_scope() as session:
                # Get the restaurant
                restaurant = session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
                if not restaurant:
                    logger.warning(f"Restaurant {restaurant_id} not found for share count increment")
                    return False
                
                # Increment share count
                if restaurant.share_count is None:
                    restaurant.share_count = 1
                else:
                    restaurant.share_count += 1
                
                # Update the updated_at timestamp
                from datetime import datetime, timezone
                restaurant.updated_at = datetime.now(timezone.utc)
                
                session.commit()
                logger.info(f"Incremented share count for restaurant {restaurant_id} to {restaurant.share_count}")
                return True
                
        except Exception as e:
            logger.exception(f"Failed to increment share count for restaurant {restaurant_id}", error=str(e))
            return False

    def increment_favorite_count(self, restaurant_id: int) -> bool:
        """
        Increment the favorite count for a restaurant.
        
        Args:
            restaurant_id: Restaurant ID to increment favorite count for
            
        Returns:
            True if successful, False otherwise
        """
        try:
            from database.models import Restaurant
            
            with self.connection_manager.session_scope() as session:
                # Get the restaurant
                restaurant = session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
                if not restaurant:
                    logger.warning(f"Restaurant {restaurant_id} not found for favorite count increment")
                    return False
                
                # Increment favorite count
                if restaurant.favorite_count is None:
                    restaurant.favorite_count = 1
                else:
                    restaurant.favorite_count += 1
                
                # Update the updated_at timestamp
                from datetime import datetime, timezone
                restaurant.updated_at = datetime.now(timezone.utc)
                
                session.commit()
                logger.info(f"Incremented favorite count for restaurant {restaurant_id} to {restaurant.favorite_count}")
                return True
                
        except Exception as e:
            logger.exception(f"Failed to increment favorite count for restaurant {restaurant_id}", error=str(e))
            return False

    def decrement_favorite_count(self, restaurant_id: int) -> bool:
        """
        Decrement the favorite count for a restaurant.
        
        Args:
            restaurant_id: Restaurant ID to decrement favorite count for
            
        Returns:
            True if successful, False otherwise
        """
        try:
            from database.models import Restaurant
            
            with self.connection_manager.session_scope() as session:
                # Get the restaurant
                restaurant = session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
                if not restaurant:
                    logger.warning(f"Restaurant {restaurant_id} not found for favorite count decrement")
                    return False
                
                # Decrement favorite count (don't go below 0)
                if restaurant.favorite_count is None or restaurant.favorite_count <= 0:
                    restaurant.favorite_count = 0
                else:
                    restaurant.favorite_count -= 1
                
                # Update the updated_at timestamp
                from datetime import datetime, timezone
                restaurant.updated_at = datetime.now(timezone.utc)
                
                session.commit()
                logger.info(f"Decremented favorite count for restaurant {restaurant_id} to {restaurant.favorite_count}")
                return True
                
        except Exception as e:
            logger.exception(f"Failed to decrement favorite count for restaurant {restaurant_id}", error=str(e))
            return False


# Convenience functions for common operations
def get_entity_repository_v5(connection_manager: Optional[DatabaseConnectionManager] = None) -> EntityRepositoryV5:
    """Get entity repository v5 instance."""
    if not connection_manager:
        from database.connection_manager import get_connection_manager
        connection_manager = get_connection_manager()
    
    return EntityRepositoryV5(connection_manager)
