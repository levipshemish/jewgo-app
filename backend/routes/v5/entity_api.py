#!/usr/bin/env python3
"""
V5 Entity API routes using BlueprintFactoryV5.

Provides unified CRUD operations for all entity types (restaurants, synagogues, mikvahs, stores)
with consistent patterns, authentication, caching, and monitoring.
"""

from flask import request, jsonify, g
from typing import Dict, Any, Optional

from utils.blueprint_factory_v5 import BlueprintFactoryV5
from database.repositories.entity_repository_v5 import EntityRepositoryV5
from database.services.restaurant_service_v5 import RestaurantServiceV5
from database.services.synagogue_service_v5 import SynagogueServiceV5
from database.services.mikvah_service_v5 import MikvahServiceV5
from database.services.store_service_v5 import StoreServiceV5
from middleware.auth_v5 import require_permission_v5, optional_auth_v5
from utils.cursor_v5 import CursorV5Manager, create_next_cursor_v5
from utils.etag_v5 import ETagV5Manager, generate_collection_etag_v5, generate_entity_etag_v5
from cache.etag_cache import get_etag_cache
from utils.logging_config import get_logger
from utils.feature_flags_v5 import feature_flags_v5

logger = get_logger(__name__)

# Initialize services
from database.connection_manager import get_connection_manager
entity_repository = EntityRepositoryV5(get_connection_manager())

# Initialize cache manager
try:
    from cache.redis_manager_v5 import RedisManagerV5
    cache_manager = RedisManagerV5()
except ImportError:
    cache_manager = None
    logger.warning("Redis manager v5 not available, using None for cache")

# Initialize event publisher (simple implementation for now)
class SimpleEventPublisher:
    def publish(self, event):
        logger.debug(f"Event published: {event}")

event_publisher = SimpleEventPublisher()

# Initialize services with proper dependencies
from utils.feature_flags_v5 import FeatureFlagsV5
feature_flags = FeatureFlagsV5()
restaurant_service = RestaurantServiceV5(entity_repository, cache_manager, event_publisher)  # OK
synagogue_service = SynagogueServiceV5(entity_repository, cache_manager, event_publisher)    # OK
mikvah_service = MikvahServiceV5(entity_repository, cache_manager, feature_flags)
store_service = StoreServiceV5(entity_repository, cache_manager, feature_flags)

# Service mapping
ENTITY_SERVICES = {
    'restaurants': restaurant_service,
    'synagogues': synagogue_service,
    'mikvahs': mikvah_service,
    'stores': store_service,
}

# Initialize ETag manager
etag_manager = ETagV5Manager()

# Create blueprint using factory
entity_bp = BlueprintFactoryV5.create_blueprint(
    'entity_api', __name__, '/api/v5', config_override={
        'factory_sets_etag': False
    }
)


