"""
Synagogues API endpoints for the JewGo application.
Provides RESTful API access to synagogue data with filtering and search capabilities.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy import text

# Import shared utilities with correct backend. prefix
from backend.utils.query_builders import (
    build_where_clause,
    build_pagination_clause
)
from backend.utils.geospatial import distance_select, distance_where_clause, knn_order_clause
from backend.utils.api_caching import cache_synagogue_list

# Import database manager
try:
    from backend.database.database_manager_v4 import DatabaseManager
except ImportError:
    from backend.database.database_manager_v3 import EnhancedDatabaseManager as DatabaseManager

# Import utilities
try:
    from backend.utils.google_places_validator import GooglePlacesValidator
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

# Initialize database manager
db_manager = DatabaseManager()

def build_synagogue_where_clause(filters: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
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
    boolean_filters = [
        "hasDailyMinyan", "hasShabbatServices", "hasHolidayServices", "hasWomenSection",
        "hasMechitza", "hasSeparateEntrance", "hasParking", "hasDisabledAccess",
        "hasKiddushFacilities", "hasSocialHall", "hasLibrary", "hasHebrewSchool",
        "hasAdultEducation", "hasYouthPrograms", "hasSeniorPrograms", "acceptsVisitors"
    ]

    for filter_name in boolean_filters:
        if filters.get(filter_name) == 'true':
            import re
            db_column = re.sub(r'([A-Z])', r'_\1', filter_name).lower()
            clauses.append(f"r.{db_column} = :{filter_name}")
            named[filter_name] = True

    # Membership required filter (special case)
    if filters.get("membershipRequired") == 'false':
        clauses.append("r.membership_required = :membership_required")
        named["membership_required"] = False

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return where, named

@synagogues_bp.route('/', methods=['GET'])
@cache_synagogue_list(ttl_seconds=600)  # Cache for 10 minutes
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
               r.phone_number, r.website, r.email, r.denomination, r.shul_type,
               r.has_daily_minyan, r.has_shabbat_services, r.has_holiday_services,
               r.has_women_section, r.has_mechitza, r.has_separate_entrance,
               r.has_parking, r.has_disabled_access, r.has_kiddush_facilities,
               r.has_social_hall, r.has_library, r.has_hebrew_school,
               r.has_adult_education, r.has_youth_programs, r.has_senior_programs,
               r.accepts_visitors, r.membership_required, r.rabbi_name, r.rabbi_phone,
               r.rabbi_email, r.services_times, r.holiday_schedule, r.special_programs,
               r.community_size, r.founded_year, r.affiliation, r.kosher_certification,
               r.rating, r.review_count, r.star_rating, r.google_rating,
               r.image_url, r.logo_url, r.latitude, r.longitude,
               r.is_active, r.is_verified, r.created_at, r.updated_at, r.tags,
               r.admin_notes, r.specials, r.listing_type,
               {distance_select('r')}
        FROM synagogues r
        """
        
        # Build WHERE clause from filters
        filters = request.args.to_dict(flat=True)
        where_sql, where_params = build_synagogue_where_clause(filters)
        
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
                synagogues.append(synagogue_data)
        
        # Calculate pagination info
        total = len(synagogues)  # This is approximate for now
        total_pages = (total + limit - 1) // limit if total > 0 else 1
        has_more = (page * limit) < total
        
            response_data = {
                'success': True,
            'data': {
                'synagogues': synagogues,
                'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                    'total_pages': total_pages,
                    'has_more': has_more,
                    'offset': (page - 1) * limit
                }
            },
                'message': f'Retrieved {len(synagogues)} synagogues',
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

