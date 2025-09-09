"""
Unified Search API endpoints for the JewGo application.
Provides a single endpoint for searching across restaurants, synagogues, and mikvahs.
"""

from flask import Blueprint, request, jsonify
import logging
from typing import Dict, Any, Optional
from utils.unified_search_service import UnifiedSearchService, SearchFilters, SearchType
from database.database_manager_v4 import DatabaseManager
from utils.api_caching import cache_search_results

# Setup logging
logger = logging.getLogger(__name__)

# Create blueprint
unified_search_bp = Blueprint('unified_search', __name__, url_prefix='/api/v4/search')

# Initialize database manager
db_manager = DatabaseManager()

@unified_search_bp.route('/', methods=['GET'])
@cache_search_results(ttl_seconds=180)  # Cache for 3 minutes
def unified_search():
    """
    Unified search endpoint that searches across all entity types.
    
    Query Parameters:
    - q: Search query string
    - type: Entity type to search (restaurants, synagogues, mikvahs, all)
    - lat: Latitude for location-based search
    - lng: Longitude for location-based search
    - radius: Search radius in miles (default: 50)
    - limit: Maximum number of results (default: 20)
    - offset: Offset for pagination (default: 0)
    - sort: Sort order (distance, rating, name, created_at)
    """
    try:
        # Parse query parameters
        query = request.args.get('q', '').strip()
        entity_type = request.args.get('type', 'all').lower()
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', type=float, default=50.0)
        limit = min(request.args.get('limit', type=int, default=20), 100)  # Cap at 100
        offset = request.args.get('offset', type=int, default=0)
        sort = request.args.get('sort', 'distance' if lat and lng else 'rating')
        
        # Validate coordinates if provided
        if lat is not None and lng is not None:
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                return jsonify({'error': 'Invalid coordinates'}), 400
        
        # Create search filters
        filters = SearchFilters(
            query=query,
            entity_type=entity_type,
            lat=lat,
            lng=lng,
            radius=radius,
            limit=limit,
            offset=offset,
            sort=sort
        )
        
        # Initialize search service
        with db_manager.connection_manager.session_scope() as session:
            search_service = UnifiedSearchService(session)
            
            # Perform search
            results = search_service.search(filters)
            
            # Format response
            response_data = {
                'success': True,
                'query': query,
                'filters': {
                    'type': entity_type,
                    'lat': lat,
                    'lng': lng,
                    'radius': radius,
                    'sort': sort
                },
                'pagination': {
                    'limit': limit,
                    'offset': offset,
                    'total_results': results.get('total_results', 0),
                    'has_more': results.get('has_more', False)
                },
                'results': results.get('results', []),
                'search_time_ms': results.get('search_time_ms', 0)
            }
            
            return jsonify(response_data)
            
    except Exception as e:
        logger.error(f"Error in unified search: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@unified_search_bp.route('/suggestions', methods=['GET'])
def search_suggestions():
    """
    Get search suggestions based on partial query.
    
    Query Parameters:
    - q: Partial search query
    - limit: Maximum number of suggestions (default: 10)
    """
    try:
        query = request.args.get('q', '').strip()
        limit = min(request.args.get('limit', type=int, default=10), 50)  # Cap at 50
        
        if not query or len(query) < 2:
            return jsonify({
                'success': True,
                'suggestions': []
            })
        
        # Initialize search service
        with db_manager.connection_manager.session_scope() as session:
            search_service = UnifiedSearchService(session)
            
            # Get suggestions
            suggestions = search_service.get_suggestions(query, limit)
            
            return jsonify({
                'success': True,
                'query': query,
                'suggestions': suggestions
            })
            
    except Exception as e:
        logger.error(f"Error getting search suggestions: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@unified_search_bp.route('/stats', methods=['GET'])
def search_stats():
    """
    Get search statistics and performance metrics.
    """
    try:
        with db_manager.connection_manager.session_scope() as session:
            search_service = UnifiedSearchService(session)
            stats = search_service.get_search_stats()
            
            return jsonify({
                'success': True,
                'stats': stats
            })
            
    except Exception as e:
        logger.error(f"Error getting search stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
