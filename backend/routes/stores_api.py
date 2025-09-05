"""
Stores API endpoints for the JewGo application.
Provides RESTful API access to store data with filtering and search capabilities.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import logging
from typing import Optional, Dict, Any, List
import math

# Import database manager
try:
    from database.database_manager_v4 import DatabaseManager
except ImportError:
    from database.database_manager_v3 import EnhancedDatabaseManager as DatabaseManager

# Import utilities
try:
    from utils.google_places_validator import GooglePlacesValidator
except ImportError:
    # Fallback if validator not available
    class GooglePlacesValidator:
        @staticmethod
        def validate_coordinates(lat: float, lng: float) -> bool:
            return -90 <= lat <= 90 and -180 <= lng <= 180

# Setup logging
logger = logging.getLogger(__name__)

# Create blueprint
stores_bp = Blueprint('stores', __name__, url_prefix='/api/v4/stores')

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula."""
    R = 3959  # Earth's radius in miles
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (math.sin(delta_lat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def build_where_clause(filters: Dict[str, Any]) -> tuple[str, List[Any]]:
    """Build WHERE clause and parameters for SQL query."""
    conditions = []
    params = []
    
    # Always filter for active stores
    conditions.append("is_active = %s")
    params.append(True)
    
    if filters.get('search'):
        search_term = f"%{filters['search']}%"
        conditions.append("(name ILIKE %s OR description ILIKE %s OR address ILIKE %s)")
        params.extend([search_term, search_term, search_term])
    
    if filters.get('city'):
        conditions.append("city ILIKE %s")
        params.append(f"%{filters['city']}%")
    
    if filters.get('state'):
        conditions.append("state ILIKE %s")
        params.append(f"%{filters['state']}%")
    
    if filters.get('store_type'):
        conditions.append("store_type = %s")
        params.append(filters['store_type'])
    
    if filters.get('store_category'):
        conditions.append("store_category = %s")
        params.append(filters['store_category'])
    
    if filters.get('kosher_agency'):
        conditions.append("kosher_certification ILIKE %s")
        params.append(f"%{filters['kosher_agency']}%")
    
    if filters.get('is_verified') is not None:
        conditions.append("is_verified = %s")
        params.append(filters['is_verified'])
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    return where_clause, params

def build_order_clause(lat: Optional[float], lng: Optional[float], 
                      max_distance_mi: Optional[float]) -> str:
    """Build ORDER BY clause for SQL query."""
    if lat is not None and lng is not None and max_distance_mi is not None:
        # Order by distance when location is provided
        return f"""
            (3959 * acos(
                cos(radians({lat})) * 
                cos(radians(latitude)) * 
                cos(radians(longitude) - radians({lng})) + 
                sin(radians({lat})) * 
                sin(radians(latitude))
            )) ASC
        """
    else:
        # Default ordering by name
        return "name ASC"

@stores_bp.route('/', methods=['GET'])
def get_stores():
    """Get stores with filtering and pagination."""
    import signal
    
    def timeout_handler(signum, frame):
        raise TimeoutError("Database query timed out")
    
    # Set a 10-second timeout for the entire request
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(10)
    
    try:
        # Parse query parameters - support both offset and page-based pagination
        limit = min(int(request.args.get('limit', 20)), 100)  # Max 100 per page
        
        # Check if offset is provided (for infinite scroll) or fall back to page-based
        offset_param = request.args.get('offset')
        page_param = request.args.get('page', 1)
        
        if offset_param is not None:
            # Use offset-based pagination (infinite scroll)
            offset = int(offset_param)
            page = (offset // limit) + 1
        else:
            # Use page-based pagination (traditional)
            page = int(page_param)
            offset = (page - 1) * limit
        
        # Parse filters
        filters = {
            'search': request.args.get('search'),
            'city': request.args.get('city'),
            'state': request.args.get('state'),
            'store_type': request.args.get('store_type'),
            'store_category': request.args.get('store_category'),
            'kosher_agency': request.args.get('kosher_agency'),
            'is_verified': request.args.get('is_verified'),
        }
        
        # Parse location parameters
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        max_distance_mi = request.args.get('maxDistanceMi', type=float)
        
        # Validate coordinates if provided
        if lat is not None and lng is not None:
            if not GooglePlacesValidator.validate_coordinates(lat, lng):
                return jsonify({
                    'success': False,
                    'error': 'Invalid coordinates provided',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }), 400
        
        # Get database connection
        db_manager = DatabaseManager()
        
        # Connect to database
        if not db_manager.connect():
            return jsonify({
                'success': False,
                'error': 'Unable to connect to database',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 500
        
        try:
            # Build WHERE clause
            where_clause, where_params = build_where_clause(filters)
            
            # Get total count
            count_query = f"""
                SELECT COUNT(*) as total 
                FROM stores 
                WHERE {where_clause}
            """
            
            count_result = db_manager.execute_query(count_query, where_params)
            total = count_result[0]['total'] if count_result else 0
            
            # Apply distance filter if location is provided using optimized Haversine
            if lat is not None and lng is not None and max_distance_mi is not None:
                distance_filter = """
                    AND (
                        3959 * acos(
                            cos(radians(%s)) * 
                            cos(radians(latitude)) * 
                            cos(radians(longitude) - radians(%s)) + 
                            sin(radians(%s)) * 
                            sin(radians(latitude))
                        )
                    ) <= %s
                """
                where_clause += distance_filter
                where_params.extend([lat, lng, lat, max_distance_mi])
            
            # Get stores with pagination
            data_query = f"""
                SELECT 
                    id, name, description, address, city, state, zip_code, country,
                    phone_number, website, email, store_type, store_category,
                    business_hours, has_parking, has_delivery, has_pickup,
                    accepts_credit_cards, accepts_cash, kosher_certification,
                    kosher_category, is_cholov_yisroel, is_pas_yisroel,
                    is_active, is_verified, created_at, updated_at, tags,
                    rating, review_count, star_rating, google_rating,
                    image_url, logo_url, latitude, longitude
                FROM stores 
                WHERE {where_clause}
                ORDER BY {build_order_clause(lat, lng, max_distance_mi)}
                LIMIT %s OFFSET %s
            """
            
            where_params.extend([limit, offset])
            stores = db_manager.execute_query(data_query, where_params)
            
            # Calculate distances if location is provided
            if lat is not None and lng is not None:
                for store in stores:
                    if store.get('latitude') and store.get('longitude'):
                        distance = calculate_distance(
                            lat, lng, 
                            store['latitude'], store['longitude']
                        )
                        store['distance_miles'] = round(distance, 2)
                        store['distance'] = f"{round(distance, 1)} mi"
            
            # Calculate pagination info
            total_pages = math.ceil(total / limit) if total > 0 else 1
            has_more = (offset + limit) < total
            
            response_data = {
                'success': True,
                'data': {
                    'stores': stores,
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total': total,
                        'total_pages': total_pages,
                        'has_more': has_more,
                        'offset': offset
                    }
                },
                'message': f'Retrieved {len(stores)} stores',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Successfully retrieved {len(stores)} stores")
            return jsonify(response_data)
            
        finally:
            db_manager.disconnect()
            
    except TimeoutError:
        logger.error("Database query timed out")
        return jsonify({
            'success': False,
            'error': 'Request timed out',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 408
        
    except Exception as e:
        logger.error(f"Error in get_stores: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@stores_bp.route('/<int:store_id>', methods=['GET'])
def get_store(store_id: int):
    """Get a specific store by ID."""
    try:
        # Get database connection
        db_manager = DatabaseManager()
        
        # Connect to database
        if not db_manager.connect():
            return jsonify({
                'success': False,
                'error': 'Unable to connect to database',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 500
        
        try:
            # Get store details
            store_query = """
                SELECT 
                    id, name, description, address, city, state, zip_code, country,
                    phone_number, website, email, store_type, store_category,
                    business_hours, has_parking, has_delivery, has_pickup,
                    accepts_credit_cards, accepts_cash, kosher_certification,
                    kosher_category, is_cholov_yisroel, is_pas_yisroel,
                    is_active, is_verified, created_at, updated_at, tags,
                    rating, review_count, star_rating, google_rating,
                    image_url, logo_url, latitude, longitude
                FROM stores 
                WHERE id = %s AND is_active = %s
            """
            
            store_result = db_manager.execute_query(store_query, [store_id, True])
            
            if not store_result:
                return jsonify({
                    'success': False,
                    'error': 'Store not found',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }), 404
            
            store = store_result[0]
            
            response_data = {
                'success': True,
                'data': {
                    'store': store
                },
                'message': 'Store retrieved successfully',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Successfully retrieved store {store_id}")
            return jsonify(response_data)
            
        finally:
            db_manager.disconnect()
            
    except Exception as e:
        logger.error(f"Error in get_store: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@stores_bp.route('/filter-options', methods=['GET'])
def get_filter_options():
    """Get available filter options for stores."""
    try:
        # Get database connection
        db_manager = DatabaseManager()
        
        # Connect to database
        if not db_manager.connect():
            return jsonify({
                'success': False,
                'error': 'Unable to connect to database',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 500
        
        try:
            # Get unique values for filter options
            filter_queries = {
                'cities': "SELECT DISTINCT city FROM stores WHERE is_active = %s AND city IS NOT NULL ORDER BY city",
                'states': "SELECT DISTINCT state FROM stores WHERE is_active = %s AND state IS NOT NULL ORDER BY state",
                'store_types': "SELECT DISTINCT store_type FROM stores WHERE is_active = %s AND store_type IS NOT NULL ORDER BY store_type",
                'store_categories': "SELECT DISTINCT store_category FROM stores WHERE is_active = %s AND store_category IS NOT NULL ORDER BY store_category",
                'kosher_agencies': "SELECT DISTINCT kosher_certification FROM stores WHERE is_active = %s AND kosher_certification IS NOT NULL ORDER BY kosher_certification"
            }
            
            filter_options = {}
            
            for key, query in filter_queries.items():
                result = db_manager.execute_query(query, [True])
                filter_options[key] = [row[key.replace('_', '')] for row in result]
            
            # Add boolean filter options
            filter_options['boolean_filters'] = {
                'isVerified': 'Verified Stores',
                'hasParking': 'Has Parking',
                'hasDelivery': 'Has Delivery',
                'hasPickup': 'Has Pickup',
                'acceptsCreditCards': 'Accepts Credit Cards',
                'acceptsCash': 'Accepts Cash',
                'isCholovYisroel': 'Cholov Yisroel',
                'isPasYisroel': 'Pas Yisroel'
            }
            
            response_data = {
                'success': True,
                'data': filter_options,
                'message': 'Filter options retrieved successfully',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info("Successfully retrieved store filter options")
            return jsonify(response_data)
            
        finally:
            db_manager.disconnect()
            
    except Exception as e:
        logger.error(f"Error in get_filter_options: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500
