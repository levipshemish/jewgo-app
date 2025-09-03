"""
PostgreSQL-based authentication API endpoints.

This module provides REST API endpoints for user authentication, registration,
and account management using PostgreSQL instead of Supabase.
"""

from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import BadRequest
from utils.logging_config import get_logger
from utils.error_handler import ValidationError, AuthenticationError
from utils.postgres_auth import get_postgres_auth
from utils.rbac import require_auth, require_admin, get_current_user_id, optional_auth
from utils.rate_limiter import rate_limit
import re

logger = get_logger(__name__)

# Create blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def get_client_ip() -> str:
    """Get client IP address from request."""
    # Check for X-Forwarded-For header (common in proxy setups)
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    # Check for X-Real-IP header (common in nginx setups)
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    # Fall back to remote address
    else:
        return request.remote_addr


@auth_bp.route('/register', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=3600)  # 5 registrations per hour
def register():
    """Register a new user account."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        # Validate required fields
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not password:
            return jsonify({'error': 'Password is required'}), 400
        
        # Validate email format
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Create user account
        auth_manager = get_postgres_auth()
        user_info = auth_manager.create_user(email, password, name)
        
        # Remove sensitive information from response
        response_data = {
            'user': {
                'id': user_info['user_id'],
                'email': user_info['email'],
                'name': user_info['name'],
                'email_verified': user_info['email_verified']
            },
            'message': 'Account created successfully. Please check your email for verification.'
        }
        
        logger.info(f"User registration successful: {email}")
        return jsonify(response_data), 201
        
    except ValidationError as e:
        logger.warning(f"Registration validation error: {e}")
        return jsonify({'error': str(e)}), 400
    except AuthenticationError as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=900)  # 10 login attempts per 15 minutes
def login():
    """Authenticate user and return tokens."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Get client IP for logging
        client_ip = get_client_ip()
        
        # Authenticate user
        auth_manager = get_postgres_auth()
        user_info = auth_manager.authenticate_user(email, password, client_ip)
        
        if not user_info:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate tokens
        tokens = auth_manager.generate_tokens(user_info)
        
        # Prepare response
        response_data = {
            'user': {
                'id': user_info['user_id'],
                'name': user_info['name'],
                'email': user_info['email'],
                'email_verified': user_info['email_verified'],
                'roles': user_info.get('roles', [])
            },
            'tokens': tokens
        }
        
        logger.info(f"User login successful: {email}")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/refresh', methods=['POST'])
@rate_limit(max_requests=60, window_seconds=3600)  # 60 refresh attempts per hour
def refresh_token():
    """Refresh access token using refresh token."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        refresh_token = data.get('refresh_token')
        if not refresh_token:
            return jsonify({'error': 'Refresh token is required'}), 400
        
        # Refresh tokens
        auth_manager = get_postgres_auth()
        new_tokens = auth_manager.refresh_access_token(refresh_token)
        
        if not new_tokens:
            return jsonify({'error': 'Invalid or expired refresh token'}), 401
        
        logger.debug("Token refresh successful")
        return jsonify(new_tokens), 200
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({'error': 'Token refresh failed'}), 500


@auth_bp.route('/verify-email', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=3600)  # 10 verification attempts per hour
def verify_email():
    """Verify user email with verification token."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        verification_token = data.get('verification_token')
        if not verification_token:
            return jsonify({'error': 'Verification token is required'}), 400
        
        # Verify email
        auth_manager = get_postgres_auth()
        success = auth_manager.verify_email(verification_token)
        
        if not success:
            return jsonify({'error': 'Invalid or expired verification token'}), 400
        
        logger.info("Email verification successful")
        return jsonify({'message': 'Email verified successfully'}), 200
        
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        return jsonify({'error': 'Email verification failed'}), 500


