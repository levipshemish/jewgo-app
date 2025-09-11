#!/usr/bin/env python3
"""
V5 Search API routes using BlueprintFactoryV5.

Provides unified search capabilities across all entity types with advanced filtering,
geospatial search, full-text search, and result ranking.
"""

from flask import request, jsonify, g
from typing import Dict, Any, List, Optional
import re

from utils.blueprint_factory_v5 import BlueprintFactoryV5
from database.repositories.entity_repository_v5 import EntityRepositoryV5
from middleware.auth_v5 import require_permission_v5, optional_auth_v5
from utils.cursor_v5 import CursorV5Manager, decode_cursor_v5, create_next_cursor_v5
from utils.etag_v5 import ETagV5Manager, generate_collection_etag_v5, generate_entity_etag_v5
from cache.etag_cache import get_etag_cache
from utils.logging_config import get_logger
from utils.feature_flags_v5 import feature_flags_v5

logger = get_logger(__name__)

# Initialize components
from backend.database.connection_manager import DatabaseConnectionManager
entity_repository = EntityRepositoryV5(DatabaseConnectionManager())
etag_manager = ETagV5Manager()

# Create blueprint using factory
search_bp = BlueprintFactoryV5.create_blueprint(
    'search_v5', __name__, '/api/v5/search'
)

# Search configuration
SEARCH_CONFIG = {
    'max_query_length': 200,
    'min_query_length': 2,
    'default_limit': 20,
    'max_limit': 100,
    'supported_entities': ['restaurants', 'synagogues', 'mikvahs', 'stores'],
    'search_weights': {
        'name': 1.0,
        'description': 0.8,
        'category': 0.6,
        'address': 0.4,
        'tags': 0.3
    }
}


@search_bp.route('/', methods=['GET'])
def unified_search():
    """Unified search across all entity types."""
    try:
        # Check feature flag
        user_id = getattr(g, 'user_id', None)
        user_roles = [role.get('role') for role in getattr(g, 'user_roles', []) if role.get('role')]
        
        if not feature_flags_v5.is_enabled('search_api_v5', user_id=user_id, user_roles=user_roles):
            return jsonify({
                'success': False,
                'error': 'Search API v5 is not enabled for your account'
            }), 503
        
        # Get search parameters
        query = request.args.get('q', '').strip()
        entity_types = request.args.getlist('types') or SEARCH_CONFIG['supported_entities']
        cursor = request.args.get('cursor')
        limit = min(int(request.args.get('limit', SEARCH_CONFIG['default_limit'])), SEARCH_CONFIG['max_limit'])

        # Validate query
        if not query:
            return jsonify({
                'success': False,
                'error': 'Search query (q) parameter is required'
            }), 400

        if len(query) < SEARCH_CONFIG['min_query_length']:
            return jsonify({
                'success': False,
                'error': f'Search query must be at least {SEARCH_CONFIG["min_query_length"]} characters'
            }), 400

        if len(query) > SEARCH_CONFIG['max_query_length']:
            return jsonify({
                'success': False,
                'error': f'Search query must not exceed {SEARCH_CONFIG["max_query_length"]} characters'
            }), 400

        # Validate entity types
        invalid_types = [t for t in entity_types if t not in SEARCH_CONFIG['supported_entities']]
        if invalid_types:
            return jsonify({
                'success': False,
                'error': f'Invalid entity types: {invalid_types}. Supported: {SEARCH_CONFIG["supported_entities"]}'
            }), 400

        # Parse additional filters
        filters = _parse_search_filters(request.args)

        # Generate ETag for search results
        etag = generate_collection_etag_v5(
            entity_type='search',
            filters={'query': query, 'entity_types': entity_types, **filters},
            sort_key='relevance',
            page_size=limit,
            cursor_token=cursor
        )
        
        # Check if-none-match header
        if_none_match = request.headers.get('If-None-Match')
        if if_none_match and if_none_match == etag:
            return '', 304

        # Parse cursor
        parsed_cursor = None
        if cursor:
            try:
                parsed_cursor = decode_cursor_v5(cursor)
            except Exception as e:
                logger.warning(f"Invalid search cursor: {e}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid cursor'
                }), 400

        # Perform search across entity types
        search_results = []
        total_count = 0
        next_cursor = None

        for entity_type in entity_types:
            try:
                # Search in this entity type
                entities, entity_next_cursor, _ = entity_repository.search_entities(
                    search_query=query,
                    entity_types=[entity_type],
                    filters=filters,
                    cursor=parsed_cursor,
                    limit=limit
                )

                # Add entity type to results
                for entity in entities:
                    entity['_entity_type'] = entity_type
                    entity['_relevance_score'] = _calculate_relevance_score(entity, query)

                search_results.extend(entities)
                total_count += len(entities)

                # Use the first non-None cursor as next cursor
                if entity_next_cursor and not next_cursor:
                    next_cursor = entity_next_cursor

            except Exception as e:
                logger.error(f"Search error for {entity_type}: {e}")
                # Continue searching other types

        # Sort results by relevance score
        search_results.sort(key=lambda x: x.get('_relevance_score', 0), reverse=True)

        # Apply limit to combined results
        if len(search_results) > limit:
            search_results = search_results[:limit]

        # Group results by entity type
        grouped_results = {}
        for result in search_results:
            entity_type = result.pop('_entity_type')
            relevance_score = result.pop('_relevance_score')
            
            if entity_type not in grouped_results:
                grouped_results[entity_type] = []
            
            grouped_results[entity_type].append({
                **result,
                'relevance_score': relevance_score
            })

        # Format response
        response_data = {
            'success': True,
            'data': {
                'query': query,
                'results': {
                    'unified': search_results,
                    'by_type': grouped_results
                },
                'pagination': {
                    'cursor': cursor,
                    'next_cursor': next_cursor,
                    'limit': limit,
                    'has_more': next_cursor is not None
                },
                'metadata': {
                    'total_results': total_count,
                    'searched_types': entity_types,
                    'search_time_ms': 0,  # Would be calculated in real implementation
                    'filters_applied': filters
                }
            },
            'timestamp': etag_manager._get_current_timestamp()
        }

        # Create response with ETag
        response = jsonify(response_data)
        response.headers['ETag'] = etag
        response.headers['Cache-Control'] = 'public, max-age=300'
        
        return response

    except Exception as e:
        logger.error(f"Unified search error: {e}")
        return jsonify({
            'success': False,
            'error': 'Search service unavailable'
        }), 503


