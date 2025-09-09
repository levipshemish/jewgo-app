"""
Mikvah API endpoints for the JewGo application.
Provides RESTful API access to mikvah facility data with filtering and search capabilities.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy import text

# Import shared utilities
from utils.query_builders import (
    build_where_clause,
    build_pagination_clause
)
from utils.geospatial import distance_select, distance_where_clause, knn_order_clause
from utils.api_caching import cache_mikvah_list

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

# Initialize database manager
db_manager = DatabaseManager()

@mikvah_bp.route('/', methods=['GET'])
@cache_mikvah_list(ttl_seconds=600)  # Cache for 10 minutes
def get_mikvah():
    """Get mikvah facilities with filtering, pagination, and location-based sorting."""
    try:
        # Parse query parameters
        page = request.args.get("page", type=int, default=1)
        limit = request.args.get("limit", type=int, default=20)
        lat = request.args.get("lat", type=float)
        lng = request.args.get("lng", type=float)
        maxd = request.args.get("max_distance_m", type=float)
        
        # Validate coordinates if provided
        if lat is not None and lng is not None:
            if not GooglePlacesValidator.validate_coordinates(lat, lng):
                return jsonify({
                    'success': False,
                    'error': 'Invalid coordinates provided',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }), 400
        
        # Build base query with PostGIS distance calculation
        base_sql = f"""
        SELECT r.id, r.name, r.description, r.address, r.city, r.state, r.zip_code, r.country,
               r.phone_number, r.website, r.email, r.mikvah_type, r.mikvah_category,
               r.business_hours, r.has_parking, r.has_disabled_access, r.has_heating,
               r.has_air_conditioning, r.has_private_changing_rooms, r.has_amenities,
               r.kosher_certification, r.kosher_category, r.is_cholov_yisroel, r.is_pas_yisroel,
               r.has_attendant, r.has_private_sessions, r.has_group_sessions, r.has_educational_programs,
               r.has_fees, r.fee_amount, r.fee_currency, r.accepts_credit_cards, r.accepts_cash,
               r.rating, r.review_count, r.star_rating, r.google_rating,
               r.image_url, r.logo_url, r.latitude, r.longitude,
               r.is_active, r.is_verified, r.created_at, r.updated_at, r.tags,
               r.admin_notes, r.specials, r.listing_type,
               {distance_select('r')}
        FROM mikvah r
        """
        
        # Build WHERE clause from filters
        filters = request.args.to_dict(flat=True)
        where_sql, where_params = build_where_clause(filters)
        
        # Add distance filtering if max_distance provided
        if maxd and lat is not None and lng is not None:
            distance_where = distance_where_clause(maxd, 'r')
            if where_sql:
                where_sql = f"{where_sql} AND {distance_where}"
            else:
                where_sql = f"WHERE {distance_where}"
        
        # Build ORDER BY clause (PostGIS KNN when coordinates provided)
        if lat is not None and lng is not None:
            order_sql = knn_order_clause("r")
        else:
            order_sql = "ORDER BY r.updated_at DESC, r.id"
        
        # Build pagination
        pagination_sql, pagination_params = build_pagination_clause(page, limit)
        
        # Combine all parts
        full_sql = " ".join([base_sql, where_sql, order_sql, pagination_sql])
        
        # Merge all named parameters
        all_params = {**where_params, **pagination_params}
        
        # Add coordinates if provided
        if lat is not None and lng is not None:
            all_params.update({"lat": lat, "lng": lng})
        
        # Add max_distance if provided
        if maxd:
            all_params["max_distance"] = maxd
        
        # Execute query
        with db_manager.get_session() as session:
            result = session.execute(text(full_sql), all_params)
            rows = result.mappings().all()
            
            # Convert to list of dicts
            mikvah_facilities = []
            for row in rows:
                mikvah_data = dict(row)
                # Convert datetime objects to ISO format
                if mikvah_data.get('created_at'):
                    mikvah_data['created_at'] = mikvah_data['created_at'].isoformat()
                if mikvah_data.get('updated_at'):
                    mikvah_data['updated_at'] = mikvah_data['updated_at'].isoformat()
                mikvah_facilities.append(mikvah_data)
        
        # Calculate pagination info
        total = len(mikvah_facilities)  # This is approximate for now
        total_pages = (total + limit - 1) // limit if total > 0 else 1
        has_more = (page * limit) < total
        
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
                    'offset': (page - 1) * limit
                }
            },
            'message': f'Retrieved {len(mikvah_facilities)} mikvah facilities',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Successfully retrieved {len(mikvah_facilities)} mikvah facilities")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error fetching mikvahs: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@mikvah_bp.route('/<int:mikvah_id>', methods=['GET'])
def get_mikvah_facility(mikvah_id: int):
    """Get a specific mikvah facility by ID."""
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
            WHERE id = :mikvah_id AND is_active = :is_active
        """
        
        with db_manager.get_session() as session:
            result = session.execute(text(mikvah_query), {
                "mikvah_id": mikvah_id, 
                "is_active": True
            }).mappings().all()
            
            if not result:
                return jsonify({
                    'success': False,
                    'error': 'Mikvah facility not found',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }), 404
            
            mikvah = dict(result[0])
            
            # Convert datetime objects to ISO format
            if mikvah.get('created_at'):
                mikvah['created_at'] = mikvah['created_at'].isoformat()
            if mikvah.get('updated_at'):
                mikvah['updated_at'] = mikvah['updated_at'].isoformat()
        
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
        # Get unique values for filter options
        filter_queries = {
            'cities': "SELECT DISTINCT city FROM mikvah WHERE is_active = :is_active AND city IS NOT NULL ORDER BY city",
            'states': "SELECT DISTINCT state FROM mikvah WHERE is_active = :is_active AND state IS NOT NULL ORDER BY state",
            'mikvah_types': "SELECT DISTINCT mikvah_type FROM mikvah WHERE is_active = :is_active AND mikvah_type IS NOT NULL ORDER BY mikvah_type",
            'mikvah_categories': "SELECT DISTINCT mikvah_category FROM mikvah WHERE is_active = :is_active AND mikvah_category IS NOT NULL ORDER BY mikvah_category",
            'kosher_agencies': "SELECT DISTINCT kosher_certification FROM mikvah WHERE is_active = :is_active AND kosher_certification IS NOT NULL ORDER BY kosher_certification"
        }
        
        filter_options = {}
        
        with db_manager.get_session() as session:
            for key, query in filter_queries.items():
                result = session.execute(text(query), {"is_active": True}).mappings().all()
                filter_options[key] = [row[key.split('_')[0]] for row in result if row[key.split('_')[0]]]
        
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
        
    except Exception as e:
        logger.error(f"Error in get_filter_options: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500