@auth_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    """Get current user profile information."""
    try:
        from flask import g
        user_info = g.user
        
        # Return user profile (excluding sensitive data)
        profile_data = {
            'id': user_info['user_id'],
            'name': user_info['name'],
            'email': user_info['email'],
            'email_verified': user_info['email_verified'],
            'roles': user_info.get('roles', []),
            'last_login': user_info.get('last_login')
        }
        
        return jsonify({'user': profile_data}), 200
        
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        return jsonify({'error': 'Failed to retrieve profile'}), 500


@auth_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile():
    """Update user profile information."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        user_id = get_current_user_id()
        name = data.get('name', '').strip()
        
        # Only allow updating name for now
        # Email changes would require verification process
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        
        # Update profile in database
        from utils.postgres_auth import get_postgres_auth
        auth_manager = get_postgres_auth()
        
        with auth_manager.db.get_db_connection() as conn:
            from sqlalchemy import text
            conn.execute(
                text("UPDATE users SET name = :name, updated_at = NOW() WHERE id = :user_id"),
                {'name': name, 'user_id': user_id}
            )
            conn.commit()
        
        logger.info(f"Profile updated for user {user_id}")
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500


@auth_bp.route('/change-password', methods=['POST'])
@require_auth
@rate_limit(max_requests=5, window_seconds=3600)  # 5 password changes per hour
def change_password():
    """Change user password."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new passwords are required'}), 400
        
        user_id = get_current_user_id()
        from flask import g
        email = g.user['email']
        
        # Verify current password
        auth_manager = get_postgres_auth()
        user_info = auth_manager.authenticate_user(email, current_password)
        
        if not user_info:
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password strength
        password_validation = auth_manager.password_security.validate_password_strength(new_password)
        if not password_validation['is_valid']:
            return jsonify({
                'error': 'Password requirements not met',
                'details': password_validation['issues']
            }), 400
        
        # Hash new password
        new_password_hash = auth_manager.password_security.hash_password(new_password)
        
        # Update password in database
        with auth_manager.db.get_db_connection() as conn:
            from sqlalchemy import text
            conn.execute(
                text("UPDATE users SET password_hash = :password_hash, updated_at = NOW() WHERE id = :user_id"),
                {'password_hash': new_password_hash, 'user_id': user_id}
            )
            conn.commit()
        
        # Log password change
        auth_manager._log_auth_event(user_id, 'password_changed', True)
        
        logger.info(f"Password changed for user {user_id}")
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Password change error: {e}")
        return jsonify({'error': 'Failed to change password'}), 500


@auth_bp.route('/logout', methods=['POST'])
@optional_auth  # Optional auth because logout should work even with invalid tokens
def logout():
    """Logout user (client-side token invalidation)."""
    try:
        # In a JWT-based system, logout is primarily handled client-side
        # by removing tokens from storage. For enhanced security, we could:
        # 1. Maintain a token blacklist (expensive)
        # 2. Use short-lived tokens with refresh tokens
        # 3. Log the logout event
        
        user_id = get_current_user_id()
        if user_id:
            auth_manager = get_postgres_auth()
            auth_manager._log_auth_event(user_id, 'logout', True)
            logger.info(f"User logout: {user_id}")
        
        return jsonify({'message': 'Logged out successfully'}), 200
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'message': 'Logged out successfully'}), 200  # Always return success