@search_bp.route('/<entity_type>', methods=['GET'])
def search_by_type(entity_type: str):
    """Search within a specific entity type."""
    try:
        # Validate entity type
        if entity_type not in SEARCH_CONFIG['supported_entities']:
            return jsonify({
                'success': False,
                'error': f'Invalid entity type. Supported: {SEARCH_CONFIG["supported_entities"]}'
            }), 400

        # Get search parameters
        query = request.args.get('q', '').strip()
        cursor = request.args.get('cursor')
        limit = min(int(request.args.get('limit', SEARCH_CONFIG['default_limit'])), SEARCH_CONFIG['max_limit'])

        # Validate query
        if not query:
            return jsonify({
                'success': False,
                'error': 'Search query (q) parameter is required'
            }), 400

        # Parse filters
        filters = _parse_search_filters(request.args)

        # Generate ETag for caching
        etag = generate_collection_etag_v5(
            entity_type=f'search_{entity_type}',
            filters={'query': query, **filters},
            sort_key='relevance',
            page_size=limit,
            cursor_token=cursor
        )
        
        # Check if-none-match header
        if_none_match = request.headers.get('If-None-Match')
        if if_none_match and if_none_match == etag:
            return '', 304

        # Parse cursor
        parsed_cursor = None
        if cursor:
            try:
                parsed_cursor = decode_cursor_v5(cursor)
            except Exception as e:
                logger.warning(f"Invalid search cursor: {e}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid cursor'
                }), 400

        # Perform search
        entities, next_cursor, prev_cursor = entity_repository.search_entities(
            search_query=query,
            entity_types=[entity_type],
            filters=filters,
            cursor=parsed_cursor,
            limit=limit
        )

        # Add relevance scores
        for entity in entities:
            entity['relevance_score'] = _calculate_relevance_score(entity, query)

        # Sort by relevance
        entities.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)

        # Format response
        response_data = {
            'success': True,
            'data': {
                'query': query,
                'entity_type': entity_type,
                'results': entities,
                'pagination': {
                    'cursor': cursor,
                    'next_cursor': next_cursor,
                    'prev_cursor': prev_cursor,
                    'limit': limit,
                    'has_more': next_cursor is not None
                },
                'metadata': {
                    'total_results': len(entities),
                    'filters_applied': filters,
                    'search_type': 'entity_specific'
                }
            },
            'timestamp': etag_manager._get_current_timestamp()
        }

        # Create response with ETag
        response = jsonify(response_data)
        response.headers['ETag'] = etag
        response.headers['Cache-Control'] = 'public, max-age=300'
        
        return response

    except Exception as e:
        logger.error(f"Entity search error for {entity_type}: {e}")
        return jsonify({
            'success': False,
            'error': 'Search service unavailable'
        }), 503


