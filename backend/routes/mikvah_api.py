"""
Mikvah API endpoints for the JewGo application.
Provides RESTful API access to mikvah facility data with filtering and search capabilities.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import logging

def convert_params_for_sqlalchemy(query, params):
    """Convert %s placeholders to named parameters for SQLAlchemy"""
    named_params = {}
    param_count = 0
    for param in params:
        named_params[f'param_{param_count}'] = param
        param_count += 1

    # Replace %s with :param_N in the query
    named_query = query
    for i in range(len(params)):
        named_query = named_query.replace('%s', f':param_{i}', 1)

    return named_query, named_params
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
mikvah_bp = Blueprint('mikvah', __name__, url_prefix='/api/v4/mikvah')

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
    
    # Always filter for active mikvah facilities
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
    
    if filters.get('mikvah_type'):
        conditions.append("mikvah_type = %s")
        params.append(filters['mikvah_type'])
    
    if filters.get('mikvah_category'):
        conditions.append("mikvah_category = %s")
        params.append(filters['mikvah_category'])
    
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

@mikvah_bp.route('/', methods=['GET'])
def get_mikvah():
    """Get mikvah facilities with filtering and pagination."""
    from flask import current_app
    from sqlalchemy import text
    
    print("DEBUG: get_mikvah function called")
    try:
        # Get database manager from app context using v4 pattern
        deps = current_app.config.get("dependencies", {})
        db_manager = deps.get("get_db_manager_v4")()
        if not db_manager:
            return jsonify({'error': 'Database not available'}), 503
        
        # Ensure database connection is established
        db_manager.connect()
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
            'mikvah_type': request.args.get('mikvah_type'),
            'mikvah_category': request.args.get('mikvah_category'),
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
        
        # Get database manager from app context using v4 pattern
        from flask import current_app
        deps = current_app.config.get("dependencies", {})
        db_manager = deps.get("get_db_manager_v4")()
        if not db_manager:
            return jsonify({
                'success': False,
                'error': 'Database not available',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 503
        
        # Ensure database connection is established
        db_manager.connect()
        
        try:
            # Build WHERE clause
            where_clause, where_params = build_where_clause(filters)
            
            # Get total count
            count_query = f"""
                SELECT COUNT(*) as total 
                FROM mikvah 
                WHERE {where_clause}
            """
            
            # Execute count query using SQLAlchemy session
            with db_manager.connection_manager.get_session() as session:
                named_query, named_params = convert_params_for_sqlalchemy(count_query, where_params)
                count_result = session.execute(text(named_query), named_params).fetchone()
                total = count_result[0] if count_result else 0
            
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
            
            # Build order clause
            order_clause = build_order_clause(lat, lng, max_distance_mi)
            
            # Get mikvah facilities with pagination
            data_query = f"""
                SELECT 
                    id, name, description, address, city, state, zip_code, country,
                    phone_number, website, email, mikvah_type, mikvah_category,
                    business_hours, has_parking, has_disabled_access, has_heating,
                    has_air_conditioning, has_private_changing_rooms, has_amenities,
                    kosher_certification, kosher_category, is_cholov_yisroel, is_pas_yisroel,
                    has_attendant, has_private_sessions, has_group_sessions, has_educational_programs,
                    has_fees, fee_amount, fee_currency, accepts_credit_cards, accepts_cash,
                    rating, review_count, star_rating, google_rating,
                    image_url, logo_url, latitude, longitude,
                    is_active, is_verified, created_at, updated_at, tags,
                    admin_notes, specials, listing_type
                FROM mikvah 
                WHERE {where_clause}
                ORDER BY {order_clause}
                LIMIT %s OFFSET %s
            """
            
            where_params.extend([limit, offset])
            # Execute data query using SQLAlchemy session
            with db_manager.connection_manager.get_session() as session:
                named_query, named_params = convert_params_for_sqlalchemy(data_query, where_params)
                result = session.execute(text(named_query), named_params).fetchall()
                # Convert SQLAlchemy Row objects to dictionaries
                mikvah_facilities = [dict(row._mapping) for row in result]
            
            # Calculate distances if location is provided
            if lat is not None and lng is not None:
                for mikvah in mikvah_facilities:
                    if mikvah.get('latitude') and mikvah.get('longitude'):
                        distance = calculate_distance(
                            lat, lng, 
                            mikvah['latitude'], mikvah['longitude']
                        )
                        mikvah['distance_miles'] = round(distance, 2)
                        mikvah['distance'] = f"{round(distance, 1)} mi"
            
            # Calculate pagination info
            total_pages = math.ceil(total / limit) if total > 0 else 1
            has_more = (offset + limit) < total
            
            response_data = {
                'success': True,
                'data': {
                    'mikvah': mikvah_facilities,
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total': total,
                        'total_pages': total_pages,
                        'has_more': has_more,
                        'offset': offset
                    }
                },
                'message': f'Retrieved {len(mikvah_facilities)} mikvah facilities',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Successfully retrieved {len(mikvah_facilities)} mikvah facilities")
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(f"Error in get_mikvah: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Internal server error',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 500
            
    except TimeoutError:
        logger.error("Database query timed out")
        return jsonify({
            'success': False,
            'error': 'Request timed out',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 408
        
    except Exception as e:
        logger.error(f"Error in get_mikvah: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@mikvah_bp.route('/<int:mikvah_id>', methods=['GET'])
def get_mikvah_facility(mikvah_id: int):
    """Get a specific mikvah facility by ID."""
    try:
        # Get database manager from app context using v4 pattern
        from flask import current_app
        deps = current_app.config.get("dependencies", {})
        db_manager = deps.get("get_db_manager_v4")()
        if not db_manager:
            return jsonify({
                'success': False,
                'error': 'Database not available',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 503
        
        # Ensure database connection is established
        db_manager.connect()
        
        try:
            # Get mikvah facility details
            mikvah_query = """
                SELECT 
                    id, name, description, address, city, state, zip_code, country,
                    phone_number, website, email, mikvah_type, mikvah_category,
                    business_hours, requires_appointment, appointment_phone, appointment_website,
                    walk_in_available, advance_booking_days, has_changing_rooms,
                    has_shower_facilities, has_towels_provided, has_soap_provided,
                    has_hair_dryers, has_private_entrance, has_disabled_access,
                    has_parking, rabbinical_supervision, kosher_certification,
                    community_affiliation, religious_authority, fee_amount, fee_currency,
                    accepts_credit_cards, accepts_cash, accepts_checks,
                    is_active, is_verified, created_at, updated_at, tags,
                    rating, review_count, star_rating, google_rating,
                    image_url, logo_url, latitude, longitude
                FROM mikvah 
                WHERE id = %s AND is_active = %s
            """
            
            with db_manager.connection_manager.get_session() as session:
                mikvah_result = session.execute(text(mikvah_query), [mikvah_id, True]).fetchall()
                mikvah = dict(mikvah_result[0]._mapping) if mikvah_result else None
            
            if not mikvah:
                return jsonify({
                    'success': False,
                    'error': 'Mikvah facility not found',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }), 404
            
            mikvah = mikvah_result[0]
            
            response_data = {
                'success': True,
                'data': {
                    'mikvah': mikvah
                },
                'message': 'Mikvah facility retrieved successfully',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Successfully retrieved mikvah facility {mikvah_id}")
            return jsonify(response_data)
            
        finally:
            db_manager.disconnect()
            
    except Exception as e:
        logger.error(f"Error in get_mikvah_facility: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@mikvah_bp.route('/filter-options', methods=['GET'])
def get_filter_options():
    """Get available filter options for mikvah facilities."""
    try:
        # Get database manager from app context using v4 pattern
        from flask import current_app
        deps = current_app.config.get("dependencies", {})
        db_manager = deps.get("get_db_manager_v4")()
        if not db_manager:
            return jsonify({
                'success': False,
                'error': 'Database not available',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 503
        
        # Ensure database connection is established
        db_manager.connect()
        
        try:
            # Get unique values for filter options
            filter_queries = {
                'cities': "SELECT DISTINCT city FROM mikvah WHERE is_active = %s AND city IS NOT NULL ORDER BY city",
                'states': "SELECT DISTINCT state FROM mikvah WHERE is_active = %s AND state IS NOT NULL ORDER BY state",
                'mikvah_types': "SELECT DISTINCT mikvah_type FROM mikvah WHERE is_active = %s AND mikvah_type IS NOT NULL ORDER BY mikvah_type",
                'mikvah_categories': "SELECT DISTINCT mikvah_category FROM mikvah WHERE is_active = %s AND mikvah_category IS NOT NULL ORDER BY mikvah_category",
                'kosher_agencies': "SELECT DISTINCT kosher_certification FROM mikvah WHERE is_active = %s AND kosher_certification IS NOT NULL ORDER BY kosher_certification"
            }
            
            filter_options = {}
            
            with db_manager.connection_manager.get_session() as session:
                for key, query in filter_queries.items():
                    result = session.execute(text(query), [True]).fetchall()
                    filter_options[key] = [row[0] for row in result if row[0]]
            
            # Add boolean filter options
            filter_options['boolean_filters'] = {
                'isVerified': 'Verified Facilities',
                'requiresAppointment': 'Requires Appointment',
                'walkInAvailable': 'Walk-in Available',
                'hasChangingRooms': 'Has Changing Rooms',
                'hasShowerFacilities': 'Has Shower Facilities',
                'hasTowelsProvided': 'Towels Provided',
                'hasSoapProvided': 'Soap Provided',
                'hasHairDryers': 'Has Hair Dryers',
                'hasPrivateEntrance': 'Private Entrance',
                'hasDisabledAccess': 'Disabled Access',
                'hasParking': 'Has Parking',
                'acceptsCreditCards': 'Accepts Credit Cards',
                'acceptsCash': 'Accepts Cash',
                'acceptsChecks': 'Accepts Checks'
            }
            
            response_data = {
                'success': True,
                'data': filter_options,
                'message': 'Filter options retrieved successfully',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info("Successfully retrieved mikvah filter options")
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
