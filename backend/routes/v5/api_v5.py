#!/usr/bin/env python3
"""Consolidated v5 API routes with generic entity management.

This is the main API route file that consolidates restaurant, synagogue, mikvah,
and store endpoints using a generic entity pattern for maximum code reuse.
Replaces: api_v4.py, restaurants_api.py, synagogues_api.py, and store-related routes.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Optional, List
import json
from functools import wraps
from utils.logging_config import get_logger
from database.repositories.entity_repository_v5 import EntityRepositoryV5
from database.services.restaurant_service_v5 import RestaurantServiceV5
from database.services.synagogue_service_v5 import SynagogueServiceV5
from database.services.mikvah_service_v5 import MikvahServiceV5
from database.services.store_service_v5 import StoreServiceV5
from middleware.auth_v5 import AuthV5Middleware
from middleware.rate_limit_v5 import RateLimitV5Middleware
from middleware.idempotency_v5 import IdempotencyV5Middleware
from middleware.observability_v5 import ObservabilityV5Middleware
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from utils.cursor_v5 import CursorV5Manager
from utils.etag_v5 import ETagV5Manager
from cache.redis_manager_v5 import RedisManagerV5

logger = get_logger(__name__)

# Create blueprint using the factory
api_v5 = BlueprintFactoryV5.create_blueprint(
    'api_v5',
    __name__,
    url_prefix='/api/v5',
    config_override={
        'enable_cors': False,  # Disabled - Nginx handles CORS
        'enable_auth': True,
        'enable_rate_limiting': True,
        'enable_idempotency': True,
        'enable_observability': True,
        'enable_etag': True
    }
)

# Entity type mappings
ENTITY_TYPES = {
    'restaurants': {
        'service_class': RestaurantServiceV5,
        'single_name': 'restaurant',
        'required_permissions': ['read_restaurants'],
        'create_permissions': ['create_restaurants'],
        'update_permissions': ['update_restaurants'],
        'delete_permissions': ['delete_restaurants']
    },
    'synagogues': {
        'service_class': SynagogueServiceV5,
        'single_name': 'synagogue',
        'required_permissions': ['read_synagogues'],
        'create_permissions': ['create_synagogues'],
        'update_permissions': ['update_synagogues'],
        'delete_permissions': ['delete_synagogues']
    },
    'mikvahs': {
        'service_class': MikvahServiceV5,
        'single_name': 'mikvah',
        'required_permissions': ['read_mikvahs'],
        'create_permissions': ['create_mikvahs'],
        'update_permissions': ['update_mikvahs'],
        'delete_permissions': ['delete_mikvahs']
    },
    'stores': {
        'service_class': StoreServiceV5,
        'single_name': 'store',
        'required_permissions': ['read_stores'],
        'create_permissions': ['create_stores'],
        'update_permissions': ['update_stores'],
        'delete_permissions': ['delete_stores']
    }
}

# Global service instances
entity_repository = None
services = {}
redis_manager = None
cursor_manager = None
etag_manager = None


def init_services(connection_manager, redis_manager_instance):
    """Initialize service instances."""
    global entity_repository, services, redis_manager, cursor_manager, etag_manager
    
    entity_repository = EntityRepositoryV5(connection_manager)
    redis_manager = redis_manager_instance
    cursor_manager = CursorV5Manager()
    etag_manager = ETagV5Manager()
    
    # Initialize entity services
    for entity_type, config in ENTITY_TYPES.items():
        service_class = config['service_class']
        services[entity_type] = service_class(entity_repository, redis_manager_instance, None)


def require_entity_permission(entity_type: str, operation: str):
    """Decorator to require entity-specific permissions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if entity_type not in ENTITY_TYPES:
                return jsonify({'error': 'Invalid entity type'}), 400
            
            config = ENTITY_TYPES[entity_type]
            required_permissions = config.get(f'{operation}_permissions', [])
            
            if not required_permissions:
                return f(*args, **kwargs)
            
            if not hasattr(g, 'user_permissions') or not g.user_permissions:
                return jsonify({'error': 'Authentication required'}), 401
            
            user_permissions = set(g.user_permissions)
            if not any(perm in user_permissions for perm in required_permissions):
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def get_entity_service(entity_type: str):
    """Get service instance for entity type."""
    if entity_type not in services:
        raise ValueError(f"Unknown entity type: {entity_type}")
    return services[entity_type]