@search_bp.route('/suggest', methods=['GET'])
def search_suggestions():
    """Get search suggestions and autocomplete."""
    try:
        query = request.args.get('q', '').strip()
        entity_type = request.args.get('type')
        limit = min(int(request.args.get('limit', 10)), 20)

        if not query or len(query) < 2:
            return jsonify({
                'success': True,
                'data': {
                    'suggestions': [],
                    'query': query,
                    'message': 'Query too short for suggestions'
                }
            })

        # Get suggestions
        suggestions = _get_search_suggestions(query, entity_type, limit)

        return jsonify({
            'success': True,
            'data': {
                'query': query,
                'suggestions': suggestions,
                'entity_type': entity_type,
                'limit': limit
            },
            'timestamp': etag_manager._get_current_timestamp()
        })

    except Exception as e:
        logger.error(f"Search suggestions error: {e}")
        return jsonify({
            'success': False,
            'error': 'Suggestions service unavailable'
        }), 503


@search_bp.route('/filters', methods=['GET'])
def get_search_filters():
    """Get available search filters for each entity type."""
    try:
        entity_type = request.args.get('type')
        
        if entity_type and entity_type not in SEARCH_CONFIG['supported_entities']:
            return jsonify({
                'success': False,
                'error': f'Invalid entity type. Supported: {SEARCH_CONFIG["supported_entities"]}'
            }), 400

        # Get available filters
        filters = _get_available_filters(entity_type)

        return jsonify({
            'success': True,
            'data': {
                'filters': filters,
                'entity_type': entity_type,
                'supported_entities': SEARCH_CONFIG['supported_entities']
            },
            'timestamp': etag_manager._get_current_timestamp()
        })

    except Exception as e:
        logger.error(f"Search filters error: {e}")
        return jsonify({
            'success': False,
            'error': 'Filters service unavailable'
        }), 503


def _parse_search_filters(args) -> Dict[str, Any]:
    """Parse search filters from request arguments."""
    filters = {}
    
    # Location filters
    lat = args.get('latitude')
    lng = args.get('longitude')
    radius = args.get('radius', '10')
    
    if lat and lng:
        try:
            filters['latitude'] = float(lat)
            filters['longitude'] = float(lng)
            filters['radius'] = float(radius)
        except ValueError:
            pass  # Skip invalid location data

    # Category/type filters
    category = args.get('category')
    if category:
        filters['category'] = category

    kosher_cert = args.get('kosher_cert')
    if kosher_cert:
        filters['kosher_cert'] = kosher_cert

    # Rating filter
    min_rating = args.get('min_rating')
    if min_rating:
        try:
            filters['min_rating'] = float(min_rating)
        except ValueError:
            pass

    # Status filter
    status = args.get('status')
    if status:
        filters['status'] = status

    # Price range filter
    price_min = args.get('price_min')
    price_max = args.get('price_max')
    if price_min or price_max:
        price_filter = {}
        if price_min:
            try:
                price_filter['min'] = float(price_min)
            except ValueError:
                pass
        if price_max:
            try:
                price_filter['max'] = float(price_max)
            except ValueError:
                pass
        if price_filter:
            filters['price_range'] = price_filter

    return filters