@entity_bp.route('/<entity_type>', methods=['GET'])
@optional_auth_v5
def get_entities(entity_type: str):
    """Get entities with pagination and filtering."""
    try:
        # Check feature flag
        user_id = getattr(g, 'user_id', None)
        user_roles = [role.get('role') for role in getattr(g, 'user_roles', []) if role.get('role')]
        
        if not feature_flags_v5.is_enabled('entity_api_v5', user_id=user_id, user_roles=user_roles):
            return jsonify({
                'success': False,
                'error': 'Entity API v5 is not enabled for your account'
            }), 503
        
        # Validate entity type
        if entity_type not in ENTITY_SERVICES:
            return jsonify({
                'success': False,
                'error': f'Invalid entity type. Supported: {list(ENTITY_SERVICES.keys())}'
            }), 400

        # Parse query parameters
        cursor = request.args.get('cursor')
        limit = min(int(request.args.get('limit', 20)), 100)
        sort = request.args.get('sort', 'created_at_desc')
        
        # Parse filters
        filters = {}
        for key in ['search', 'status', 'category', 'kosher_cert', 'rating_min']:
            value = request.args.get(key)
            if value:
                filters[key] = value

        # Parse location filters (support both lat/lng and latitude/longitude)
        lat = request.args.get('lat') or request.args.get('latitude')
        lng = request.args.get('lng') or request.args.get('longitude')
        radius = request.args.get('radius', '10')
        if lat and lng:
            try:
                filters['latitude'] = float(lat)
                filters['longitude'] = float(lng)
                filters['radius'] = float(radius)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid location parameters'
                }), 400

        # Generate ETag for caching
        etag = generate_collection_etag_v5(
            entity_type=entity_type,
            filters=filters,
            sort_key=sort,
            page_size=limit,
            cursor_token=cursor
        )
        
        # Check if-none-match header
        if_none_match = request.headers.get('If-None-Match')
        if if_none_match and if_none_match == etag:
            return '', 304

        # Fetch entities using service mapping
        service = ENTITY_SERVICES[entity_type]
        result = service.get_entities(
            filters=filters,
            cursor=cursor,
            limit=limit,
            sort=sort
        )
        entities = result.get('data', [])
        next_cursor = result.get('next_cursor')
        prev_cursor = result.get('prev_cursor')

        # Format response to match frontend PaginatedResponse<T> contract
        response_data = {
            'data': entities,  # Entities directly in data array
            'pagination': {
                'cursor': cursor,
                'next_cursor': next_cursor,
                'prev_cursor': prev_cursor,
                'limit': limit,
                'has_more': next_cursor is not None,
                'total_count': len(entities)  # Note: this is just current page count
            },
            'metadata': {
                'filters_applied': filters,
                'entity_type': entity_type,
                'sort_key': sort,
                'timestamp': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
            }
        }

        # Create response with ETag
        response = jsonify(response_data)
        response.headers['ETag'] = etag
        response.headers['Cache-Control'] = 'public, max-age=300'
        
        return response

    except Exception as e:
        logger.error(f"Error fetching {entity_type}: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@entity_bp.route('/<entity_type>/<int:entity_id>', methods=['GET'])
@optional_auth_v5
def get_entity_by_id(entity_type: str, entity_id: int):
    """Get single entity by ID."""
    try:
        # Check feature flag
        user_id = getattr(g, 'user_id', None)
        user_roles = [role.get('role') for role in getattr(g, 'user_roles', []) if role.get('role')]
        
        if not feature_flags_v5.is_enabled('entity_api_v5', user_id=user_id, user_roles=user_roles):
            return jsonify({
                'success': False,
                'error': 'Entity API v5 is not enabled for your account'
            }), 503
        
        # Validate entity type
        if entity_type not in ENTITY_SERVICES:
            return jsonify({
                'success': False,
                'error': f'Invalid entity type. Supported: {list(ENTITY_SERVICES.keys())}'
            }), 400

        # Generate ETag for caching
        etag = etag_manager.generate_entity_etag(entity_type=entity_type, entity_id=entity_id, include_relations=True)
        
        # Check if-none-match header
        if_none_match = request.headers.get('If-None-Match')
        if if_none_match and etag_manager.validate_etag(if_none_match, etag):
            return '', 304

        # Get entity using service mapping
        service = ENTITY_SERVICES[entity_type]
        entity = service.get_entity(entity_id)
        
        if not entity:
            return jsonify({
                'success': False,
                'error': f'{entity_type[:-1].title()} not found'
            }), 404

        # Format response to match frontend ApiResponse<T> contract
        response_data = entity  # Return entity directly

        # Create response with ETag
        response = jsonify(response_data)
        response.headers['ETag'] = etag
        response.headers['Cache-Control'] = 'public, max-age=600'
        
        return response

    except Exception as e:
        logger.error(f"Error fetching {entity_type} {entity_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@entity_bp.route('/<entity_type>', methods=['POST'])
@require_permission_v5('create_entities')
def create_entity(entity_type: str):
    """Create new entity."""
    try:
        # Validate entity type
        if entity_type not in ENTITY_SERVICES:
            return jsonify({
                'success': False,
                'error': f'Invalid entity type. Supported: {list(ENTITY_SERVICES.keys())}'
            }), 400

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body required'
            }), 400

        # Add metadata
        data['created_by'] = getattr(g, 'user_id', None)
        data['status'] = data.get('status', 'pending')

        # Create entity using service mapping
        service = ENTITY_SERVICES[entity_type]
        entity = service.create_entity(data)

        if not entity:
            return jsonify({
                'success': False,
                'error': 'Creation failed'
            }), 400

        # Invalidate related caches
        etag_cache = get_etag_cache()
        etag_cache.invalidate_entity_type(entity_type)

        return jsonify({
            'success': True,
            'data': {
                'entity': entity,
                'entity_type': entity_type,
                'message': f'{entity_type[:-1].title()} created successfully'
            },
            'timestamp': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error creating {entity_type}: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@entity_bp.route('/<entity_type>/<int:entity_id>', methods=['PUT'])
@require_permission_v5('update_entities')
def update_entity(entity_type: str, entity_id: int):
    """Update existing entity."""
    try:
        # Validate entity type
        if entity_type not in ENTITY_SERVICES:
            return jsonify({
                'success': False,
                'error': f'Invalid entity type. Supported: {list(ENTITY_SERVICES.keys())}'
            }), 400

        # Check if entity exists and update using service mapping
        service = ENTITY_SERVICES[entity_type]
        existing_entity = service.get_entity(entity_id)
        if not existing_entity:
            return jsonify({
                'success': False,
                'error': f'{entity_type[:-1].title()} not found'
            }), 404

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body required'
            }), 400

        # Add metadata
        data['updated_by'] = getattr(g, 'user_id', None)

        # Update entity using service
        entity = service.update_entity(entity_id, data)

        if not entity:
            return jsonify({
                'success': False,
                'error': 'Update failed'
            }), 400

        # Invalidate related caches
        etag_cache = get_etag_cache()
        etag_cache.invalidate_entity_type(entity_type)
        etag_cache.invalidate_entity(entity_type, entity_id)

        return jsonify({
            'success': True,
            'data': {
                'entity': entity,
                'entity_type': entity_type,
                'entity_id': entity_id,
                'message': f'{entity_type[:-1].title()} updated successfully'
            },
            'timestamp': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        })

    except Exception as e:
        logger.error(f"Error updating {entity_type} {entity_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@entity_bp.route('/<entity_type>/<int:entity_id>', methods=['DELETE'])
@require_permission_v5('delete_entities')
def delete_entity(entity_type: str, entity_id: int):
    """Delete entity (soft delete)."""
    try:
        # Validate entity type
        if entity_type not in ENTITY_SERVICES:
            return jsonify({
                'success': False,
                'error': f'Invalid entity type. Supported: {list(ENTITY_SERVICES.keys())}'
            }), 400

        # Check if entity exists and delete using service mapping
        service = ENTITY_SERVICES[entity_type]
        existing_entity = service.get_entity(entity_id)
        if not existing_entity:
            return jsonify({
                'success': False,
                'error': f'{entity_type[:-1].title()} not found'
            }), 404

        # Soft delete using service
        success = service.delete_entity(entity_id)

        if not success:
            return jsonify({
                'success': False,
                'error': 'Deletion failed'
            }), 400

        # Invalidate related caches
        etag_cache = get_etag_cache()
        etag_cache.invalidate_entity_type(entity_type)
        etag_cache.invalidate_entity(entity_type, entity_id)

        return jsonify({
            'success': True,
            'data': {
                'entity_type': entity_type,
                'entity_id': entity_id,
                'message': f'{entity_type[:-1].title()} deleted successfully'
            },
            'timestamp': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        })

    except Exception as e:
        logger.error(f"Error deleting {entity_type} {entity_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@entity_bp.route('/<entity_type>/batch', methods=['POST'])
@require_permission_v5('batch_operations')
def batch_operations(entity_type: str):
    """Perform batch operations on entities."""
    try:
        # Validate entity type
        if entity_type not in ENTITY_SERVICES:
            return jsonify({
                'success': False,
                'error': f'Invalid entity type. Supported: {list(ENTITY_SERVICES.keys())}'
            }), 400

        # Get request data
        data = request.get_json()
        if not data or 'operations' not in data:
            return jsonify({
                'success': False,
                'error': 'Operations array required'
            }), 400

        operations = data['operations']
        if len(operations) > 100:  # Limit batch size
            return jsonify({
                'success': False,
                'error': 'Maximum 100 operations per batch'
            }), 400

        results = []

        for i, operation in enumerate(operations):
            try:
                op_type = operation.get('type')
                op_data = operation.get('data', {})
                entity_id = operation.get('entity_id')

                service = ENTITY_SERVICES[entity_type]
                if op_type == 'create':
                    op_data['created_by'] = getattr(g, 'user_id', None)
                    entity = service.create_entity(op_data)
                    result = {'success': entity is not None, 'data': entity}
                elif op_type == 'update' and entity_id:
                    op_data['updated_by'] = getattr(g, 'user_id', None)
                    entity = service.update_entity(entity_id, op_data)
                    result = {'success': entity is not None, 'data': entity}
                elif op_type == 'delete' and entity_id:
                    success = service.delete_entity(entity_id)
                    result = {'success': success}
                else:
                    result = {'success': False, 'error': 'Invalid operation'}

                results.append({
                    'index': i,
                    'operation': operation,
                    'result': result
                })

            except Exception as e:
                results.append({
                    'index': i,
                    'operation': operation,
                    'result': {'success': False, 'error': str(e)}
                })

        # Invalidate caches after batch operations
        etag_cache = get_etag_cache()
        etag_cache.invalidate_entity_type(entity_type)

        # Calculate success/failure counts
        successful = len([r for r in results if r['result'].get('success')])
        failed = len(results) - successful

        return jsonify({
            'success': True,
            'data': {
                'entity_type': entity_type,
                'results': results,
                'summary': {
                    'total': len(operations),
                    'successful': successful,
                    'failed': failed
                }
            },
            'timestamp': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        })

    except Exception as e:
        logger.error(f"Error in batch operations for {entity_type}: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# Health check endpoint
@entity_bp.route('/health', methods=['GET'])
def entity_health_check():
    """Health check for entity API."""
    try:
        # Test service connections
        health_status = {'status': 'healthy', 'services': {}}
        for entity_type, service in ENTITY_SERVICES.items():
            try:
                service_health = service.health_check() if hasattr(service, 'health_check') else {'status': 'unknown'}
                health_status['services'][entity_type] = service_health
            except Exception as e:
                health_status['services'][entity_type] = {'status': 'error', 'error': str(e)}
        
        return jsonify({
            'success': True,
            'service': 'entity_api_v5',
            'status': 'healthy',
            'repository_status': health_status,
            'supported_entities': list(ENTITY_SERVICES.keys()),
            'timestamp': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Entity API health check failed: {e}")
        return jsonify({
            'success': False,
            'service': 'entity_api_v5',
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        }), 503


# Export blueprint for app factory
__all__ = ['entity_bp']
