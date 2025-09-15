#!/usr/bin/env python3
"""Consolidated v5 API routes with generic entity management.

This is the main API route file that consolidates restaurant, synagogue, mikvah,
and store endpoints using a generic entity pattern for maximum code reuse.
Replaces: api_v4.py, restaurants_api.py, synagogues_api.py, and store-related routes.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Optional, List
import json
import os
from functools import wraps
from utils.logging_config import get_logger
from middleware.auth_decorators import (
    auth_required, 
    admin_required, 
    optional_auth, 
    permission_required,
    rate_limit_by_user
)
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
            
            # Allow public read access for all entity types
            if operation == 'read':
                return f(*args, **kwargs)
            
            # For non-read operations, require authentication
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
    
    # Restaurant-specific filters
    if request_args.get('agency'):
        filters['agency'] = request_args.get('agency')
    
    if request_args.get('kosher_category'):
        filters['kosher_category'] = request_args.get('kosher_category')
    
    if request_args.get('ratingMin'):
        try:
            filters['ratingMin'] = float(request_args.get('ratingMin'))
        except (ValueError, TypeError):
            pass
    
    if request_args.get('priceRange'):
        try:
            # Handle price range as comma-separated string or array
            price_range = request_args.get('priceRange')
            if isinstance(price_range, str) and ',' in price_range:
                filters['priceRange'] = [int(x) for x in price_range.split(',')]
            elif isinstance(price_range, (list, tuple)):
                filters['priceRange'] = price_range
        except (ValueError, TypeError):
            pass
    
    if request_args.get('kosherDetails'):
        filters['kosherDetails'] = request_args.get('kosherDetails')
    
    if request_args.get('hoursFilter'):
        filters['hoursFilter'] = request_args.get('hoursFilter')
    
    if request_args.get('listing_type'):
        filters['listing_type'] = request_args.get('listing_type')
    
    if request_args.get('certifying_agency'):
        filters['certifying_agency'] = request_args.get('certifying_agency')
    
    # Location filters
    if request_args.get('latitude') and request_args.get('longitude'):
        try:
            filters['latitude'] = float(request_args.get('latitude'))
            filters['longitude'] = float(request_args.get('longitude'))
            filters['radius'] = float(request_args.get('radius', 160))  # Default 160km radius (100mi)
        except (ValueError, TypeError):
            pass  # Invalid location data, skip
    
    # Distance filters (multiple formats supported)
    if request_args.get('maxDistanceMi'):
        try:
            filters['maxDistanceMi'] = float(request_args.get('maxDistanceMi'))
        except (ValueError, TypeError):
            pass
    
    if request_args.get('maxDistance'):
        try:
            filters['maxDistance'] = float(request_args.get('maxDistance'))
        except (ValueError, TypeError):
            pass
    
    if request_args.get('distanceMi'):
        try:
            filters['distanceMi'] = float(request_args.get('distanceMi'))
        except (ValueError, TypeError):
            pass
    
    # Bounds filter for map viewport
    if request_args.get('bounds'):
        try:
            bounds_str = request_args.get('bounds')
            # Parse bounds format: "ne_lat,ne_lng-sw_lat,sw_lng"
            if '-' in bounds_str:
                ne_str, sw_str = bounds_str.split('-')
                ne_lat, ne_lng = map(float, ne_str.split(','))
                sw_lat, sw_lng = map(float, sw_str.split(','))
                filters['bounds'] = {
                    'ne': {'lat': ne_lat, 'lng': ne_lng},
                    'sw': {'lat': sw_lat, 'lng': sw_lng}
                }
        except (ValueError, TypeError, AttributeError):
            pass  # Invalid bounds data, skip
    
    # Time-based filters
    if request_args.get('openNow'):
        filters['openNow'] = request_args.get('openNow').lower() in ('true', '1', 'yes')
    
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
    
    if request_args.get('page'):
        try:
            page = int(request_args.get('page'))
            pagination['page'] = max(page, 1)  # Page must be at least 1
        except (ValueError, TypeError):
            pagination['page'] = 1  # Default page
    
    if request_args.get('limit'):
        try:
            limit = int(request_args.get('limit'))
            pagination['limit'] = min(max(limit, 1), 50)  # Between 1 and 50
        except (ValueError, TypeError):
            pagination['limit'] = 20  # Default limit
    
    if request_args.get('sort'):
        pagination['sort'] = request_args.get('sort')
    
    return pagination


# Generic entity endpoints
@api_v5.route('/<entity_type>', methods=['GET'])
@optional_auth  # Allow both authenticated and anonymous access
@rate_limit_by_user(max_requests=200, window_minutes=60)  # Rate limit authenticated users
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
        
        # Check if filter options should be included (typically on first page)
        include_filter_options = request.args.get('include_filter_options', 'false').lower() == 'true'
        
        # Get entities
        result = service.get_entities(
            filters=filters,
            cursor=pagination.get('cursor'),
            page=pagination.get('page'),
            limit=pagination.get('limit', 20),
            sort=pagination.get('sort', 'created_at_desc'),
            include_filter_options=include_filter_options
        )
        
        # Use total count from service (already calculated correctly for distance sorting)
        if 'total_count' in result:
            # Service already provided total_count, use it
            pass
        elif not pagination.get('cursor'):  # Fallback: get total count on first page for cursor pagination
            total_count = service.get_entity_count(filters)
            result['total_count'] = total_count
        
        # Generate ETag for caching
        etag = etag_manager.generate_collection_etag(
            entity_type=entity_type,
            filters=filters,
            sort_key=pagination.get('sort', 'created_at_desc'),
            page_size=pagination.get('limit', 20),
            cursor_token=pagination.get('cursor')
        )
        
        response = jsonify(result)
        
        # Only allow debug information in development
        if os.environ.get('FLASK_ENV') != 'production' and request.args.get('debug_geo', 'false').lower() == 'true':
            try:
                repo = getattr(service, 'repository', None)
                postgis_available = getattr(repo, '_postgis_available', None)
                lat = request.args.get('latitude') or request.args.get('lat')
                lng = request.args.get('longitude') or request.args.get('lng')
                radius = request.args.get('radius')
                distances = []
                for item in result.get('data', [])[:5]:
                    d = item.get('distance')
                    if d is not None:
                        distances.append(round(float(d), 2))
                debug_obj = {
                    'postgis_available': postgis_available,
                    'lat': lat,
                    'lng': lng,
                    'radius_km': radius,
                    'returned': len(result.get('data', [])),
                    'distances_sample_mi': distances,
                }
                response.headers['X-Geo-Debug'] = json.dumps(debug_obj)
            except Exception:
                pass
        response.headers['ETag'] = etag
        
        return response
        
    except Exception as e:
        logger.exception("Failed to get entities", entity_type=entity_type, error=str(e))
        return jsonify({'error': 'Failed to retrieve entities'}), 500


@api_v5.route('/<entity_type>/<int:entity_id>', methods=['GET'])
@optional_auth  # Allow both authenticated and anonymous access
@rate_limit_by_user(max_requests=300, window_minutes=60)  # Higher limit for individual entity views
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
@auth_required
@permission_required(['create_entities', 'admin_access'])
@rate_limit_by_user(max_requests=10, window_minutes=60)  # Strict limit for creation
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
@auth_required
@permission_required(['update_entities', 'admin_access'])
@rate_limit_by_user(max_requests=20, window_minutes=60)  # Moderate limit for updates
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
@auth_required
@admin_required  # Only admins can delete entities
@rate_limit_by_user(max_requests=5, window_minutes=60)  # Very strict limit for deletion
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
@optional_auth
@rate_limit_by_user(max_requests=200, window_minutes=60)
def get_restaurants():
    """Get restaurants with filtering and pagination."""
    return get_entities('restaurants')


@api_v5.route('/restaurants/<int:restaurant_id>', methods=['GET'])
@optional_auth
@rate_limit_by_user(max_requests=300, window_minutes=60)
def get_restaurant(restaurant_id: int):
    """Get a specific restaurant by ID."""
    return get_entity('restaurants', restaurant_id)


@api_v5.route('/restaurants', methods=['POST'])
@auth_required
@permission_required(['create_entities', 'admin_access'])
@rate_limit_by_user(max_requests=10, window_minutes=60)
def create_restaurant():
    """Create a new restaurant."""
    return create_entity('restaurants')


@api_v5.route('/restaurants/<int:restaurant_id>', methods=['PUT'])
@auth_required
@permission_required(['update_entities', 'admin_access'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def update_restaurant(restaurant_id: int):
    """Update an existing restaurant."""
    return update_entity('restaurants', restaurant_id)


@api_v5.route('/restaurants/<int:restaurant_id>', methods=['DELETE'])
@auth_required
@admin_required
@rate_limit_by_user(max_requests=5, window_minutes=60)
def delete_restaurant(restaurant_id: int):
    """Delete a restaurant."""
    return delete_entity('restaurants', restaurant_id)


@api_v5.route('/synagogues', methods=['GET'])
@optional_auth
@rate_limit_by_user(max_requests=200, window_minutes=60)
def get_synagogues():
    """Get synagogues with filtering and pagination."""
    return get_entities('synagogues')


@api_v5.route('/synagogues/<int:synagogue_id>', methods=['GET'])
@optional_auth
@rate_limit_by_user(max_requests=300, window_minutes=60)
def get_synagogue(synagogue_id: int):
    """Get a specific synagogue by ID."""
    return get_entity('synagogues', synagogue_id)


@api_v5.route('/synagogues', methods=['POST'])
@auth_required
@permission_required(['create_entities', 'admin_access'])
@rate_limit_by_user(max_requests=10, window_minutes=60)
def create_synagogue():
    """Create a new synagogue."""
    return create_entity('synagogues')


@api_v5.route('/synagogues/<int:synagogue_id>', methods=['PUT'])
@auth_required
@permission_required(['update_entities', 'admin_access'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def update_synagogue(synagogue_id: int):
    """Update an existing synagogue."""
    return update_entity('synagogues', synagogue_id)


@api_v5.route('/synagogues/<int:synagogue_id>', methods=['DELETE'])
@auth_required
@admin_required
@rate_limit_by_user(max_requests=5, window_minutes=60)
def delete_synagogue(synagogue_id: int):
    """Delete a synagogue."""
    return delete_entity('synagogues', synagogue_id)


@api_v5.route('/mikvahs', methods=['GET'])
@optional_auth
@rate_limit_by_user(max_requests=200, window_minutes=60)
def get_mikvahs():
    """Get mikvahs with filtering and pagination."""
    return get_entities('mikvahs')


@api_v5.route('/mikvahs/<int:mikvah_id>', methods=['GET'])
@optional_auth
@rate_limit_by_user(max_requests=300, window_minutes=60)
def get_mikvah(mikvah_id: int):
    """Get a specific mikvah by ID."""
    return get_entity('mikvahs', mikvah_id)


@api_v5.route('/mikvahs', methods=['POST'])
@auth_required
@permission_required(['create_entities', 'admin_access'])
@rate_limit_by_user(max_requests=10, window_minutes=60)
def create_mikvah():
    """Create a new mikvah."""
    return create_entity('mikvahs')


@api_v5.route('/mikvahs/<int:mikvah_id>', methods=['PUT'])
@auth_required
@permission_required(['update_entities', 'admin_access'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def update_mikvah(mikvah_id: int):
    """Update an existing mikvah."""
    return update_entity('mikvahs', mikvah_id)


@api_v5.route('/mikvahs/<int:mikvah_id>', methods=['DELETE'])
@auth_required
@admin_required
@rate_limit_by_user(max_requests=5, window_minutes=60)
def delete_mikvah(mikvah_id: int):
    """Delete a mikvah."""
    return delete_entity('mikvahs', mikvah_id)


@api_v5.route('/stores', methods=['GET'])
@optional_auth
@rate_limit_by_user(max_requests=200, window_minutes=60)
def get_stores():
    """Get stores with filtering and pagination."""
    return get_entities('stores')


@api_v5.route('/stores/<int:store_id>', methods=['GET'])
@optional_auth
@rate_limit_by_user(max_requests=300, window_minutes=60)
def get_store(store_id: int):
    """Get a specific store by ID."""
    return get_entity('stores', store_id)


@api_v5.route('/stores', methods=['POST'])
@auth_required
@permission_required(['create_entities', 'admin_access'])
@rate_limit_by_user(max_requests=10, window_minutes=60)
def create_store():
    """Create a new store."""
    return create_entity('stores')


@api_v5.route('/stores/<int:store_id>', methods=['PUT'])
@auth_required
@permission_required(['update_entities', 'admin_access'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def update_store(store_id: int):
    """Update an existing store."""
    return update_entity('stores', store_id)


@api_v5.route('/stores/<int:store_id>', methods=['DELETE'])
@auth_required
@admin_required
@rate_limit_by_user(max_requests=5, window_minutes=60)
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


@api_v5.route('/restaurants/<int:restaurant_id>/view', methods=['POST'])
@optional_auth  # Allow anonymous tracking but prefer authenticated
@rate_limit_by_user(max_requests=100, window_minutes=60)
def track_restaurant_view(restaurant_id: int):
    """Track a restaurant page view."""
    try:
        # Get restaurant service
        service = get_entity_service('restaurants')
        
        # Check if restaurant exists
        restaurant = service.get_entity(restaurant_id)
        if not restaurant:
            return jsonify({'error': 'Restaurant not found'}), 404
        
        # Track the view
        result = service.track_view(restaurant_id)
        
        return jsonify({
            'success': True,
            'data': {
                'restaurant_id': restaurant_id,
                'restaurant_name': restaurant.get('name', 'Unknown'),
                'view_count': result['view_count'],
                'view_count_before': result['view_count_before'],
                'increment': result['increment']
            }
        })
        
    except Exception as e:
        logger.exception("Failed to track restaurant view", restaurant_id=restaurant_id, error=str(e))
        return jsonify({'error': 'Failed to track view'}), 500


# Simple reviews endpoint as fallback
@api_v5.route('/reviews', methods=['GET'])
@optional_auth
@rate_limit_by_user(max_requests=100, window_minutes=60)
def get_reviews_fallback():
    """Simple reviews endpoint as fallback when reviews API is not available."""
    try:
        # Return empty reviews data for now
        return jsonify({
            'reviews': [],
            'pagination': {
                'cursor': None,
                'next_cursor': None,
                'has_more': False,
                'total_count': 0
            }
        })
    except Exception as e:
        logger.exception("Failed to get reviews fallback", error=str(e))
        return jsonify({'error': 'Failed to retrieve reviews'}), 500


@api_v5.errorhandler(404)
def not_found(error):
    """Handle not found errors."""
    return jsonify({'error': 'Resource not found'}), 404


@api_v5.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("API v5 internal server error", error=str(error))
    return jsonify({'error': 'Internal server error'}), 500