def parse_filters(request_args: Dict[str, Any]) -> Dict[str, Any]:
    """Parse and validate filters from request arguments."""
    filters = {}
    
    # Common filters
    if request_args.get('search'):
        filters['search'] = request_args.get('search').strip()
    
    if request_args.get('status'):
        filters['status'] = request_args.get('status')
    
    if request_args.get('category'):
        filters['category'] = request_args.get('category')
    
    # Location filters
    if request_args.get('latitude') and request_args.get('longitude'):
        try:
            filters['location'] = {
                'latitude': float(request_args.get('latitude')),
                'longitude': float(request_args.get('longitude')),
                'radius': float(request_args.get('radius', 10))  # Default 10km radius
            }
        except (ValueError, TypeError):
            pass  # Invalid location data, skip
    
    # Date filters
    if request_args.get('created_after'):
        filters['created_after'] = request_args.get('created_after')
    
    if request_args.get('updated_after'):
        filters['updated_after'] = request_args.get('updated_after')
    
    return filters


def parse_pagination(request_args: Dict[str, Any]) -> Dict[str, Any]:
    """Parse pagination parameters."""
    pagination = {}
    
    if request_args.get('cursor'):
        pagination['cursor'] = request_args.get('cursor')
    
    if request_args.get('limit'):
        try:
            limit = int(request_args.get('limit'))
            pagination['limit'] = min(max(limit, 1), 100)  # Between 1 and 100
        except (ValueError, TypeError):
            pagination['limit'] = 20  # Default limit
    
    if request_args.get('sort'):
        pagination['sort'] = request_args.get('sort')
    
    return pagination


# Generic entity endpoints
@api_v5.route('/<entity_type>', methods=['GET'])
@require_entity_permission('restaurants', 'read')  # Will be overridden by decorator
def get_entities(entity_type: str):
    """Get entities with filtering and pagination."""
    try:
        if entity_type not in ENTITY_TYPES:
            return jsonify({'error': 'Invalid entity type'}), 400
        
        # Parse filters and pagination
        filters = parse_filters(request.args)
        pagination = parse_pagination(request.args)
        
        # Get service for entity type
        service = get_entity_service(entity_type)
        
        # Get entities
        result = service.get_entities(
            filters=filters,
            cursor=pagination.get('cursor'),
            limit=pagination.get('limit', 20),
            sort=pagination.get('sort', 'created_at_desc')
        )
        
        # Generate ETag for caching
        etag = etag_manager.generate_collection_etag(
            entity_type=entity_type,
            filters=filters,
            sort_key=pagination.get('sort', 'created_at_desc'),
            page_size=pagination.get('limit', 20),
            cursor_token=pagination.get('cursor')
        )
        
        response = jsonify(result)
        response.headers['ETag'] = etag
        
        return response
        
    except Exception as e:
        logger.exception("Failed to get entities", entity_type=entity_type, error=str(e))
        return jsonify({'error': 'Failed to retrieve entities'}), 500


@api_v5.route('/<entity_type>/<int:entity_id>', methods=['GET'])
@require_entity_permission('restaurants', 'read')  # Will be overridden by decorator
def get_entity(entity_type: str, entity_id: int):
    """Get a specific entity by ID."""
    try:
        if entity_type not in ENTITY_TYPES:
            return jsonify({'error': 'Invalid entity type'}), 400
        
        # Get service for entity type
        service = get_entity_service(entity_type)
        
        # Get entity
        entity = service.get_entity(entity_id)
        if not entity:
            return jsonify({'error': 'Entity not found'}), 404
        
        # Generate ETag for caching
        etag = etag_manager.generate_entity_etag(
            entity_type=entity_type,
            entity_id=entity_id,
            entity_data=entity
        )
        
        response = jsonify({'data': entity})
        response.headers['ETag'] = etag
        
        return response
        
    except Exception as e:
        logger.exception("Failed to get entity", entity_type=entity_type, entity_id=entity_id, error=str(e))
        return jsonify({'error': 'Failed to retrieve entity'}), 500


