#!/usr/bin/env python3
"""Keyset pagination API for restaurants (Phase 2).

This module provides cursor-based pagination endpoints for restaurant data,
implementing the Phase 2 requirements from the infinite scroll implementation plan.
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from flask import Blueprint, current_app, jsonify, request
from utils.cursors import (
    CursorError,
    CursorExpiredError,
    CursorValidationError,
    create_cursor,
    create_next_cursor,
    decode_cursor,
    extract_cursor_position,
    get_cursor_metadata,
)
from utils.data_version import (
    compute_data_version,
    normalize_filters,
    validate_data_version,
)
from utils.error_handler import (
    APIError,
    DatabaseError,
    NotFoundError,
    ValidationError,
    create_error_response,
)
from utils.limiter import limiter
from utils.logging_config import get_logger
from werkzeug.exceptions import HTTPException

logger = get_logger(__name__)

# Create blueprint for keyset pagination routes
restaurants_keyset_api = Blueprint(
    'restaurants_keyset_api', 
    __name__, 
    url_prefix='/api/v4/restaurants/keyset'
)

# Import service dependencies with fallbacks
try:
    from services.restaurant_service_v4 import RestaurantServiceV4
    from database.database_manager_v4 import DatabaseManager as DatabaseManagerV4
    from database.connection_manager import DatabaseConnectionManager
    from database.repositories.restaurant_repository import RestaurantRepository
except ImportError as e:
    logger.warning(f"Could not import restaurant services: {e}")
    RestaurantServiceV4 = None
    DatabaseManagerV4 = None
    DatabaseConnectionManager = None
    RestaurantRepository = None


def get_keyset_service_dependencies():
    """Get service dependencies for keyset pagination.
    
    Returns:
        Tuple of (db_manager, restaurant_service, repository)
    """
    db_manager = None
    restaurant_service = None
    repository = None
    
    try:
        if DatabaseConnectionManager and RestaurantRepository:
            conn_manager = DatabaseConnectionManager()
            repository = RestaurantRepository(conn_manager)
            
        if DatabaseManagerV4:
            db_manager = DatabaseManagerV4()
            
        if RestaurantServiceV4 and db_manager:
            restaurant_service = RestaurantServiceV4(db_manager)
            
    except Exception as e:
        logger.error("Failed to initialize keyset service dependencies", error=str(e))
    
    return db_manager, restaurant_service, repository


@restaurants_keyset_api.route('/list', methods=['GET'])
@limiter.limit("100 per minute")  # Higher limit for cursor pagination
def get_restaurants_keyset():
    """Get restaurants using keyset (cursor-based) pagination.
    
    Query Parameters:
    - cursor: Opaque cursor token for pagination position
    - limit: Number of results (default: 24, max: 100)
    - sort: Sort key (created_at_desc, created_at_asc, name_asc, name_desc)
    - direction: Pagination direction (next, prev) - defaults to 'next'
    - search: Search term for restaurant name/description/address
    - kosher_category: Filter by kosher category (meat, dairy, pareve)
    - status: Filter by status (active, inactive) - defaults to active
    - business_types: Filter by business types (comma-separated)
    - certifying_agency: Filter by certifying agency
    - city: Filter by city name
    - state: Filter by state
    - latitude: User latitude for location-based queries
    - longitude: User longitude for location-based queries
    
    Returns:
        JSON response with restaurant list and pagination info
    """
    try:
        # Parse query parameters
        cursor_token = request.args.get('cursor')
        limit = min(int(request.args.get('limit', 24)), 100)
        sort_key = request.args.get('sort', 'created_at_desc')
        direction = request.args.get('direction', 'next')
        
        # Parse filters
        filters = {}
        if request.args.get('search'):
            filters['search'] = request.args.get('search').strip()
        if request.args.get('kosher_category'):
            filters['kosher_category'] = request.args.get('kosher_category')
        if request.args.get('status'):
            filters['status'] = request.args.get('status')
        if request.args.get('business_types'):
            business_types = [bt.strip() for bt in request.args.get('business_types').split(',')]
            filters['business_types'] = business_types
        if request.args.get('certifying_agency'):
            filters['certifying_agency'] = request.args.get('certifying_agency')
        if request.args.get('city'):
            filters['city'] = request.args.get('city')
        if request.args.get('state'):
            filters['state'] = request.args.get('state')
        
        # Parse location parameters
        latitude = None
        longitude = None
        try:
            if request.args.get('latitude'):
                latitude = float(request.args.get('latitude'))
            if request.args.get('longitude'):
                longitude = float(request.args.get('longitude'))
        except (TypeError, ValueError):
            pass
        
        # Get service dependencies
        db_manager, restaurant_service, repository = get_keyset_service_dependencies()
        if not repository:
            response = create_error_response("Keyset pagination service unavailable", 503)
            return response[0], response[1]
        
        # Compute current data version
        current_data_version = compute_data_version(
            filters=filters,
            latitude=latitude,
            longitude=longitude,
            sort_key=sort_key
        )
        
        # Decode cursor if provided
        cursor_created_at = None
        cursor_id = None
        cursor_data_version = None
        
        if cursor_token:
            try:
                cursor_payload = decode_cursor(cursor_token, expected_direction=direction)
                cursor_created_at, cursor_id = extract_cursor_position(cursor_payload)
                cursor_metadata = get_cursor_metadata(cursor_payload)
                cursor_data_version = cursor_metadata.get('data_version')
                
                # Validate data version compatibility
                if cursor_data_version and not validate_data_version(
                    current_data_version, cursor_data_version, tolerance_hours=1
                ):
                    logger.warning("Cursor data version mismatch",
                                 current=current_data_version,
                                 cursor=cursor_data_version)
                    # Continue with warning but allow the request
                
            except CursorValidationError as e:
                response = create_error_response(f"Invalid cursor: {e}", 400)
                return response[0], response[1]
            except CursorExpiredError as e:
                response = create_error_response(f"Cursor expired: {e}", 410)  # Gone
                return response[0], response[1]
            except Exception as e:
                logger.error("Cursor decode error", error=str(e))
                response = create_error_response("Cursor processing failed", 400)
                return response[0], response[1]
        
        # Fetch restaurants using keyset pagination
        try:
            restaurants = repository.get_restaurants_with_keyset_pagination(
                cursor_created_at=cursor_created_at,
                cursor_id=cursor_id,
                direction=direction,
                sort_key=sort_key,
                limit=limit,
                filters=filters
            )
        except Exception as e:
            logger.exception("Keyset pagination query failed", error=str(e))
            response = create_error_response("Database query failed", 500)
            return response[0], response[1]
        
        # Convert restaurants to dictionaries
        restaurant_dicts = []
        for restaurant in restaurants:
            try:
                # Convert SQLAlchemy model to dict
                restaurant_dict = {
                    'id': restaurant.id,
                    'name': restaurant.name,
                    'address': restaurant.address,
                    'city': restaurant.city,
                    'state': restaurant.state,
                    'zip_code': restaurant.zip_code,
                    'phone_number': restaurant.phone_number,
                    'website': restaurant.website,
                    'kosher_category': restaurant.kosher_category,
                    'listing_type': restaurant.listing_type,
                    'certifying_agency': restaurant.certifying_agency,
                    'status': restaurant.status,
                    'created_at': restaurant.created_at.isoformat() if restaurant.created_at else None,
                    'updated_at': restaurant.updated_at.isoformat() if restaurant.updated_at else None,
                    'latitude': restaurant.latitude,
                    'longitude': restaurant.longitude,
                    'short_description': restaurant.short_description,
                    'is_cholov_yisroel': restaurant.is_cholov_yisroel,
                    'is_pas_yisroel': restaurant.is_pas_yisroel
                }
                restaurant_dicts.append(restaurant_dict)
            except Exception as e:
                logger.error("Restaurant serialization error", restaurant_id=getattr(restaurant, 'id', None), error=str(e))
                continue
        
        # Create next cursor if we have results
        next_cursor = None
        has_more = len(restaurants) == limit  # Heuristic: full page suggests more data
        
        if restaurants and has_more:
            last_restaurant = restaurant_dicts[-1]
            next_cursor = create_next_cursor(
                last_item=last_restaurant,
                sort_key=sort_key,
                data_version=current_data_version,
                ttl_hours=24
            )
        
        # Get total count for metadata (optional, can be expensive)
        total_count = None
        try:
            if not cursor_token:  # Only compute total on first page
                total_count = repository.count_restaurants_with_filters(filters)
        except Exception as e:
            logger.warning("Total count query failed", error=str(e))
        
        # Build response
        response_data = {
            'success': True,
            'data': {
                'restaurants': restaurant_dicts,
                'total': total_count,
                'has_more': has_more
            },
            'pagination': {
                'cursor': cursor_token,
                'next_cursor': next_cursor,
                'limit': limit,
                'sort_key': sort_key,
                'direction': direction,
                'returned_count': len(restaurant_dicts)
            },
            'metadata': {
                'data_version': current_data_version,
                'cursor_version_match': cursor_data_version == current_data_version if cursor_data_version else None,
                'query_timestamp': datetime.utcnow().isoformat()
            }
        }
        
        logger.info("Keyset pagination query successful",
                   cursor_provided=bool(cursor_token),
                   direction=direction,
                   sort_key=sort_key,
                   returned_count=len(restaurant_dicts),
                   has_more=has_more,
                   data_version=current_data_version)
        
        return jsonify(response_data), 200
        
    except ValidationError as e:
        response = create_error_response(str(e), 400)
        return response[0], response[1]
    except NotFoundError as e:
        response = create_error_response(str(e), 404)
        return response[0], response[1]
    except DatabaseError as e:
        response = create_error_response(str(e), 503)
        return response[0], response[1]
    except Exception as e:
        logger.exception("Keyset pagination endpoint error", error=str(e))
        response = create_error_response("Internal server error", 500)
        return response[0], response[1]


@restaurants_keyset_api.route('/health', methods=['GET'])
def keyset_health_check():
    """Health check endpoint for keyset pagination.
    
    Returns:
        JSON response with service health status
    """
    try:
        # Check service dependencies
        db_manager, restaurant_service, repository = get_keyset_service_dependencies()
        
        health_status = {
            'service': 'restaurants_keyset_api',
            'status': 'healthy',
            'dependencies': {
                'database_manager': bool(db_manager),
                'restaurant_service': bool(restaurant_service),
                'restaurant_repository': bool(repository)
            },
            'cursor_config': {
                'secret_configured': os.environ.get('CURSOR_HMAC_SECRET') is not None,
                'default_ttl_hours': 24
            },
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Test database connectivity
        if repository:
            try:
                test_count = repository.count_restaurants_with_filters({'status': 'active'})
                health_status['test_query'] = {
                    'active_restaurants_count': test_count,
                    'status': 'success'
                }
            except Exception as e:
                health_status['test_query'] = {
                    'status': 'failed',
                    'error': str(e)
                }
                health_status['status'] = 'degraded'
        
        status_code = 200 if health_status['status'] == 'healthy' else 503
        return jsonify(health_status), status_code
        
    except Exception as e:
        logger.exception("Health check error", error=str(e))
        return jsonify({
            'service': 'restaurants_keyset_api',
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503


# Register error handlers for this blueprint
@restaurants_keyset_api.errorhandler(HTTPException)
def handle_http_exception(e):
    """Handle HTTP exceptions."""
    return jsonify({
        'success': False,
        'error': e.description,
        'code': e.code
    }), e.code


@restaurants_keyset_api.errorhandler(Exception)
def handle_generic_exception(e):
    """Handle generic exceptions."""
    logger.exception("Unhandled keyset API exception", error=str(e))
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'code': 500
    }), 500