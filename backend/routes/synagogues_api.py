"""
Synagogues API endpoints for the JewGo application.
Provides RESTful API access to synagogue data with filtering and search capabilities.
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
synagogues_bp = Blueprint('synagogues', __name__, url_prefix='/api/v4/synagogues')

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
    param_count = 0
    
    # Base condition - only show active and verified synagogues
    conditions.append("is_active = true")
    
    # Search filter
    if filters.get('search'):
        search_term = f"%{filters['search']}%"
        conditions.append("(name ILIKE %s OR city ILIKE %s OR description ILIKE %s)")
        params.extend([search_term, search_term, search_term])
        param_count += 3
    
    # City filter
    if filters.get('city'):
        conditions.append("city ILIKE %s")
        params.append(f"%{filters['city']}%")
        param_count += 1
    
    # State filter
    if filters.get('state'):
        conditions.append("state = %s")
        params.append(filters['state'])
        param_count += 1
    
    # Denomination filter
    if filters.get('denomination'):
        conditions.append("denomination = %s")
        params.append(filters['denomination'])
        param_count += 1
    
    # Shul type filter
    if filters.get('shulType'):
        conditions.append("shul_type = %s")
        params.append(filters['shulType'])
        param_count += 1
    
    # Daily minyan filter
    if filters.get('hasDailyMinyan') == 'true':
        conditions.append("has_daily_minyan = true")
    
    # Shabbat services filter
    if filters.get('hasShabbatServices') == 'true':
        conditions.append("has_shabbat_services = true")
    
    # Holiday services filter
    if filters.get('hasHolidayServices') == 'true':
        conditions.append("has_holiday_services = true")
    
    # Women section filter
    if filters.get('hasWomenSection') == 'true':
        conditions.append("has_women_section = true")
    
    # Mechitza filter
    if filters.get('hasMechitza') == 'true':
        conditions.append("has_mechitza = true")
    
    # Separate entrance filter
    if filters.get('hasSeparateEntrance') == 'true':
        conditions.append("has_separate_entrance = true")
    
    # Parking filter
    if filters.get('hasParking') == 'true':
        conditions.append("has_parking = true")
    
    # Disabled access filter
    if filters.get('hasDisabledAccess') == 'true':
        conditions.append("has_disabled_access = true")
    
    # Kiddush facilities filter
    if filters.get('hasKiddushFacilities') == 'true':
        conditions.append("has_kiddush_facilities = true")
    
    # Social hall filter
    if filters.get('hasSocialHall') == 'true':
        conditions.append("has_social_hall = true")
    
    # Library filter
    if filters.get('hasLibrary') == 'true':
        conditions.append("has_library = true")
    
    # Hebrew school filter
    if filters.get('hasHebrewSchool') == 'true':
        conditions.append("has_hebrew_school = true")
    
    # Adult education filter
    if filters.get('hasAdultEducation') == 'true':
        conditions.append("has_adult_education = true")
    
    # Youth programs filter
    if filters.get('hasYouthPrograms') == 'true':
        conditions.append("has_youth_programs = true")
    
    # Senior programs filter
    if filters.get('hasSeniorPrograms') == 'true':
        conditions.append("has_senior_programs = true")
    
    # Accepts visitors filter
    if filters.get('acceptsVisitors') == 'true':
        conditions.append("accepts_visitors = true")
    
    # Membership required filter
    if filters.get('membershipRequired') == 'false':
        conditions.append("membership_required = false")
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    return where_clause, params

def build_order_clause(lat: Optional[float], lng: Optional[float], 
                      max_distance_mi: Optional[float]) -> str:
    """Build ORDER BY clause for location-based sorting."""
    if lat is not None and lng is not None and max_distance_mi is not None:
        # Order by distance if location and max distance are provided
        return """
        (
            3959 * acos(
                cos(radians(%s)) * 
                cos(radians(latitude)) * 
                cos(radians(longitude) - radians(%s)) + 
                sin(radians(%s)) * 
                sin(radians(latitude))
            )
        ) ASC
        """
    else:
        # Default ordering by name
        return "name ASC"

@synagogues_bp.route('/', methods=['GET'])
def get_synagogues():
    """Get synagogues with filtering and pagination."""
    import signal
    
    def timeout_handler(signum, frame):
        raise TimeoutError("Database query timed out")
    
    # Set a 10-second timeout for the entire request
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(10)
    
    try:
        # Parse query parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)  # Max 100 per page
        offset = (page - 1) * limit
        
        # Parse filters
        filters = {
            'search': request.args.get('search'),
            'city': request.args.get('city'),
            'state': request.args.get('state'),
            'denomination': request.args.get('denomination'),
            'shulType': request.args.get('shulType'),
            'hasDailyMinyan': request.args.get('hasDailyMinyan'),
            'hasShabbatServices': request.args.get('hasShabbatServices'),
            'hasHolidayServices': request.args.get('hasHolidayServices'),
            'hasWomenSection': request.args.get('hasWomenSection'),
            'hasMechitza': request.args.get('hasMechitza'),
            'hasSeparateEntrance': request.args.get('hasSeparateEntrance'),
            'hasParking': request.args.get('hasParking'),
            'hasDisabledAccess': request.args.get('hasDisabledAccess'),
            'hasKiddushFacilities': request.args.get('hasKiddushFacilities'),
            'hasSocialHall': request.args.get('hasSocialHall'),
            'hasLibrary': request.args.get('hasLibrary'),
            'hasHebrewSchool': request.args.get('hasHebrewSchool'),
            'hasAdultEducation': request.args.get('hasAdultEducation'),
            'hasYouthPrograms': request.args.get('hasYouthPrograms'),
            'hasSeniorPrograms': request.args.get('hasSeniorPrograms'),
            'acceptsVisitors': request.args.get('acceptsVisitors'),
            'membershipRequired': request.args.get('membershipRequired'),
        }
        
        # Parse location parameters
        lat = request.args.get('lat')
        lng = request.args.get('lng')
        max_distance_mi = request.args.get('maxDistanceMi')
        
        if lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
                if not GooglePlacesValidator.validate_coordinates(lat, lng):
                    return jsonify({
                        'success': False,
                        'error': 'Invalid coordinates provided',
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    }), 400
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid coordinate format',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }), 400
        
        if max_distance_mi:
            try:
                max_distance_mi = float(max_distance_mi)
                if max_distance_mi <= 0:
                    return jsonify({
                        'success': False,
                        'error': 'Max distance must be positive',
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    }), 400
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid max distance format',
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
            
            # Build ORDER BY clause
            order_clause = build_order_clause(lat, lng, max_distance_mi)
            
            # Count total synagogues
            count_query = f"""
                SELECT COUNT(*) as total 
                FROM shuls 
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
            
            # Get synagogues with pagination
            data_query = f"""
                SELECT 
                    id, name, description, address, city, state, zip_code, country,
                    phone_number, website, email, shul_type, shul_category, denomination,
                    business_hours, has_daily_minyan, has_shabbat_services, has_holiday_services,
                    has_women_section, has_mechitza, has_separate_entrance, rabbi_name,
                    religious_authority, community_affiliation, kosher_certification,
                    has_parking, has_disabled_access, has_kiddush_facilities, has_social_hall,
                    has_library, has_hebrew_school, has_adult_education, has_youth_programs,
                    has_senior_programs, membership_required, membership_fee, fee_currency,
                    accepts_visitors, visitor_policy, is_active, is_verified, created_at,
                    updated_at, tags, rating, review_count, star_rating, google_rating,
                    image_url, logo_url, latitude, longitude
                FROM shuls 
                WHERE {where_clause}
                ORDER BY {order_clause}
                LIMIT %s OFFSET %s
            """
            
            # Add pagination parameters
            query_params = where_params + [limit, offset]
            
            # Execute query
            synagogues = db_manager.execute_query(data_query, query_params)
            
            # Calculate distances if location is provided using optimized Python function
            if lat is not None and lng is not None:
                for shul in synagogues:
                    if shul.get('latitude') and shul.get('longitude'):
                        try:
                            distance = calculate_distance(
                                lat, lng, 
                                float(shul['latitude']), float(shul['longitude'])
                            )
                            shul['distance_miles'] = round(distance, 1)
                            shul['distance'] = f"{shul['distance_miles']} mi"
                        except (ValueError, TypeError):
                            shul['distance_miles'] = None
                            shul['distance'] = None
                    else:
                        shul['distance_miles'] = None
                        shul['distance'] = None
            
            # Calculate total pages
            total_pages = math.ceil(total / limit) if total > 0 else 0
            
            # Prepare response
            response_data = {
                'success': True,
                'synagogues': synagogues,
                'total': total,
                'page': page,
                'limit': limit,
                'totalPages': total_pages,
                'hasNext': page < total_pages,
                'hasPrev': page > 1,
                'message': f'Retrieved {len(synagogues)} synagogues',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Successfully retrieved {len(synagogues)} synagogues (page {page})")
            return jsonify(response_data)
            
        finally:
            db_manager.disconnect()
            signal.alarm(0)  # Cancel the timeout
            
    except TimeoutError:
        logger.error("Database query timed out in get_synagogues")
        return jsonify({
            'success': False,
            'error': 'Request timed out - database query took too long',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 408
    except Exception as e:
        logger.error(f"Error in get_synagogues: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@synagogues_bp.route('/filter-options', methods=['GET'])
def get_filter_options():
    """Get available filter options for synagogues."""
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
            # Get cities
            cities_query = """
                SELECT DISTINCT city 
                FROM shuls 
                WHERE is_active = true AND city IS NOT NULL AND city != ''
                ORDER BY city
            """
            cities_result = db_manager.execute_query(cities_query)
            cities = [row['city'] for row in cities_result if row['city']]
            
            # Get states
            states_query = """
                SELECT DISTINCT state 
                FROM shuls 
                WHERE is_active = true AND state IS NOT NULL AND state != ''
                ORDER BY state
            """
            states_result = db_manager.execute_query(states_query)
            states = [row['state'] for row in states_result if row['state']]
            
            # Get denominations
            denominations_query = """
                SELECT DISTINCT denomination 
                FROM shuls 
                WHERE is_active = true AND denomination IS NOT NULL AND denomination != ''
                ORDER BY denomination
            """
            denominations_result = db_manager.execute_query(denominations_query)
            denominations = [row['denomination'] for row in denominations_result if row['denomination']]
            
            # Get shul types
            shul_types_query = """
                SELECT DISTINCT shul_type 
                FROM shuls 
                WHERE is_active = true AND shul_type IS NOT NULL AND shul_type != ''
                ORDER BY shul_type
            """
            shul_types_result = db_manager.execute_query(shul_types_query)
            shul_types = [row['shul_type'] for row in shul_types_result if row['shul_type']]
            
            # Get shul categories
            shul_categories_query = """
                SELECT DISTINCT shul_category 
                FROM shuls 
                WHERE is_active = true AND shul_category IS NOT NULL AND shul_category != ''
                ORDER BY shul_category
            """
            shul_categories_result = db_manager.execute_query(shul_categories_query)
            shul_categories = [row['shul_category'] for row in shul_categories_result if row['shul_category']]
            
            # Prepare response
            filter_options = {
                'cities': cities,
                'states': states,
                'denominations': denominations,
                'shulTypes': shul_types,
                'shulCategories': shul_categories,
                'booleanOptions': {
                    'hasDailyMinyan': 'Has Daily Minyan',
                    'hasShabbatServices': 'Has Shabbat Services',
                    'hasHolidayServices': 'Has Holiday Services',
                    'hasWomenSection': 'Has Women Section',
                    'hasMechitza': 'Has Mechitza',
                    'hasSeparateEntrance': 'Has Separate Entrance',
                    'hasParking': 'Has Parking',
                    'hasDisabledAccess': 'Has Disabled Access',
                    'hasKiddushFacilities': 'Has Kiddush Facilities',
                    'hasSocialHall': 'Has Social Hall',
                    'hasLibrary': 'Has Library',
                    'hasHebrewSchool': 'Has Hebrew School',
                    'hasAdultEducation': 'Has Adult Education',
                    'hasYouthPrograms': 'Has Youth Programs',
                    'hasSeniorPrograms': 'Has Senior Programs',
                    'acceptsVisitors': 'Accepts Visitors',
                    'membershipRequired': 'Membership Required'
                }
            }
            
            response_data = {
                'success': True,
                'data': filter_options,
                'message': 'Filter options retrieved successfully',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info("Successfully retrieved synagogue filter options")
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

@synagogues_bp.route('/<int:synagogue_id>', methods=['GET'])
def get_synagogue(synagogue_id: int):
    """Get a specific synagogue by ID."""
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
            # Get synagogue by ID
            query = """
                SELECT 
                    id, name, description, address, city, state, zip_code, country,
                    phone_number, website, email, shul_type, shul_category, denomination,
                    business_hours, has_daily_minyan, has_shabbat_services, has_holiday_services,
                    has_women_section, has_mechitza, has_separate_entrance, rabbi_name,
                    religious_authority, community_affiliation, kosher_certification,
                    has_parking, has_disabled_access, has_kiddush_facilities, has_social_hall,
                    has_library, has_hebrew_school, has_adult_education, has_youth_programs,
                    has_senior_programs, membership_required, membership_fee, fee_currency,
                    accepts_visitors, visitor_policy, is_active, is_verified, created_at,
                    updated_at, tags, rating, review_count, star_rating, google_rating,
                    image_url, logo_url, latitude, longitude
                FROM shuls 
                WHERE id = %s AND is_active = true
            """
            
            result = db_manager.execute_query(query, [synagogue_id])
            
            if not result:
                return jsonify({
                    'success': False,
                    'error': 'Synagogue not found',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }), 404
            
            synagogue = result[0]
            
            response_data = {
                'success': True,
                'synagogue': synagogue,
                'message': 'Synagogue retrieved successfully',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Successfully retrieved synagogue {synagogue_id}")
            return jsonify(response_data)
            
        finally:
            db_manager.disconnect()
            
    except Exception as e:
        logger.error(f"Error in get_synagogue: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@synagogues_bp.route('/statistics', methods=['GET'])
def get_synagogue_statistics():
    """Get statistics about synagogues."""
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
            # Get total count
            total_query = "SELECT COUNT(*) as total FROM shuls WHERE is_active = true"
            total_result = db_manager.execute_query(total_query)
            total_synagogues = total_result[0]['total'] if total_result else 0
            
            # Get count by denomination
            denomination_query = """
                SELECT denomination, COUNT(*) as count 
                FROM shuls 
                WHERE is_active = true AND denomination IS NOT NULL AND denomination != ''
                GROUP BY denomination 
                ORDER BY count DESC
            """
            denomination_result = db_manager.execute_query(denomination_query)
            denomination_counts = {row['denomination']: row['count'] for row in denomination_result}
            
            # Get count by state
            state_query = """
                SELECT state, COUNT(*) as count 
                FROM shuls 
                WHERE is_active = true AND state IS NOT NULL AND state != ''
                GROUP BY state 
                ORDER BY count DESC
            """
            state_result = db_manager.execute_query(state_query)
            state_counts = {row['state']: row['count'] for row in state_result}
            
            # Get count by city
            city_query = """
                SELECT city, COUNT(*) as count 
                FROM shuls 
                WHERE is_active = true AND city IS NOT NULL AND city != ''
                GROUP BY city 
                ORDER BY count DESC
                LIMIT 10
            """
            city_result = db_manager.execute_query(city_query)
            city_counts = {row['city']: row['count'] for row in city_result}
            
            # Get count by shul type
            shul_type_query = """
                SELECT shul_type, COUNT(*) as count 
                FROM shuls 
                WHERE is_active = true AND shul_type IS NOT NULL AND shul_type != ''
                GROUP BY shul_type 
                ORDER BY count DESC
            """
            shul_type_result = db_manager.execute_query(shul_type_query)
            shul_type_counts = {row['shul_type']: row['count'] for row in shul_type_result}
            
            # Get feature counts
            feature_queries = {
                'hasDailyMinyan': 'has_daily_minyan = true',
                'hasShabbatServices': 'has_shabbat_services = true',
                'hasHolidayServices': 'has_holiday_services = true',
                'hasWomenSection': 'has_women_section = true',
                'hasMechitza': 'has_mechitza = true',
                'hasParking': 'has_parking = true',
                'hasDisabledAccess': 'has_disabled_access = true',
                'hasKiddushFacilities': 'has_kiddush_facilities = true',
                'hasSocialHall': 'has_social_hall = true',
                'hasLibrary': 'has_library = true',
                'hasHebrewSchool': 'has_hebrew_school = true',
                'hasAdultEducation': 'has_adult_education = true',
                'hasYouthPrograms': 'has_youth_programs = true',
                'hasSeniorPrograms': 'has_senior_programs = true',
                'acceptsVisitors': 'accepts_visitors = true',
                'membershipRequired': 'membership_required = true'
            }
            
            feature_counts = {}
            for feature, condition in feature_queries.items():
                query = f"SELECT COUNT(*) as count FROM shuls WHERE is_active = true AND {condition}"
                result = db_manager.execute_query(query)
                feature_counts[feature] = result[0]['count'] if result else 0
            
            # Prepare response
            statistics = {
                'total_synagogues': total_synagogues,
                'denomination_counts': denomination_counts,
                'state_counts': state_counts,
                'city_counts': city_counts,
                'shul_type_counts': shul_type_counts,
                'feature_counts': feature_counts
            }
            
            response_data = {
                'success': True,
                'data': statistics,
                'message': 'Synagogue statistics retrieved successfully',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info("Successfully retrieved synagogue statistics")
            return jsonify(response_data)
            
        finally:
            db_manager.disconnect()
            
    except Exception as e:
        logger.error(f"Error in get_synagogue_statistics: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500