@synagogues_bp.route('/<int:synagogue_id>', methods=['GET'])
def get_synagogue(synagogue_id: int):
    """Get a specific synagogue by ID."""
    try:
        # Get synagogue details
        synagogue_query = """
            SELECT 
                id, name, description, address, city, state, zip_code, country,
                phone_number, website, email, denomination, shul_type,
                has_daily_minyan, has_shabbat_services, has_holiday_services,
                has_women_section, has_mechitza, has_separate_entrance,
                has_parking, has_disabled_access, has_kiddush_facilities,
                has_social_hall, has_library, has_hebrew_school,
                has_adult_education, has_youth_programs, has_senior_programs,
                accepts_visitors, membership_required, rabbi_name, rabbi_phone,
                rabbi_email, services_times, holiday_schedule, special_programs,
                community_size, founded_year, affiliation, kosher_certification,
                rating, review_count, star_rating, google_rating,
                image_url, logo_url, latitude, longitude,
                is_active, is_verified, created_at, updated_at, tags,
                admin_notes, specials, listing_type
            FROM synagogues 
            WHERE id = :synagogue_id AND is_active = :is_active
        """
        
        with db_manager.get_session() as session:
            result = session.execute(text(synagogue_query), {
                "synagogue_id": synagogue_id, 
                "is_active": True
            }).mappings().all()
            
            if not result:
                return jsonify({
                    'success': False,
                    'error': 'Synagogue not found',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }), 404
            
            synagogue = dict(result[0])
            
            # Convert datetime objects to ISO format
            if synagogue.get('created_at'):
                synagogue['created_at'] = synagogue['created_at'].isoformat()
            if synagogue.get('updated_at'):
                synagogue['updated_at'] = synagogue['updated_at'].isoformat()
        
        response_data = {
            'success': True,
            'data': {
                'synagogue': synagogue
            },
            'message': 'Synagogue retrieved successfully',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Successfully retrieved synagogue {synagogue_id}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error in get_synagogue: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@synagogues_bp.route('/filter-options', methods=['GET'])
def get_filter_options():
    """Get available filter options for synagogues."""
    try:
        # Get unique values for filter options
        filter_queries = {
            'cities': "SELECT DISTINCT city FROM synagogues WHERE is_active = :is_active AND city IS NOT NULL ORDER BY city",
            'states': "SELECT DISTINCT state FROM synagogues WHERE is_active = :is_active AND state IS NOT NULL ORDER BY state",
            'denominations': "SELECT DISTINCT denomination FROM synagogues WHERE is_active = :is_active AND denomination IS NOT NULL ORDER BY denomination",
            'shul_types': "SELECT DISTINCT shul_type FROM synagogues WHERE is_active = :is_active AND shul_type IS NOT NULL ORDER BY shul_type",
            'affiliations': "SELECT DISTINCT affiliation FROM synagogues WHERE is_active = :is_active AND affiliation IS NOT NULL ORDER BY affiliation"
        }
        
        filter_options = {}
        
        with db_manager.get_session() as session:
            for key, query in filter_queries.items():
                result = session.execute(text(query), {"is_active": True}).mappings().all()
                filter_options[key] = [row[key.split('_')[0]] for row in result if row[key.split('_')[0]]]
        
        # Add boolean filter options
        filter_options['boolean_filters'] = {
            'hasDailyMinyan': 'Daily Minyan',
            'hasShabbatServices': 'Shabbat Services',
            'hasHolidayServices': 'Holiday Services',
            'hasWomenSection': 'Women Section',
            'hasMechitza': 'Mechitza',
            'hasSeparateEntrance': 'Separate Entrance',
                    'hasParking': 'Has Parking',
            'hasDisabledAccess': 'Disabled Access',
            'hasKiddushFacilities': 'Kiddush Facilities',
            'hasSocialHall': 'Social Hall',
            'hasLibrary': 'Library',
            'hasHebrewSchool': 'Hebrew School',
            'hasAdultEducation': 'Adult Education',
            'hasYouthPrograms': 'Youth Programs',
            'hasSeniorPrograms': 'Senior Programs',
            'acceptsVisitors': 'Accepts Visitors'
            }
            
            response_data = {
                'success': True,
                'data': filter_options,
                'message': 'Filter options retrieved successfully',
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

@synagogues_bp.route('/stats', methods=['GET'])
def get_synagogue_stats():
    """Get synagogue statistics."""
    try:
        stats_query = """
                SELECT 
                COUNT(*) as total_synagogues,
                COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_synagogues,
                COUNT(CASE WHEN has_daily_minyan = true THEN 1 END) as daily_minyan_synagogues,
                COUNT(CASE WHEN has_shabbat_services = true THEN 1 END) as shabbat_services_synagogues,
                COUNT(CASE WHEN accepts_visitors = true THEN 1 END) as visitor_friendly_synagogues,
                COUNT(DISTINCT city) as cities_count,
                COUNT(DISTINCT state) as states_count,
                COUNT(DISTINCT denomination) as denominations_count
            FROM synagogues 
            WHERE is_active = :is_active
        """
        
        with db_manager.get_session() as session:
            result = session.execute(text(stats_query), {"is_active": True}).mappings().all()
            stats = dict(result[0]) if result else {}
            
            response_data = {
                'success': True,
            'data': stats,
            'message': 'Synagogue statistics retrieved successfully',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
            
            logger.info("Successfully retrieved synagogue statistics")
            return jsonify(response_data)
            
    except Exception as e:
        logger.error(f"Error in get_synagogue_stats: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500