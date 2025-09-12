#!/usr/bin/env python3
"""Consolidated v5 search API with unified cross-entity search capabilities.

This route file consolidates all search functionality across restaurants, synagogues,
mikvahs, and stores with advanced filtering, geospatial queries, and faceted search.
Replaces: unified_search_api.py, restaurant_search.py, and other search endpoints.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Optional, List, Union
import json
from datetime import datetime
from functools import wraps
from utils.logging_config import get_logger
from database.repositories.entity_repository_v5 import EntityRepositoryV5
from database.services.restaurant_service_v5 import RestaurantServiceV5
from database.services.synagogue_service_v5 import SynagogueServiceV5
from database.services.mikvah_service_v5 import MikvahServiceV5
from database.services.store_service_v5 import StoreServiceV5
from middleware.auth_v5 import AuthV5Middleware
from middleware.rate_limit_v5 import RateLimitV5Middleware
from middleware.observability_v5 import ObservabilityV5Middleware
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from utils.cursor_v5 import CursorV5Manager
from utils.etag_v5 import ETagV5Manager
from cache.redis_manager_v5 import RedisManagerV5

logger = get_logger(__name__)

# Create blueprint using the factory
search_v5 = BlueprintFactoryV5.create_blueprint(
    'search_v5',
    __name__,
    url_prefix='/api/v5/search',
    config_override={
        'enable_cors': False,  # Disabled - Nginx handles CORS
        'enable_auth': False,  # Public search endpoints
        'enable_rate_limiting': True,
        'enable_idempotency': False,  # Search is idempotent by nature
        'enable_observability': True,
        'enable_etag': True
    }
)

# Global service instances (initialized in init_services)
entity_repository = None
services = {}
redis_manager = None
cursor_manager = None
etag_manager = None

# Search configuration
SEARCH_CONFIG = {
    'default_limit': 20,
    'max_limit': 50,
    'supported_entities': ['restaurants', 'synagogues', 'mikvahs', 'stores'],
    'search_weights': {
        'name': 3.0,
        'description': 2.0,
        'address': 1.5,
        'tags': 2.5,
        'categories': 2.0
    },
    'geospatial': {
        'default_radius_km': 10,
        'max_radius_km': 100,
        'distance_weight': 0.3
    },
    'facets': {
        'categories': True,
        'status': True,
        'price_range': True,
        'rating': True,
        'distance': True
    }
}


def init_services(connection_manager, redis_manager_instance):
    """Initialize service instances."""
    global entity_repository, services, redis_manager, cursor_manager, etag_manager
    
    entity_repository = EntityRepositoryV5(connection_manager)
    redis_manager = redis_manager_instance
    cursor_manager = CursorV5Manager()
    etag_manager = ETagV5Manager()
    
    # Initialize entity services
    services = {
        'restaurants': RestaurantServiceV5(entity_repository, redis_manager_instance, None),
        'synagogues': SynagogueServiceV5(entity_repository, redis_manager_instance, None),
        'mikvahs': MikvahServiceV5(entity_repository, redis_manager_instance, None),
        'stores': StoreServiceV5(entity_repository, redis_manager_instance, None)
    }


def parse_search_params(request_args: Dict[str, Any]) -> Dict[str, Any]:
    """Parse and validate search parameters."""
    params = {}
    
    # Query parameters
    params['query'] = request_args.get('q', '').strip()
    params['limit'] = min(int(request_args.get('limit', SEARCH_CONFIG['default_limit'])), SEARCH_CONFIG['max_limit'])
    params['offset'] = max(int(request_args.get('offset', 0)), 0)
    
    # Entity filters
    entity_types = request_args.get('entities', '').split(',')
    params['entities'] = [e.strip() for e in entity_types if e.strip() in SEARCH_CONFIG['supported_entities']]
    if not params['entities']:
        params['entities'] = SEARCH_CONFIG['supported_entities']
    
    # Location parameters
    if request_args.get('latitude') and request_args.get('longitude'):
        try:
            params['location'] = {
                'latitude': float(request_args.get('latitude')),
                'longitude': float(request_args.get('longitude')),
                'radius': float(request_args.get('radius', SEARCH_CONFIG['geospatial']['default_radius_km']))
            }
        except (ValueError, TypeError):
            pass  # Invalid location data, skip
    
    # Category filters
    categories = request_args.get('categories', '').split(',')
    params['categories'] = [c.strip() for c in categories if c.strip()]
    
    # Status filters
    status = request_args.get('status')
    if status:
        params['status'] = status
    
    # Price range filters
    if request_args.get('price_min'):
        try:
            params['price_min'] = float(request_args.get('price_min'))
        except (ValueError, TypeError):
            pass
    
    if request_args.get('price_max'):
        try:
            params['price_max'] = float(request_args.get('price_max'))
        except (ValueError, TypeError):
            pass
    
    # Rating filters
    if request_args.get('min_rating'):
        try:
            params['min_rating'] = float(request_args.get('min_rating'))
        except (ValueError, TypeError):
            pass
    
    # Sort parameters
    sort_by = request_args.get('sort_by', 'relevance')
    sort_order = request_args.get('sort_order', 'desc')
    params['sort'] = {
        'field': sort_by,
        'order': sort_order
    }
    
    # Facet parameters
    params['include_facets'] = request_args.get('include_facets', 'true').lower() == 'true'
    
    return params


def build_search_query(params: Dict[str, Any]) -> Dict[str, Any]:
    """Build search query from parameters."""
    query = {
        'text': params.get('query', ''),
        'entities': params.get('entities', []),
        'filters': {},
        'location': params.get('location'),
        'sort': params.get('sort', {'field': 'relevance', 'order': 'desc'}),
        'pagination': {
            'limit': params.get('limit', SEARCH_CONFIG['default_limit']),
            'offset': params.get('offset', 0)
        }
    }
    
    # Add filters
    if params.get('categories'):
        query['filters']['categories'] = params['categories']
    
    if params.get('status'):
        query['filters']['status'] = params['status']
    
    if params.get('price_min') is not None or params.get('price_max') is not None:
        query['filters']['price_range'] = {}
        if params.get('price_min') is not None:
            query['filters']['price_range']['min'] = params['price_min']
        if params.get('price_max') is not None:
            query['filters']['price_range']['max'] = params['price_max']
    
    if params.get('min_rating') is not None:
        query['filters']['min_rating'] = params['min_rating']
    
    return query


def execute_search(query: Dict[str, Any]) -> Dict[str, Any]:
    """Execute search across multiple entities."""
    results = {
        'entities': {},
        'facets': {},
        'total_results': 0,
        'search_time_ms': 0
    }
    
    start_time = datetime.utcnow()
    
    # Search each entity type
    for entity_type in query['entities']:
        if entity_type in services:
            try:
                service = services[entity_type]
                entity_results = service.search_entities(
                    query=query['text'],
                    filters=query['filters'],
                    location=query['location'],
                    sort=query['sort'],
                    limit=query['pagination']['limit'],
                    offset=query['pagination']['offset']
                )
                results['entities'][entity_type] = entity_results
                results['total_results'] += entity_results.get('total', 0)
            except Exception as e:
                logger.warning(f"Search failed for {entity_type}", error=str(e))
                results['entities'][entity_type] = {'error': str(e), 'data': [], 'total': 0}
    
    # Calculate search time
    end_time = datetime.utcnow()
    results['search_time_ms'] = (end_time - start_time).total_seconds() * 1000
    
    return results


def generate_facets(results: Dict[str, Any], query: Dict[str, Any]) -> Dict[str, Any]:
    """Generate search facets from results."""
    facets = {}
    
    if not SEARCH_CONFIG['facets']['categories']:
        return facets
    
    # Aggregate categories across all entities
    category_counts = {}
    status_counts = {}
    rating_counts = {}
    
    for entity_type, entity_results in results['entities'].items():
        if 'data' in entity_results:
            for item in entity_results['data']:
                # Category facets
                if 'category' in item:
                    category = item['category']
                    category_counts[category] = category_counts.get(category, 0) + 1
                
                # Status facets
                if 'status' in item:
                    status = item['status']
                    status_counts[status] = status_counts.get(status, 0) + 1
                
                # Rating facets
                if 'rating' in item:
                    rating = item['rating']
                    if rating:
                        rating_bucket = f"{int(rating)}-{int(rating)+1}"
                        rating_counts[rating_bucket] = rating_counts.get(rating_bucket, 0) + 1
    
    # Build facets
    if category_counts:
        facets['categories'] = [
            {'value': category, 'count': count}
            for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        ]
    
    if status_counts:
        facets['status'] = [
            {'value': status, 'count': count}
            for status, count in sorted(status_counts.items())
        ]
    
    if rating_counts:
        facets['ratings'] = [
            {'value': rating, 'count': count}
            for rating, count in sorted(rating_counts.items())
        ]
    
    return facets


# Search endpoints
@search_v5.route('/', methods=['GET'])
def unified_search():
    """Unified search across all entity types."""
    try:
        # Parse search parameters
        params = parse_search_params(request.args)
        
        # Build search query
        query = build_search_query(params)
        
        # Check cache
        cache_key = f"search:{hash(str(query))}"
        cached_results = redis_manager.get(cache_key, prefix='search')
        if cached_results:
            return jsonify(cached_results)
        
        # Execute search
        results = execute_search(query)
        
        # Generate facets if requested
        if params.get('include_facets'):
            results['facets'] = generate_facets(results, query)
        
        # Cache results
        redis_manager.set(cache_key, results, ttl=300, prefix='search')  # 5 minutes
        
        return jsonify(results)
        
    except Exception as e:
        logger.exception("Search failed", error=str(e))
        return jsonify({'error': 'Search failed'}), 500


@search_v5.route('/suggestions', methods=['GET'])
def search_suggestions():
    """Get search suggestions and autocomplete."""
    try:
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 10)), 50)
        
        if not query or len(query) < 2:
            return jsonify({'suggestions': []})
        
        # Get suggestions from cache or generate
        cache_key = f"suggestions:{query}:{limit}"
        cached_suggestions = redis_manager.get(cache_key, prefix='search')
        if cached_suggestions:
            return jsonify(cached_suggestions)
        
        suggestions = []
        
        # Get suggestions from each entity type
        for entity_type in SEARCH_CONFIG['supported_entities']:
            if entity_type in services:
                try:
                    service = services[entity_type]
                    entity_suggestions = service.get_search_suggestions(query, limit)
                    suggestions.extend(entity_suggestions)
                except Exception as e:
                    logger.warning(f"Failed to get suggestions for {entity_type}", error=str(e))
        
        # Sort by relevance and limit
        suggestions = suggestions[:limit]
        
        # Cache suggestions
        redis_manager.set(cache_key, {'suggestions': suggestions}, ttl=3600, prefix='search')  # 1 hour
        
        return jsonify({'suggestions': suggestions})
        
    except Exception as e:
        logger.exception("Failed to get search suggestions", error=str(e))
        return jsonify({'error': 'Failed to get suggestions'}), 500


@search_v5.route('/<entity_type>', methods=['GET'])
def entity_search(entity_type: str):
    """Search within a specific entity type."""
    try:
        if entity_type not in SEARCH_CONFIG['supported_entities']:
            return jsonify({'error': 'Invalid entity type'}), 400
        
        # Parse search parameters
        params = parse_search_params(request.args)
        params['entities'] = [entity_type]  # Override to single entity
        
        # Build search query
        query = build_search_query(params)
        
        # Check cache
        cache_key = f"search:{entity_type}:{hash(str(query))}"
        cached_results = redis_manager.get(cache_key, prefix='search')
        if cached_results:
            return jsonify(cached_results)
        
        # Execute search
        results = execute_search(query)
        
        # Generate facets if requested
        if params.get('include_facets'):
            results['facets'] = generate_facets(results, query)
        
        # Cache results
        redis_manager.set(cache_key, results, ttl=300, prefix='search')  # 5 minutes
        
        return jsonify(results)
        
    except Exception as e:
        logger.exception("Entity search failed", entity_type=entity_type, error=str(e))
        return jsonify({'error': 'Search failed'}), 500


@search_v5.route('/popular', methods=['GET'])
def popular_searches():
    """Get popular search queries."""
    try:
        limit = min(int(request.args.get('limit', 10)), 50)
        days = min(int(request.args.get('days', 7)), 30)
        
        # Get popular searches from cache
        cache_key = f"popular_searches:{days}:{limit}"
        cached_popular = redis_manager.get(cache_key, prefix='search')
        if cached_popular:
            return jsonify(cached_popular)
        
        # Get popular searches from analytics
        popular_searches = get_popular_searches(days, limit)
        
        # Cache results
        redis_manager.set(cache_key, {'popular_searches': popular_searches}, ttl=3600, prefix='search')  # 1 hour
        
        return jsonify({'popular_searches': popular_searches})
        
    except Exception as e:
        logger.exception("Failed to get popular searches", error=str(e))
        return jsonify({'error': 'Failed to get popular searches'}), 500


@search_v5.route('/analytics', methods=['GET'])
def search_analytics():
    """Get search analytics and metrics."""
    try:
        days = min(int(request.args.get('days', 7)), 90)
        
        # Get analytics from cache
        cache_key = f"search_analytics:{days}"
        cached_analytics = redis_manager.get(cache_key, prefix='search')
        if cached_analytics:
            return jsonify(cached_analytics)
        
        # Get analytics data
        analytics = get_search_analytics(days)
        
        # Cache results
        redis_manager.set(cache_key, analytics, ttl=1800, prefix='search')  # 30 minutes
        
        return jsonify(analytics)
        
    except Exception as e:
        logger.exception("Failed to get search analytics", error=str(e))
        return jsonify({'error': 'Failed to get analytics'}), 500


# Helper functions (these would be implemented with actual database queries)
def get_popular_searches(days: int, limit: int) -> List[Dict[str, Any]]:
    """Get popular search queries."""
    # Placeholder implementation
    return []


def get_search_analytics(days: int) -> Dict[str, Any]:
    """Get search analytics data."""
    # Placeholder implementation
    return {
        'total_searches': 0,
        'unique_queries': 0,
        'top_queries': [],
        'search_volume_by_day': [],
        'entity_type_distribution': {},
        'average_results_per_query': 0
    }


# Error handlers
@search_v5.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Bad request'}), 400


@search_v5.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("Search API internal server error", error=str(error))
    return jsonify({'error': 'Search service unavailable'}), 500
