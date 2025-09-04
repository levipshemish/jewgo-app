"""
Simplified Synagogues API endpoints for the JewGo application.
Uses direct psycopg2 connections to avoid complex database manager issues.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import logging
import psycopg2
import os
from dotenv import load_dotenv
import math

# Setup logging
logger = logging.getLogger(__name__)

# Create blueprint
synagogues_simple_bp = Blueprint('synagogues_simple', __name__, url_prefix='/api/v4/synagogues')

def get_db_connection():
    """Get a direct database connection."""
    try:
        # Load environment variables
        load_dotenv('../../.env')
        database_url = os.getenv('DATABASE_URL')
        
        if not database_url:
            logger.error("DATABASE_URL not found in environment")
            return None
            
        # Convert postgres:// to postgresql:// if needed
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://")
            
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return None

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

@synagogues_simple_bp.route('/', methods=['GET'])
def get_synagogues():
    """Get synagogues with filtering and pagination."""
    try:
        # Parse query parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)  # Max 100 per page
        offset = (page - 1) * limit
        
        # Parse filters
        search = request.args.get('search')
        city = request.args.get('city')
        state = request.args.get('state')
        denomination = request.args.get('denomination')
        shul_type = request.args.get('shulType')
        has_daily_minyan = request.args.get('hasDailyMinyan')
        has_shabbat_services = request.args.get('hasShabbatServices')
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Unable to connect to database',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 500
        
        try:
            cur = conn.cursor()
            
            # Build WHERE clause
            where_conditions = ["is_active = true"]
            params = []
            param_count = 0
            
            if search:
                where_conditions.append("(name ILIKE %s OR city ILIKE %s OR description ILIKE %s)")
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term])
                param_count += 3
            
            if city:
                where_conditions.append("city ILIKE %s")
                params.append(f"%{city}%")
                param_count += 1
            
            if state:
                where_conditions.append("state = %s")
                params.append(state)
                param_count += 1
            
            if denomination:
                where_conditions.append("denomination = %s")
                params.append(denomination)
                param_count += 1
            
            if shul_type:
                where_conditions.append("shul_type = %s")
                params.append(shul_type)
                param_count += 1
            
            if has_daily_minyan == 'true':
                where_conditions.append("has_daily_minyan = true")
            
            if has_shabbat_services == 'true':
                where_conditions.append("has_shabbat_services = true")
            
            where_clause = " AND ".join(where_conditions)
            
            # Count total synagogues
            count_query = f"SELECT COUNT(*) as total FROM shuls WHERE {where_clause}"
            cur.execute(count_query, params)
            count_result = cur.fetchone()
            total = count_result[0] if count_result else 0
            
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
                ORDER BY name ASC
                LIMIT %s OFFSET %s
            """
            
            # Add pagination parameters
            query_params = params + [limit, offset]
            
            # Execute query
            cur.execute(data_query, query_params)
            results = cur.fetchall()
            
            # Convert results to list of dictionaries
            columns = [desc[0] for desc in cur.description]
            synagogues = []
            for row in results:
                synagogue = dict(zip(columns, row))
                # Convert any None values to appropriate defaults
                for key, value in synagogue.items():
                    if value is None:
                        if key in ['has_daily_minyan', 'has_shabbat_services', 'has_holiday_services', 
                                 'has_women_section', 'has_mechitza', 'has_separate_entrance',
                                 'has_parking', 'has_disabled_access', 'has_kiddush_facilities',
                                 'has_social_hall', 'has_library', 'has_hebrew_school',
                                 'has_adult_education', 'has_youth_programs', 'has_senior_programs',
                                 'membership_required', 'accepts_visitors', 'is_active', 'is_verified']:
                            synagogue[key] = False
                        elif key in ['rating', 'review_count', 'star_rating', 'google_rating']:
                            synagogue[key] = 0
                        elif key in ['latitude', 'longitude']:
                            synagogue[key] = None
                        elif key == 'tags':
                            synagogue[key] = []
                        else:
                            synagogue[key] = ""
                synagogues.append(synagogue)
            
            # Calculate total pages
            total_pages = math.ceil(total / limit) if total > 0 else 0
            
            # Prepare response
            response_data = {
                'success': True,
                'synagogues': synagogues,
                'total': total,
                'page': page,
                'limit': limit,
                'total_pages': total_pages,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            cur.close()
            conn.close()
            
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(f"Database query error: {e}")
            conn.close()
            return jsonify({
                'success': False,
                'error': f'Database query error: {str(e)}',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in get_synagogues: {e}")
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@synagogues_simple_bp.route('/filter-options', methods=['GET'])
def get_filter_options():
    """Get available filter options for synagogues."""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Unable to connect to database',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 500
        
        try:
            cur = conn.cursor()
            
            # Get cities
            cur.execute("SELECT DISTINCT city FROM shuls WHERE city IS NOT NULL AND city != '' ORDER BY city")
            cities = [row[0] for row in cur.fetchall()]
            
            # Get states
            cur.execute("SELECT DISTINCT state FROM shuls WHERE state IS NOT NULL AND state != '' ORDER BY state")
            states = [row[0] for row in cur.fetchall()]
            
            # Get denominations
            cur.execute("SELECT DISTINCT denomination FROM shuls WHERE denomination IS NOT NULL AND denomination != '' ORDER BY denomination")
            denominations = [row[0] for row in cur.fetchall()]
            
            # Get shul types
            cur.execute("SELECT DISTINCT shul_type FROM shuls WHERE shul_type IS NOT NULL AND shul_type != '' ORDER BY shul_type")
            shul_types = [row[0] for row in cur.fetchall()]
            
            cur.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'filter_options': {
                    'cities': cities,
                    'states': states,
                    'denominations': denominations,
                    'shul_types': shul_types
                },
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            
        except Exception as e:
            logger.error(f"Database query error: {e}")
            conn.close()
            return jsonify({
                'success': False,
                'error': f'Database query error: {str(e)}',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in get_filter_options: {e}")
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500