# Admin endpoints for user management
@auth_bp.route('/admin/users', methods=['GET'])
@require_admin
def admin_list_users():
    """Admin endpoint to list users with pagination."""
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)  # Max 100 per page
        search = request.args.get('search', '').strip()
        
        offset = (page - 1) * per_page
        
        auth_manager = get_postgres_auth()
        
        with auth_manager.db.get_db_connection() as conn:
            from sqlalchemy import text
            
            # Build search condition
            where_clause = ""
            params = {'limit': per_page, 'offset': offset}
            
            if search:
                where_clause = "WHERE u.email ILIKE :search OR u.name ILIKE :search"
                params['search'] = f"%{search}%"
            
            # Get users with roles
            query = f"""
                SELECT u.id, u.name, u.email, u.email_verified, u.failed_login_attempts,
                       u.locked_until, u.last_login, u.created_at,
                       COALESCE(
                           JSON_AGG(
                               JSON_BUILD_OBJECT(
                                   'role', ur.role,
                                   'level', ur.level,
                                   'granted_at', ur.granted_at
                               )
                           ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                           '[]'
                       ) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                {where_clause}
                GROUP BY u.id, u.name, u.email, u.email_verified, u.failed_login_attempts,
                         u.locked_until, u.last_login, u.created_at
                ORDER BY u.created_at DESC
                LIMIT :limit OFFSET :offset
            """
            
            results = conn.execute(text(query), params).fetchall()
            
            # Get total count
            count_query = f"SELECT COUNT(*) FROM users u {where_clause}"
            count_params = {'search': params.get('search')} if search else {}
            total_count = conn.execute(text(count_query), count_params).scalar()
            
            # Format response
            users = []
            for row in results:
                user_data = row._asdict()
                import json
                user_data['roles'] = json.loads(user_data['roles'])
                users.append(user_data)
            
            return jsonify({
                'users': users,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total_count,
                    'pages': (total_count + per_page - 1) // per_page
                }
            }), 200
            
    except Exception as e:
        logger.error(f"Admin list users error: {e}")
        return jsonify({'error': 'Failed to list users'}), 500


@auth_bp.route('/admin/users/<user_id>/roles', methods=['POST'])
@require_admin
def admin_assign_role(user_id: str):
    """Admin endpoint to assign role to user."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        role = data.get('role')
        level = data.get('level')
        
        if not role or level is None:
            return jsonify({'error': 'Role and level are required'}), 400
        
        # Get current admin user ID
        granted_by = get_current_user_id()
        
        # Assign role
        auth_manager = get_postgres_auth()
        success = auth_manager.assign_user_role(user_id, role, level, granted_by)
        
        if not success:
            return jsonify({'error': 'Failed to assign role'}), 500
        
        logger.info(f"Role '{role}' assigned to user {user_id} by admin {granted_by}")
        return jsonify({'message': f"Role '{role}' assigned successfully"}), 200
        
    except Exception as e:
        logger.error(f"Admin assign role error: {e}")
        return jsonify({'error': 'Failed to assign role'}), 500


@auth_bp.route('/admin/users/<user_id>/roles/<role>', methods=['DELETE'])
@require_admin
def admin_revoke_role(user_id: str, role: str):
    """Admin endpoint to revoke role from user."""
    try:
        auth_manager = get_postgres_auth()
        success = auth_manager.revoke_user_role(user_id, role)
        
        if not success:
            return jsonify({'error': 'Failed to revoke role'}), 500
        
        granted_by = get_current_user_id()
        logger.info(f"Role '{role}' revoked from user {user_id} by admin {granted_by}")
        return jsonify({'message': f"Role '{role}' revoked successfully"}), 200
        
    except Exception as e:
        logger.error(f"Admin revoke role error: {e}")
        return jsonify({'error': 'Failed to revoke role'}), 500


# Health check endpoint
@auth_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for the auth service."""
    try:
        # Test database connection
        auth_manager = get_postgres_auth()
        with auth_manager.db.get_db_connection() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1")).fetchone()
        
        return jsonify({
            'status': 'healthy',
            'service': 'postgres_auth',
            'timestamp': '2025-01-15T00:00:00Z'
        }), 200
        
    except Exception as e:
        logger.error(f"Auth service health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'postgres_auth',
            'error': str(e)
        }), 503


# Error handlers for the blueprint
@auth_bp.errorhandler(ValidationError)
def handle_validation_error(error):
    """Handle validation errors."""
    return jsonify({'error': str(error)}), 400


@auth_bp.errorhandler(AuthenticationError)
def handle_auth_error(error):
    """Handle authentication errors."""
    return jsonify({'error': str(error)}), 401


@auth_bp.errorhandler(BadRequest)
def handle_bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Invalid request format'}), 400


@auth_bp.errorhandler(500)
def handle_internal_error(error):
    """Handle internal server errors."""
    logger.error(f"Internal server error in auth API: {error}")
    return jsonify({'error': 'Internal server error'}), 500