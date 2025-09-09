"""
Simplified Synagogues API endpoints for the JewGo application.
Refactored to use PostGIS utilities and modern database patterns.
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
synagogues_simple_bp = Blueprint('synagogues_simple', __name__, url_prefix='/api/v4/synagogues')

# Initialize database manager
db_manager = DatabaseManager()

def build_synagogue_simple_where_clause(filters: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
    """Build WHERE clause for synagogue-specific filters using named parameters."""
    clauses, named = [], {}

    # Base condition - only show active synagogues
    clauses.append("r.is_active = :is_active")
    named["is_active"] = True

    # Search filter
    if search := filters.get("search"):
        clauses.append("(r.name ILIKE :search OR r.city ILIKE :search OR r.description ILIKE :search)")
        named["search"] = f"%{search}%"

    # City filter
    if city := filters.get("city"):
        clauses.append("r.city ILIKE :city")
        named["city"] = f"%{city}%"

    # State filter
    if state := filters.get("state"):
        clauses.append("r.state = :state")
        named["state"] = state

    # Denomination filter
    if denomination := filters.get("denomination"):
        clauses.append("r.denomination = :denomination")
        named["denomination"] = denomination

    # Shul type filter
    if shul_type := filters.get("shulType"):
        clauses.append("r.shul_type = :shul_type")
        named["shul_type"] = shul_type

    # Boolean filters
    if filters.get("hasDailyMinyan") == 'true':
        clauses.append("r.has_daily_minyan = :has_daily_minyan")
        named["has_daily_minyan"] = True

    if filters.get("hasShabbatServices") == 'true':
        clauses.append("r.has_shabbat_services = :has_shabbat_services")
        named["has_shabbat_services"] = True

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return where, named

@synagogues_simple_bp.route('/', methods=['GET'])
def get_synagogues():
    """Get synagogues with filtering, pagination, and location-based sorting."""
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
               r.phone_number, r.website, r.email, r.shul_type, r.shul_category, r.denomination,
               r.business_hours, r.has_daily_minyan, r.has_shabbat_services, r.has_holiday_services,
               r.has_women_section, r.has_mechitza, r.has_separate_entrance, r.rabbi_name,
               r.religious_authority, r.community_affiliation, r.kosher_certification,
               r.has_parking, r.has_disabled_access, r.has_kiddush_facilities, r.has_social_hall,
               r.has_library, r.has_hebrew_school, r.has_adult_education, r.has_youth_programs,
               r.has_senior_programs, r.membership_required, r.membership_fee, r.fee_currency,
               r.accepts_visitors, r.visitor_policy, r.is_active, r.is_verified, r.created_at,
               r.updated_at, r.tags, r.rating, r.review_count, r.star_rating, r.google_rating,
               r.image_url, r.logo_url, r.latitude, r.longitude,
               {distance_select('r')}
        FROM shuls r
        """
        
        # Build WHERE clause from filters
        filters = request.args.to_dict(flat=True)
        where_sql, where_params = build_synagogue_simple_where_clause(filters)
        
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
            order_sql = "ORDER BY r.name ASC, r.id"
        
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
            synagogues = []
            for row in rows:
                synagogue_data = dict(row)
                # Convert datetime objects to ISO format
                if synagogue_data.get('created_at'):
                    synagogue_data['created_at'] = synagogue_data['created_at'].isoformat()
                if synagogue_data.get('updated_at'):
                    synagogue_data['updated_at'] = synagogue_data['updated_at'].isoformat()
                
                # Convert any None values to appropriate defaults
                for key, value in synagogue_data.items():
                    if value is None:
                        if key in ['has_daily_minyan', 'has_shabbat_services', 'has_holiday_services', 
                                 'has_women_section', 'has_mechitza', 'has_separate_entrance',
                                 'has_parking', 'has_disabled_access', 'has_kiddush_facilities',
                                 'has_social_hall', 'has_library', 'has_hebrew_school',
                                 'has_adult_education', 'has_youth_programs', 'has_senior_programs',
                                 'membership_required', 'accepts_visitors', 'is_active', 'is_verified']:
                            synagogue_data[key] = False
                        elif key in ['rating', 'review_count', 'star_rating', 'google_rating']:
                            synagogue_data[key] = 0
                        elif key in ['latitude', 'longitude']:
                            synagogue_data[key] = None
                        elif key == 'tags':
                            synagogue_data[key] = []
                        else:
                            synagogue_data[key] = ""
                
                synagogues.append(synagogue_data)
        
        # Calculate pagination info
        total = len(synagogues)  # This is approximate for now
        total_pages = (total + limit - 1) // limit if total > 0 else 1
        
        response_data = {
            'success': True,
            'synagogues': synagogues,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': total_pages,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Successfully retrieved {len(synagogues)} synagogues")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error fetching synagogues: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@synagogues_simple_bp.route('/filter-options', methods=['GET'])
def get_filter_options():
    """Get available filter options for synagogues."""
    try:
        # Get unique values for filter options
        filter_queries = {
            'cities': "SELECT DISTINCT city FROM shuls WHERE city IS NOT NULL AND city != '' ORDER BY city",
            'states': "SELECT DISTINCT state FROM shuls WHERE state IS NOT NULL AND state != '' ORDER BY state",
            'denominations': "SELECT DISTINCT denomination FROM shuls WHERE denomination IS NOT NULL AND denomination != '' ORDER BY denomination",
            'shul_types': "SELECT DISTINCT shul_type FROM shuls WHERE shul_type IS NOT NULL AND shul_type != '' ORDER BY shul_type"
        }
        
        filter_options = {}
        
        with db_manager.get_session() as session:
            for key, query in filter_queries.items():
                result = session.execute(text(query)).mappings().all()
                filter_options[key] = [row[key.split('_')[0]] for row in result if row[key.split('_')[0]]]
        
        response_data = {
            'success': True,
            'filter_options': filter_options,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info("Successfully retrieved synagogue filter options")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error in get_filter_options: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500