@api_v5.route('/<entity_type>', methods=['POST'])
@require_entity_permission('restaurants', 'create')  # Will be overridden by decorator
def create_entity(entity_type: str):
    """Create a new entity."""
    try:
        if entity_type not in ENTITY_TYPES:
            return jsonify({'error': 'Invalid entity type'}), 400
        
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        
        # Get service for entity type
        service = get_entity_service(entity_type)
        
        # Create entity
        result = service.create_entity(data)
        if not result:
            return jsonify({'error': 'Failed to create entity'}), 400
        
        # Invalidate related caches
        etag_manager.invalidate_etag(entity_type)
        
        return jsonify({'data': result, 'message': 'Entity created successfully'}), 201
        
    except Exception as e:
        logger.exception("Failed to create entity", entity_type=entity_type, error=str(e))
        return jsonify({'error': 'Failed to create entity'}), 500


@api_v5.route('/<entity_type>/<int:entity_id>', methods=['PUT'])
@require_entity_permission('restaurants', 'update')  # Will be overridden by decorator
def update_entity(entity_type: str, entity_id: int):
    """Update an existing entity."""
    try:
        if entity_type not in ENTITY_TYPES:
            return jsonify({'error': 'Invalid entity type'}), 400
        
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        
        # Get service for entity type
        service = get_entity_service(entity_type)
        
        # Update entity
        result = service.update_entity(entity_id, data)
        if not result:
            return jsonify({'error': 'Entity not found or update failed'}), 404
        
        # Invalidate related caches
        etag_manager.invalidate_etag(entity_type)
        etag_manager.invalidate_etag(entity_type, entity_id)
        
        return jsonify({'data': result, 'message': 'Entity updated successfully'})
        
    except Exception as e:
        logger.exception("Failed to update entity", entity_type=entity_type, entity_id=entity_id, error=str(e))
        return jsonify({'error': 'Failed to update entity'}), 500


@api_v5.route('/<entity_type>/<int:entity_id>', methods=['DELETE'])
@require_entity_permission('restaurants', 'delete')  # Will be overridden by decorator
def delete_entity(entity_type: str, entity_id: int):
    """Delete an entity."""
    try:
        if entity_type not in ENTITY_TYPES:
            return jsonify({'error': 'Invalid entity type'}), 400
        
        # Get service for entity type
        service = get_entity_service(entity_type)
        
        # Delete entity
        success = service.delete_entity(entity_id)
        if not success:
            return jsonify({'error': 'Entity not found or delete failed'}), 404
        
        # Invalidate related caches
        etag_manager.invalidate_etag(entity_type)
        etag_manager.invalidate_etag(entity_type, entity_id)
        
        return jsonify({'message': 'Entity deleted successfully'})
        
    except Exception as e:
        logger.exception("Failed to delete entity", entity_type=entity_type, entity_id=entity_id, error=str(e))
        return jsonify({'error': 'Failed to delete entity'}), 500


# Entity-specific endpoints
@api_v5.route('/restaurants', methods=['GET'])
@require_entity_permission('restaurants', 'read')
def get_restaurants():
    """Get restaurants with filtering and pagination."""
    return get_entities('restaurants')


@api_v5.route('/restaurants/<int:restaurant_id>', methods=['GET'])
@require_entity_permission('restaurants', 'read')
def get_restaurant(restaurant_id: int):
    """Get a specific restaurant by ID."""
    return get_entity('restaurants', restaurant_id)


@api_v5.route('/restaurants', methods=['POST'])
@require_entity_permission('restaurants', 'create')
def create_restaurant():
    """Create a new restaurant."""
    return create_entity('restaurants')


@api_v5.route('/restaurants/<int:restaurant_id>', methods=['PUT'])
@require_entity_permission('restaurants', 'update')
def update_restaurant(restaurant_id: int):
    """Update an existing restaurant."""
    return update_entity('restaurants', restaurant_id)


@api_v5.route('/restaurants/<int:restaurant_id>', methods=['DELETE'])
@require_entity_permission('restaurants', 'delete')
def delete_restaurant(restaurant_id: int):
    """Delete a restaurant."""
    return delete_entity('restaurants', restaurant_id)