def _calculate_relevance_score(entity: Dict[str, Any], query: str) -> float:
    """Calculate relevance score for search result."""
    try:
        score = 0.0
        query_lower = query.lower()
        query_terms = re.findall(r'\w+', query_lower)

        # Check each searchable field
        for field, weight in SEARCH_CONFIG['search_weights'].items():
            field_value = str(entity.get(field, '')).lower()
            
            if not field_value:
                continue

            # Exact match bonus
            if query_lower in field_value:
                score += weight * 2.0

            # Term matching
            field_terms = re.findall(r'\w+', field_value)
            matching_terms = len(set(query_terms) & set(field_terms))
            if matching_terms > 0:
                score += weight * (matching_terms / len(query_terms))

            # Prefix matching
            for term in query_terms:
                if any(field_term.startswith(term) for field_term in field_terms):
                    score += weight * 0.5

        # Boost for entities with higher ratings
        rating = entity.get('rating') or entity.get('google_rating')
        if rating and isinstance(rating, (int, float)):
            score += (rating / 5.0) * 0.1

        # Boost for entities with more reviews
        review_count = entity.get('review_count') or entity.get('google_reviews_count', 0)
        if review_count and isinstance(review_count, int):
            score += min(review_count / 100.0, 0.2)

        return round(score, 3)

    except Exception as e:
        logger.warning(f"Error calculating relevance score: {e}")
        return 0.0


def _get_search_suggestions(query: str, entity_type: Optional[str], limit: int) -> List[Dict[str, Any]]:
    """Get search suggestions based on query."""
    try:
        suggestions = []
        
        # This would typically query a suggestions/autocomplete index
        # For now, return some basic suggestions
        
        # Popular search terms (would come from analytics)
        popular_terms = [
            'kosher restaurant', 'orthodox synagogue', 'mikvah', 'kosher store',
            'glatt kosher', 'dairy restaurant', 'meat restaurant', 'pareve'
        ]
        
        # Filter suggestions based on query
        for term in popular_terms:
            if query.lower() in term.lower() and len(suggestions) < limit:
                suggestions.append({
                    'text': term,
                    'type': 'popular',
                    'entity_types': ['restaurants', 'stores'] if 'kosher' in term else ['synagogues']
                })
        
        return suggestions

    except Exception as e:
        logger.warning(f"Error getting search suggestions: {e}")
        return []


def _get_available_filters(entity_type: Optional[str]) -> Dict[str, Any]:
    """Get available search filters."""
    try:
        base_filters = {
            'location': {
                'type': 'geospatial',
                'parameters': ['lat', 'lng', 'radius'],
                'description': 'Filter by geographic location'
            },
            'status': {
                'type': 'select',
                'options': ['active', 'pending', 'closed'],
                'description': 'Filter by entity status'
            }
        }

        if not entity_type or entity_type == 'restaurants':
            base_filters.update({
                'kosher_cert': {
                    'type': 'select',
                    'options': ['kosher', 'glatt_kosher', 'kosher_style', 'not_kosher'],
                    'description': 'Filter by kosher certification level'
                },
                'min_rating': {
                    'type': 'range',
                    'min': 1,
                    'max': 5,
                    'description': 'Minimum rating filter'
                },
                'price_range': {
                    'type': 'range',
                    'description': 'Filter by price range'
                }
            })

        if not entity_type or entity_type == 'synagogues':
            base_filters.update({
                'denomination': {
                    'type': 'select',
                    'options': ['orthodox', 'conservative', 'reform', 'reconstructionist'],
                    'description': 'Filter by Jewish denomination'
                }
            })

        return base_filters

    except Exception as e:
        logger.warning(f"Error getting available filters: {e}")
        return {}


# Health check endpoint
@search_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for search API."""
    try:
        # Test repository connection
        health_status = entity_repository.health_check()
        
        return jsonify({
            'success': True,
            'service': 'search_api_v5',
            'status': 'healthy',
            'repository_status': health_status,
            'search_config': {
                'supported_entities': SEARCH_CONFIG['supported_entities'],
                'max_query_length': SEARCH_CONFIG['max_query_length'],
                'default_limit': SEARCH_CONFIG['default_limit']
            },
            'timestamp': etag_manager._get_current_timestamp()
        })
    except Exception as e:
        logger.error(f"Search API health check failed: {e}")
        return jsonify({
            'success': False,
            'service': 'search_api_v5',
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': etag_manager._get_current_timestamp()
        }), 503


# Export blueprint for app factory
__all__ = ['search_bp']