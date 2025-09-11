#!/usr/bin/env python3
"""Consolidated v5 authentication and user management API routes.

This route file consolidates all authentication, user management, and profile
functionality with enhanced security, rate limiting, and audit logging.
Replaces: auth_api.py, user_management.py, profile_endpoints.py, and session management routes.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Optional, List, Union
import json
import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
import re
import secrets
from utils.logging_config import get_logger
from database.repositories.entity_repository_v5 import EntityRepositoryV5
from middleware.auth_v5 import AuthMiddlewareV5
from middleware.rate_limit_v5 import RateLimitMiddlewareV5
from middleware.observability_v5 import ObservabilityMiddlewareV5
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from cache.redis_manager_v5 import RedisManagerV5
from utils.feature_flags_v5 import FeatureFlagsV5

logger = get_logger(__name__)

# Create blueprint using the factory
auth_v5 = BlueprintFactoryV5.create_blueprint(
    'auth_v5',
    __name__,
    url_prefix='/api/v5/auth',
    config_override={
        'enable_cors': True,
        'enable_auth': False,  # Auth endpoints handle their own auth
        'enable_rate_limiting': True,
        'enable_idempotency': False,  # Auth operations aren't idempotent
        'enable_observability': True,
        'enable_audit_logging': True,
        'rate_limit_tier': 'auth'  # Special rate limiting for auth endpoints
    }
)

# Global service instances
entity_repository = None
redis_manager = None
feature_flags = None
auth_middleware = None

# Authentication configuration
AUTH_CONFIG = {
    'jwt_secret': None,  # Will be set from environment
    'jwt_expiry_hours': 24,
    'refresh_token_expiry_days': 30,
    'password_min_length': 8,
    'password_require_special': True,
    'max_login_attempts': 5,
    'lockout_duration_minutes': 15,
    'session_timeout_hours': 8
}

# Password validation patterns
PASSWORD_PATTERNS = {
    'min_length': re.compile(r'.{8,}'),
    'has_uppercase': re.compile(r'[A-Z]'),
    'has_lowercase': re.compile(r'[a-z]'),
    'has_digit': re.compile(r'\d'),
    'has_special': re.compile(r'[!@#$%^&*(),.?":{}|<>]')
}

# Email validation pattern
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


def init_services(connection_manager, redis_manager_instance, feature_flags_instance):
    """Initialize service instances."""
    global entity_repository, redis_manager, feature_flags, auth_middleware
    
    entity_repository = EntityRepositoryV5(connection_manager)
    redis_manager = redis_manager_instance
    feature_flags = feature_flags_instance
    auth_middleware = AuthMiddlewareV5()


def validate_password(password: str) -> Dict[str, Any]:
    """Validate password strength."""
    errors = []
    
    if not PASSWORD_PATTERNS['min_length'].match(password):
        errors.append('Password must be at least 8 characters long')
    
    if not PASSWORD_PATTERNS['has_uppercase'].match(password):
        errors.append('Password must contain at least one uppercase letter')
    
    if not PASSWORD_PATTERNS['has_lowercase'].match(password):
        errors.append('Password must contain at least one lowercase letter')
    
    if not PASSWORD_PATTERNS['has_digit'].match(password):
        errors.append('Password must contain at least one digit')
    
    if AUTH_CONFIG['password_require_special'] and not PASSWORD_PATTERNS['has_special'].match(password):
        errors.append('Password must contain at least one special character')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }


def validate_email(email: str) -> bool:
    """Validate email format."""
    return bool(EMAIL_PATTERN.match(email))


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def generate_jwt_token(user_data: Dict[str, Any]) -> str:
    """Generate JWT token for user."""
    payload = {
        'user_id': user_data['id'],
        'email': user_data['email'],
        'roles': user_data.get('roles', ['user']),
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=AUTH_CONFIG['jwt_expiry_hours'])
    }
    
    return jwt.encode(payload, AUTH_CONFIG['jwt_secret'], algorithm='HS256')


def generate_refresh_token() -> str:
    """Generate refresh token."""
    return secrets.token_urlsafe(32)


def log_auth_action(action: str, details: Dict[str, Any]):
    """Log authentication action for audit trail."""
    try:
        audit_record = {
            'action': action,
            'user_id': getattr(g, 'user_id', None),
            'user_email': getattr(g, 'user_email', None),
            'details': details,
            'timestamp': datetime.utcnow().isoformat(),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', ''),
            'correlation_id': getattr(g, 'correlation_id', None)
        }
        
        # Store in Redis for immediate access
        redis_manager.add_to_list('auth_audit_log', audit_record, max_length=10000)
        
        logger.info("Auth action logged", 
                   action=action, 
                   user_id=audit_record['user_id'],
                   details=details)
        
    except Exception as e:
        logger.exception("Failed to log auth action", action=action, error=str(e))


# Authentication endpoints
@auth_v5.route('/register', methods=['POST'])
def register():
    """Register a new user account."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        first_name = data['first_name'].strip()
        last_name = data['last_name'].strip()
        
        # Validate email format
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength
        password_validation = validate_password(password)
        if not password_validation['valid']:
            return jsonify({'error': 'Password validation failed', 'details': password_validation['errors']}), 400
        
        # Check if user already exists
        existing_user = get_user_by_email(email)
        if existing_user:
            return jsonify({'error': 'User already exists with this email'}), 409
        
        # Hash password
        hashed_password = hash_password(password)
        
        # Create user
        user_data = {
            'email': email,
            'password_hash': hashed_password,
            'first_name': first_name,
            'last_name': last_name,
            'roles': ['user'],
            'status': 'active',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        user = create_user(user_data)
        if not user:
            return jsonify({'error': 'Failed to create user account'}), 500
        
        # Generate tokens
        access_token = generate_jwt_token(user)
        refresh_token = generate_refresh_token()
        
        # Store refresh token
        redis_manager.set(f"refresh_token:{refresh_token}", user['id'], 
                         ttl=AUTH_CONFIG['refresh_token_expiry_days'] * 24 * 3600)
        
        log_auth_action('user_registration', {
            'user_id': user['id'],
            'email': email,
            'ip_address': request.remote_addr
        })
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'roles': user['roles']
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        logger.exception("Failed to register user", error=str(e))
        return jsonify({'error': 'Registration failed'}), 500


@auth_v5.route('/login', methods=['POST'])
def login():
    """Authenticate user and return tokens."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Check rate limiting for login attempts
        login_key = f"login_attempts:{request.remote_addr}"
        attempts = redis_manager.get_counter(login_key, default=0)
        
        if attempts >= AUTH_CONFIG['max_login_attempts']:
            return jsonify({'error': 'Too many login attempts. Please try again later.'}), 429
        
        # Get user by email
        user = get_user_by_email(email)
        if not user:
            redis_manager.increment_counter(login_key, ttl=AUTH_CONFIG['lockout_duration_minutes'] * 60)
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Verify password
        if not verify_password(password, user['password_hash']):
            redis_manager.increment_counter(login_key, ttl=AUTH_CONFIG['lockout_duration_minutes'] * 60)
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check user status
        if user['status'] != 'active':
            return jsonify({'error': 'Account is not active'}), 403
        
        # Reset login attempts on successful login
        redis_manager.delete(login_key)
        
        # Generate tokens
        access_token = generate_jwt_token(user)
        refresh_token = generate_refresh_token()
        
        # Store refresh token
        redis_manager.set(f"refresh_token:{refresh_token}", user['id'], 
                         ttl=AUTH_CONFIG['refresh_token_expiry_days'] * 24 * 3600)
        
        # Update last login
        update_user_last_login(user['id'])
        
        log_auth_action('user_login', {
            'user_id': user['id'],
            'email': email,
            'ip_address': request.remote_addr
        })
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'roles': user['roles']
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        })
        
    except Exception as e:
        logger.exception("Failed to login user", error=str(e))
        return jsonify({'error': 'Login failed'}), 500


@auth_v5.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token using refresh token."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'error': 'Refresh token is required'}), 400
        
        # Get user ID from refresh token
        user_id = redis_manager.get(f"refresh_token:{refresh_token}")
        if not user_id:
            return jsonify({'error': 'Invalid refresh token'}), 401
        
        # Get user data
        user = get_user_by_id(user_id)
        if not user or user['status'] != 'active':
            return jsonify({'error': 'User not found or inactive'}), 401
        
        # Generate new access token
        access_token = generate_jwt_token(user)
        
        log_auth_action('token_refresh', {
            'user_id': user['id'],
            'email': user['email']
        })
        
        return jsonify({
            'access_token': access_token,
            'message': 'Token refreshed successfully'
        })
        
    except Exception as e:
        logger.exception("Failed to refresh token", error=str(e))
        return jsonify({'error': 'Token refresh failed'}), 500


@auth_v5.route('/logout', methods=['POST'])
def logout():
    """Logout user and invalidate tokens."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if refresh_token:
            # Invalidate refresh token
            redis_manager.delete(f"refresh_token:{refresh_token}")
        
        # Get user from JWT token if available
        user_id = getattr(g, 'user_id', None)
        if user_id:
            log_auth_action('user_logout', {
                'user_id': user_id,
                'email': getattr(g, 'user_email', None)
            })
        
        return jsonify({'message': 'Logout successful'})
        
    except Exception as e:
        logger.exception("Failed to logout user", error=str(e))
        return jsonify({'error': 'Logout failed'}), 500


@auth_v5.route('/profile', methods=['GET'])
def get_profile():
    """Get current user profile."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Remove sensitive data
        profile_data = {
            'id': user['id'],
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'roles': user['roles'],
            'status': user['status'],
            'created_at': user['created_at'],
            'last_login': user.get('last_login')
        }
        
        return jsonify({'profile': profile_data})
        
    except Exception as e:
        logger.exception("Failed to get profile", error=str(e))
        return jsonify({'error': 'Failed to retrieve profile'}), 500


@auth_v5.route('/profile', methods=['PUT'])
def update_profile():
    """Update current user profile."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        
        # Validate allowed fields
        allowed_fields = ['first_name', 'last_name']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        # Update user
        success = update_user(user_id, update_data)
        if not success:
            return jsonify({'error': 'Failed to update profile'}), 500
        
        log_auth_action('profile_update', {
            'user_id': user_id,
            'updated_fields': list(update_data.keys())
        })
        
        return jsonify({'message': 'Profile updated successfully'})
        
    except Exception as e:
        logger.exception("Failed to update profile", error=str(e))
        return jsonify({'error': 'Failed to update profile'}), 500


@auth_v5.route('/change-password', methods=['POST'])
def change_password():
    """Change user password."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Get user
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Verify current password
        if not verify_password(current_password, user['password_hash']):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password
        password_validation = validate_password(new_password)
        if not password_validation['valid']:
            return jsonify({'error': 'New password validation failed', 'details': password_validation['errors']}), 400
        
        # Hash new password
        hashed_password = hash_password(new_password)
        
        # Update password
        success = update_user_password(user_id, hashed_password)
        if not success:
            return jsonify({'error': 'Failed to update password'}), 500
        
        log_auth_action('password_change', {
            'user_id': user_id,
            'email': user['email']
        })
        
        return jsonify({'message': 'Password changed successfully'})
        
    except Exception as e:
        logger.exception("Failed to change password", error=str(e))
        return jsonify({'error': 'Failed to change password'}), 500


# Helper functions (these would be implemented with actual database queries)
def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email address."""
    # Placeholder implementation
    return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by ID."""
    # Placeholder implementation
    return None


def create_user(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create new user."""
    # Placeholder implementation
    return None


def update_user(user_id: int, update_data: Dict[str, Any]) -> bool:
    """Update user data."""
    # Placeholder implementation
    return True


def update_user_password(user_id: int, hashed_password: str) -> bool:
    """Update user password."""
    # Placeholder implementation
    return True


def update_user_last_login(user_id: int) -> bool:
    """Update user last login timestamp."""
    # Placeholder implementation
    return True


# Error handlers
@auth_v5.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Bad request'}), 400


@auth_v5.errorhandler(401)
def unauthorized(error):
    """Handle unauthorized errors."""
    return jsonify({'error': 'Authentication required'}), 401


@auth_v5.errorhandler(403)
def forbidden(error):
    """Handle forbidden errors."""
    return jsonify({'error': 'Access forbidden'}), 403


@auth_v5.errorhandler(409)
def conflict(error):
    """Handle conflict errors."""
    return jsonify({'error': 'Resource conflict'}), 409


@auth_v5.errorhandler(429)
def too_many_requests(error):
    """Handle rate limit errors."""
    return jsonify({'error': 'Too many requests'}), 429


@auth_v5.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("Auth API internal server error", error=str(error))
    return jsonify({'error': 'Authentication service unavailable'}), 500