@api_v5.route('/synagogues', methods=['GET'])
@require_entity_permission('synagogues', 'read')
def get_synagogues():
    """Get synagogues with filtering and pagination."""
    return get_entities('synagogues')


@api_v5.route('/synagogues/<int:synagogue_id>', methods=['GET'])
@require_entity_permission('synagogues', 'read')
def get_synagogue(synagogue_id: int):
    """Get a specific synagogue by ID."""
    return get_entity('synagogues', synagogue_id)


@api_v5.route('/synagogues', methods=['POST'])
@require_entity_permission('synagogues', 'create')
def create_synagogue():
    """Create a new synagogue."""
    return create_entity('synagogues')


@api_v5.route('/synagogues/<int:synagogue_id>', methods=['PUT'])
@require_entity_permission('synagogues', 'update')
def update_synagogue(synagogue_id: int):
    """Update an existing synagogue."""
    return update_entity('synagogues', synagogue_id)


@api_v5.route('/synagogues/<int:synagogue_id>', methods=['DELETE'])
@require_entity_permission('synagogues', 'delete')
def delete_synagogue(synagogue_id: int):
    """Delete a synagogue."""
    return delete_entity('synagogues', synagogue_id)


@api_v5.route('/mikvahs', methods=['GET'])
@require_entity_permission('mikvahs', 'read')
def get_mikvahs():
    """Get mikvahs with filtering and pagination."""
    return get_entities('mikvahs')


@api_v5.route('/mikvahs/<int:mikvah_id>', methods=['GET'])
@require_entity_permission('mikvahs', 'read')
def get_mikvah(mikvah_id: int):
    """Get a specific mikvah by ID."""
    return get_entity('mikvahs', mikvah_id)


@api_v5.route('/mikvahs', methods=['POST'])
@require_entity_permission('mikvahs', 'create')
def create_mikvah():
    """Create a new mikvah."""
    return create_entity('mikvahs')


@api_v5.route('/mikvahs/<int:mikvah_id>', methods=['PUT'])
@require_entity_permission('mikvahs', 'update')
def update_mikvah(mikvah_id: int):
    """Update an existing mikvah."""
    return update_entity('mikvahs', mikvah_id)


@api_v5.route('/mikvahs/<int:mikvah_id>', methods=['DELETE'])
@require_entity_permission('mikvahs', 'delete')
def delete_mikvah(mikvah_id: int):
    """Delete a mikvah."""
    return delete_entity('mikvahs', mikvah_id)


@api_v5.route('/stores', methods=['GET'])
@require_entity_permission('stores', 'read')
def get_stores():
    """Get stores with filtering and pagination."""
    return get_entities('stores')


@api_v5.route('/stores/<int:store_id>', methods=['GET'])
@require_entity_permission('stores', 'read')
def get_store(store_id: int):
    """Get a specific store by ID."""
    return get_entity('stores', store_id)


@api_v5.route('/stores', methods=['POST'])
@require_entity_permission('stores', 'create')
def create_store():
    """Create a new store."""
    return create_entity('stores')


@api_v5.route('/stores/<int:store_id>', methods=['PUT'])
@require_entity_permission('stores', 'update')
def update_store(store_id: int):
    """Update an existing store."""
    return update_entity('stores', store_id)


@api_v5.route('/stores/<int:store_id>', methods=['DELETE'])
@require_entity_permission('stores', 'delete')
def delete_store(store_id: int):
    """Delete a store."""
    return delete_entity('stores', store_id)


# Error handlers
@api_v5.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Bad request'}), 400


@api_v5.errorhandler(401)
def unauthorized(error):
    """Handle unauthorized errors."""
    return jsonify({'error': 'Authentication required'}), 401


@api_v5.errorhandler(403)
def forbidden(error):
    """Handle forbidden errors."""
    return jsonify({'error': 'Insufficient permissions'}), 403


@api_v5.errorhandler(404)
def not_found(error):
    """Handle not found errors."""
    return jsonify({'error': 'Resource not found'}), 404


@api_v5.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("API v5 internal server error", error=str(error))
    return jsonify({'error': 'Internal server error'}), 500
