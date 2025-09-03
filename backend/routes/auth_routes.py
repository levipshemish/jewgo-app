"""
Authentication routes for PostgreSQL-based authentication system.
This replaces Supabase authentication with custom PostgreSQL endpoints.
"""

from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.orm import Session
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import re

from services.auth_service import AuthService
from database.auth_models_v2 import JewGoUser, JewGoRole
from database.database_manager_v3 import EnhancedDatabaseManager
from utils.logging_config import get_logger
from utils.security import rate_limit

logger = get_logger(__name__)

# Create blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def get_db_session():
    """Get database session with proper lifecycle management."""
    try:
        db_manager = EnhancedDatabaseManager()
        if db_manager.connect():
            session = db_manager.get_session()
            # Ensure we're using READ COMMITTED isolation level
            session.connection().execution_options(isolation_level="READ COMMITTED")
            return session
        else:
            logger.error("Failed to connect to database")
            return None
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return None

def cleanup_db_session(session):
    """Clean up database session properly."""
    if session:
        try:
            session.close()
        except Exception as e:
            logger.warning(f"Error closing database session: {e}")

def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    return True, "Password is valid"

@auth_bp.route('/register', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=3600)  # 5 attempts per hour
def register():
    """User registration endpoint."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        username = data.get('username', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        
        # Validate required fields
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        # Validate email format
        if not validate_email(email):
            return jsonify({'success': False, 'error': 'Invalid email format'}), 400
        
        # Validate password strength
        is_valid_password, password_message = validate_password(password)
        if not is_valid_password:
            return jsonify({'success': False, 'error': password_message}), 400
        
        # Get database session
        db_session = get_db_session()
        if not db_session:
            return jsonify({'success': False, 'error': 'Database connection failed'}), 500
        
        try:
            # Create auth service
            auth_service = AuthService(db_session)
            
            # Check if user already exists
            if auth_service.get_user_by_email(email):
                return jsonify({'success': False, 'error': 'User with this email already exists'}), 409
            
            # Create user
            user_data = {
                'email': email,
                'password': password
            }
            
            if username:
                user_data['username'] = username
            if first_name:
                user_data['first_name'] = first_name
            if last_name:
                user_data['last_name'] = last_name
            
            user = auth_service.create_user(**user_data)
            
            if not user:
                return jsonify({'success': False, 'error': 'Failed to create user account'}), 500
            
            logger.info(f"User registered successfully: {email}")
            
            return jsonify({
                'success': True,
                'message': 'User registered successfully',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            }), 201
            
        finally:
            cleanup_db_session(db_session)
            
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@auth_bp.route('/login', methods=['POST'])
@rate_limit(max_requests=50, window_seconds=3600)  # 50 attempts per hour for testing
def login():
    """User login endpoint."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        # Get database session
        db_session = get_db_session()
        if not db_session:
            return jsonify({'success': False, 'error': 'Database connection failed'}), 500
        
        try:
            # Create auth service
            auth_service = AuthService(db_session)
            
            # Get client IP and user agent
            ip_address = request.remote_addr
            user_agent = request.headers.get('User-Agent')
            
            # Authenticate user
            result = auth_service.authenticate_user(email, password, ip_address, user_agent)
            
            if not result:
                return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
            
            logger.info(f"User logged in successfully: {email}")
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'data': result
            }), 200
            
        finally:
            cleanup_db_session(db_session)
            
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@rate_limit(max_requests=20, window_seconds=3600)  # 20 attempts per hour
def refresh_token():
    """Refresh access token endpoint."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        refresh_token = data.get('refresh_token', '')
        
        if not refresh_token:
            return jsonify({'success': False, 'error': 'Refresh token is required'}), 400
        
        # Get database session
        db_session = get_db_session()
        if not db_session:
            return jsonify({'success': False, 'error': 'Database connection failed'}), 500
        
        try:
            # Create auth service
            auth_service = AuthService(db_session)
            
            # Refresh token
            result = auth_service.refresh_token(refresh_token)
            
            if not result:
                return jsonify({'success': False, 'error': 'Invalid or expired refresh token'}), 401
            
            logger.info("Token refreshed successfully")
            
            return jsonify({
                'success': True,
                'message': 'Token refreshed successfully',
                'data': result
            }), 200
            
        finally:
            cleanup_db_session(db_session)
            
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@auth_bp.route('/logout', methods=['POST'])
@rate_limit(max_requests=50, window_seconds=3600)  # 50 attempts per hour
def logout():
    """User logout endpoint."""
    try:
        # Get authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Authorization header required'}), 401
        
        token = auth_header.split(' ')[1]
        
        # Get database session
        db_session = get_db_session()
        if not db_session:
            return jsonify({'success': False, 'error': 'Database connection failed'}), 500
        
        try:
            # Create auth service
            auth_service = AuthService(db_session)
            
            # Logout user
            success = auth_service.logout(token)
            
            if success:
                logger.info("User logged out successfully")
                return jsonify({'success': True, 'message': 'Logout successful'}), 200
            else:
                return jsonify({'success': False, 'error': 'Invalid token'}), 401
            
        finally:
            cleanup_db_session(db_session)
            
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@auth_bp.route('/me', methods=['GET'])
@rate_limit(max_requests=100, window_seconds=3600)  # 100 attempts per hour
def get_current_user():
    """Get current user information."""
    try:
        # Get authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Authorization header required'}), 401
        
        token = auth_header.split(' ')[1]
        
        # Get database session
        db_session = get_db_session()
        if not db_session:
            return jsonify({'success': False, 'error': 'Database connection failed'}), 500
        
        try:
            # Create auth service
            auth_service = AuthService(db_session)
            
            # Verify token and get user
            user_data = auth_service.verify_token(token)
            
            if not user_data:
                return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401
            
            return jsonify({
                'success': True,
                'data': user_data
            }), 200
            
        finally:
            cleanup_db_session(db_session)
            
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@auth_bp.route('/user-role', methods=['GET'])
@rate_limit(max_requests=100, window_seconds=3600)  # 100 attempts per hour
def get_user_role():
    """Get current user's role information (admin endpoint)."""
    try:
        # Get authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Authorization header required'}), 401
        
        token = auth_header.split(' ')[1]
        
        # Get database session
        db_session = get_db_session()
        if not db_session:
            return jsonify({'success': False, 'error': 'Database connection failed'}), 500
        
        try:
            # Create auth service
            auth_service = AuthService(db_session)
            
            # Verify token and get user
            user_data = auth_service.verify_token(token)
            
            if not user_data:
                return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401
            
            # Check if user has admin privileges
            if not auth_service.is_admin(user_data['id']):
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized',
                    'message': 'User does not have admin privileges'
                }), 403
            
            # Get user's roles
            roles = auth_service.get_user_roles(user_data['id'])
            
            return jsonify({
                'success': True,
                'data': {
                    'user_id': user_data['id'],
                    'email': user_data['email'],
                    'roles': roles,
                    'is_admin': True
                }
            }), 200
            
        finally:
            cleanup_db_session(db_session)
            
    except Exception as e:
        logger.error(f"Get user role error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@auth_bp.route('/setup', methods=['POST'])
@rate_limit(max_requests=1, window_seconds=3600)  # 1 attempt per hour
def setup_auth_system():
    """Setup authentication system (create default roles and admin user)."""
    try:
        # This endpoint should be protected in production
        # For now, we'll allow it for initial setup
        
        data = request.get_json() or {}
        admin_email = data.get('admin_email', 'admin@jewgo.com')
        admin_password = data.get('admin_password', 'Admin123!')
        
        # Get database session
        db_session = get_db_session()
        if not db_session:
            return jsonify({'success': False, 'error': 'Database connection failed'}), 500
        
        try:
            # Create auth service
            auth_service = AuthService(db_session)
            
            # Initialize roles
            if not auth_service.initialize_roles():
                return jsonify({'success': False, 'error': 'Failed to initialize roles'}), 500
            
            # Create admin user
            admin_user = auth_service.create_admin_user(
                email=admin_email,
                password=admin_password,
                role='super_admin',
                first_name='Admin',
                last_name='User',
                is_verified=True
            )
            
            if not admin_user:
                return jsonify({'success': False, 'error': 'Failed to create admin user'}), 500
            
            logger.info(f"Authentication system setup completed. Admin user: {admin_email}")
            
            return jsonify({
                'success': True,
                'message': 'Authentication system setup completed',
                'data': {
                    'admin_email': admin_email,
                    'roles_created': 4
                }
            }), 200
            
        finally:
            cleanup_db_session(db_session)
            
    except Exception as e:
        logger.error(f"Setup auth system error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@auth_bp.route('/health', methods=['GET'])
def auth_health():
    """Authentication system health check."""
    try:
        # Get database session
        db_session = get_db_session()
        if not db_session:
            return jsonify({
                'success': False,
                'status': 'unhealthy',
                'error': 'Database connection failed'
            }), 503
        
        try:
            # Check if roles table exists and has data
            roles_count = db_session.query(JewGoRole).count()
            users_count = db_session.query(JewGoUser).count()
            
            return jsonify({
                'success': True,
                'status': 'healthy',
                'data': {
                    'roles_count': roles_count,
                    'users_count': users_count,
                    'timestamp': datetime.utcnow().isoformat()
                }
            }), 200
            
        finally:
            cleanup_db_session(db_session)
            
    except Exception as e:
        logger.error(f"Auth health check error: {e}")
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@auth_bp.route('/debug-token', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=3600)  # 10 attempts per hour
def debug_token():
    """Debug endpoint to check JWT token details."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        token = data.get('token', '')
        
        if not token:
            return jsonify({'success': False, 'error': 'Token is required'}), 400
        
        try:
            # Decode token without verification to see payload
            import jwt
            payload = jwt.decode(token, options={"verify_signature": False})
            
            # Calculate time until expiration
            import time
            current_time = int(time.time())
            exp_time = payload.get('exp', 0)
            time_until_exp = exp_time - current_time
            
            return jsonify({
                'success': True,
                'data': {
                    'payload': payload,
                    'current_time': current_time,
                    'expiration_time': exp_time,
                    'time_until_exp': time_until_exp,
                    'expired': time_until_exp <= 0,
                    'expires_in_minutes': round(time_until_exp / 60, 2) if time_until_exp > 0 else 0
                }
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': 'Failed to decode token',
                'details': str(e)
            }), 400
            
    except Exception as e:
        logger.error(f"Debug token error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
