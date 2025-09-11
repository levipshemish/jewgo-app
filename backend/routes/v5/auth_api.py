#!/usr/bin/env python3
"""
V5 Authentication API routes using BlueprintFactoryV5.

Provides comprehensive authentication and authorization services including
JWT management, session handling, role-based access control, and security features.
"""

from flask import request, jsonify, g, make_response
from datetime import datetime, timedelta
from datetime import timedelta as td
import jwt
import bcrypt
from typing import Dict, Any, Optional

from backend.utils.blueprint_factory_v5 import BlueprintFactoryV5
from backend.middleware.auth_v5 import require_permission_v5
from backend.services.auth_service_v5 import AuthServiceV5
from backend.utils.logging_config import get_logger
from backend.utils.feature_flags_v5 import feature_flags_v5

logger = get_logger(__name__)

# Create blueprint using factory
auth_bp = BlueprintFactoryV5.create_blueprint(
    'auth_api', __name__, '/api/v5/auth'
)

# Initialize auth service
auth_service = AuthServiceV5()


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT tokens."""
    try:
        # Check feature flag
        user_id = getattr(g, 'user_id', None)
        user_roles = [role.get('role') for role in getattr(g, 'user_roles', []) if role.get('role')]
        
        if not feature_flags_v5.is_enabled('auth_api_v5', user_id=user_id, user_roles=user_roles):
            return jsonify({
                'success': False,
                'error': 'Auth API v5 is not enabled for your account'
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body required'
            }), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        remember_me = data.get('remember_me', False)

        if not email or not password:
            return jsonify({
                'success': False,
                'error': 'Email and password are required'
            }), 400

        # Validate email format
        if '@' not in email or '.' not in email:
            return jsonify({
                'success': False,
                'error': 'Invalid email format'
            }), 400

        # Authenticate user
        success, user_data = auth_service.authenticate_user(email, password)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Invalid email or password'
            }), 401

        # Generate tokens
        tokens = auth_service.generate_tokens(user_data, remember_me)

        # Create response
        response_data = {
            'success': True,
            'data': {
                'user': {
                    'id': user_data['id'],
                    'email': user_data['email'],
                    'name': user_data.get('name'),
                    'roles': user_data.get('roles', [])
                },
                'tokens': tokens,
                'session': {
                    'remember_me': remember_me,
                    'login_time': datetime.utcnow().isoformat()
                }
            },
            'message': 'Login successful',
            'timestamp': datetime.utcnow().isoformat()
        }

        # Set secure cookies
        response = make_response(jsonify(response_data))
        cookie_max_age = int(tokens.get('expires_in', 3600))  # Default 1 hour
        
        response.set_cookie(
            'access_token',
            tokens.get('access_token', ''),
            max_age=cookie_max_age,
            secure=True,
            httponly=True,
            samesite='Strict'
        )
        
        response.set_cookie(
            'refresh_token',
            tokens.get('refresh_token', ''),
            max_age=30 * 24 * 60 * 60,  # 30 days
            secure=True,
            httponly=True,
            samesite='Strict'
        )

        return response

    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({
            'success': False,
            'error': 'Authentication service unavailable'
        }), 503


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register new user account."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body required'
            }), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        terms_accepted = data.get('terms_accepted', False)

        # Validation
        if not email or not password or not name:
            return jsonify({
                'success': False,
                'error': 'Email, password, and name are required'
            }), 400

        if '@' not in email or '.' not in email:
            return jsonify({
                'success': False,
                'error': 'Invalid email format'
            }), 400

        if len(password) < 8:
            return jsonify({
                'success': False,
                'error': 'Password must be at least 8 characters'
            }), 400

        if not terms_accepted:
            return jsonify({
                'success': False,
                'error': 'Terms and conditions must be accepted'
            }), 400

        # Register user
        success, result = auth_service.register_user(email, password, name)
        
        if not success:
            return jsonify({
                'success': False,
                'error': result  # result contains error message
            }), 400

        user_data = result  # result contains user data on success

        # Generate initial tokens
        tokens = auth_service.generate_tokens(user_data)

        response_data = {
            'success': True,
            'data': {
                'user': {
                    'id': user_data['id'],
                    'email': user_data['email'],
                    'name': user_data['name'],
                    'roles': user_data.get('roles', [])
                },
                'tokens': tokens,
                'next_steps': [
                    'Please verify your email address',
                    'Complete your profile setup'
                ]
            },
            'message': 'Registration successful',
            'timestamp': datetime.utcnow().isoformat()
        }

        # Set secure cookies
        response = make_response(jsonify(response_data))
        response.set_cookie(
            'access_token',
            tokens.get('access_token', ''),
            max_age=8 * 60 * 60,  # 8 hours
            secure=True,
            httponly=True,
            samesite='Strict'
        )
        
        response.set_cookie(
            'refresh_token',
            tokens.get('refresh_token', ''),
            max_age=30 * 24 * 60 * 60,  # 30 days
            secure=True,
            httponly=True,
            samesite='Strict'
        )

        return response, 201

    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({
            'success': False,
            'error': 'Registration service unavailable'
        }), 503


@auth_bp.route('/logout', methods=['POST'])
@require_permission_v5('authenticated')
def logout():
    """Logout user and invalidate tokens."""
    try:
        # Get tokens from request
        access_token = request.cookies.get('access_token') or \
                      request.headers.get('Authorization', '').replace('Bearer ', '')
        refresh_token = request.cookies.get('refresh_token')

        # Invalidate tokens
        if access_token:
            auth_service.invalidate_token(access_token)
        if refresh_token:
            auth_service.invalidate_token(refresh_token)

        # Create response
        response_data = {
            'success': True,
            'message': 'Logout successful',
            'timestamp': datetime.utcnow().isoformat()
        }

        # Clear cookies
        response = make_response(jsonify(response_data))
        response.set_cookie('access_token', '', max_age=0)
        response.set_cookie('refresh_token', '', max_age=0)

        return response

    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({
            'success': False,
            'error': 'Logout failed'
        }), 500


@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token using refresh token."""
    try:
        # Get refresh token
        refresh_token = request.cookies.get('refresh_token') or \
                       request.json.get('refresh_token') if request.json else None

        if not refresh_token:
            return jsonify({
                'success': False,
                'error': 'Refresh token required'
            }), 400

        # Validate and refresh
        success, new_tokens = auth_service.refresh_access_token(refresh_token)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Token refresh failed'
            }), 401

        response_data = {
            'success': True,
            'data': {
                'tokens': new_tokens
            },
            'message': 'Token refreshed successfully',
            'timestamp': datetime.utcnow().isoformat()
        }

        # Update access token cookie
        response = make_response(jsonify(response_data))
        response.set_cookie(
            'access_token',
            new_tokens.get('access_token', ''),
            max_age=8 * 60 * 60,  # 8 hours
            secure=True,
            httponly=True,
            samesite='Strict'
        )

        return response

    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({
            'success': False,
            'error': 'Token refresh service unavailable'
        }), 503


@auth_bp.route('/profile', methods=['GET'])
@require_permission_v5('authenticated')
def get_profile():
    """Get current user profile."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User not authenticated'
            }), 401

        # Get user profile
        profile = auth_service.get_user_profile(user_id)
        
        if not profile:
            return jsonify({
                'success': False,
                'error': 'User profile not found'
            }), 404

        return jsonify({
            'success': True,
            'data': {
                'profile': profile,
                'session': {
                    'user_id': user_id,
                    'roles': getattr(g, 'user_roles', []),
                    'permissions': getattr(g, 'user_permissions', [])
                }
            },
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        return jsonify({
            'success': False,
            'error': 'Profile service unavailable'
        }), 503


@auth_bp.route('/profile', methods=['PUT'])
@require_permission_v5('authenticated')
def update_profile():
    """Update current user profile."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User not authenticated'
            }), 401

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body required'
            }), 400

        # Update profile
        update_result = auth_service.update_user_profile(user_id, data)
        
        if not update_result['success']:
            return jsonify({
                'success': False,
                'error': update_result.get('error', 'Profile update failed')
            }), 400

        return jsonify({
            'success': True,
            'data': {
                'profile': update_result['profile'],
                'message': 'Profile updated successfully'
            },
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Profile update error: {e}")
        return jsonify({
            'success': False,
            'error': 'Profile service unavailable'
        }), 503


@auth_bp.route('/change-password', methods=['POST'])
@require_permission_v5('authenticated')
def change_password():
    """Change user password."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User not authenticated'
            }), 401

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body required'
            }), 400

        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'error': 'Current password and new password are required'
            }), 400

        if len(new_password) < 8:
            return jsonify({
                'success': False,
                'error': 'New password must be at least 8 characters'
            }), 400

        # Change password
        success, message = auth_service.change_password(user_id, current_password, new_password)
        
        if not success:
            return jsonify({
                'success': False,
                'error': message
            }), 400

        return jsonify({
            'success': True,
            'message': 'Password changed successfully',
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Password change error: {e}")
        return jsonify({
            'success': False,
            'error': 'Password service unavailable'
        }), 503


@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify JWT token validity."""
    try:
        data = request.get_json()
        token = data.get('token') if data else None
        
        if not token:
            token = request.cookies.get('access_token') or \
                   request.headers.get('Authorization', '').replace('Bearer ', '')

        if not token:
            return jsonify({
                'success': False,
                'error': 'Token required'
            }), 400

        # Verify token
        payload = auth_service.verify_token(token)
        is_valid = payload is not None
        
        return jsonify({
            'success': is_valid,
            'data': {
                'valid': is_valid,
                'payload': payload if is_valid else None,
                'error': 'Invalid token' if not is_valid else None
            },
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return jsonify({
            'success': False,
            'error': 'Token verification service unavailable'
        }), 503


@auth_bp.route('/permissions', methods=['GET'])
@require_permission_v5('authenticated')
def get_permissions():
    """Get current user permissions and roles."""
    try:
        user_id = getattr(g, 'user_id', None)
        roles = getattr(g, 'user_roles', [])
        permissions = getattr(g, 'user_permissions', [])

        return jsonify({
            'success': True,
            'data': {
                'user_id': user_id,
                'roles': roles,
                'permissions': permissions,
                'role_hierarchy': auth_service.get_role_hierarchy(),
                'permission_groups': auth_service.get_permission_groups()
            },
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Permissions retrieval error: {e}")
        return jsonify({
            'success': False,
            'error': 'Permissions service unavailable'
        }), 503


# Health check endpoint
@auth_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for auth API."""
    try:
        # Test auth service
        health_status = auth_service.health_check()
        
        return jsonify({
            'success': True,
            'service': 'auth_api_v5',
            'status': 'healthy',
            'auth_service_status': health_status,
            'features': [
                'JWT authentication',
                'Role-based access control',
                'Token refresh',
                'User management'
            ],
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Auth API health check failed: {e}")
        return jsonify({
            'success': False,
            'service': 'auth_api_v5',
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503


# Export blueprint for app factory
__all__ = ['auth_bp']