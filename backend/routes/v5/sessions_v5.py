#!/usr/bin/env python3
"""
Session Management API v5

Provides endpoints for managing user sessions, including listing active sessions,
revoking individual sessions, and revoking all sessions for a user.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any
from datetime import datetime
from utils.logging_config import get_logger
from middleware.auth_decorators import auth_required
from services.auth_service_v5 import AuthServiceV5
from cache.redis_manager_v5 import get_redis_manager_v5
from database.connection_manager import get_connection_manager

logger = get_logger(__name__)

# Create blueprint
sessions_bp = Blueprint('sessions_v5', __name__, url_prefix='/api/v5/auth/sessions')

# Initialize services
auth_service = AuthServiceV5()
redis_manager = get_redis_manager_v5()
connection_manager = get_connection_manager()


def parse_user_agent(user_agent: str) -> Dict[str, str]:
    """
    Parse user agent string to extract device information.
    
    Args:
        user_agent: User agent string
        
    Returns:
        Dictionary with device information
    """
    user_agent_lower = user_agent.lower()
    
    # Detect device type
    if any(mobile in user_agent_lower for mobile in ['mobile', 'android', 'iphone', 'ipod']):
        device_type = 'mobile'
    elif any(tablet in user_agent_lower for tablet in ['tablet', 'ipad']):
        device_type = 'tablet'
    elif any(desktop in user_agent_lower for desktop in ['windows', 'macintosh', 'linux', 'x11']):
        device_type = 'desktop'
    else:
        device_type = 'unknown'
    
    # Detect browser
    if 'chrome' in user_agent_lower and 'edg' not in user_agent_lower:
        browser = 'Chrome'
    elif 'firefox' in user_agent_lower:
        browser = 'Firefox'
    elif 'safari' in user_agent_lower and 'chrome' not in user_agent_lower:
        browser = 'Safari'
    elif 'edg' in user_agent_lower:
        browser = 'Edge'
    elif 'opera' in user_agent_lower:
        browser = 'Opera'
    else:
        browser = 'Unknown'
    
    # Detect OS
    if 'windows' in user_agent_lower:
        os_name = 'Windows'
    elif 'macintosh' in user_agent_lower or 'mac os' in user_agent_lower:
        os_name = 'macOS'
    elif 'linux' in user_agent_lower:
        os_name = 'Linux'
    elif 'android' in user_agent_lower:
        os_name = 'Android'
    elif 'iphone' in user_agent_lower or 'ipad' in user_agent_lower:
        os_name = 'iOS'
    else:
        os_name = 'Unknown'
    
    return {
        'device_type': device_type,
        'browser': browser,
        'os': os_name
    }


def get_client_ip() -> str:
    """Get client IP address from request headers."""
    # Check for forwarded headers (from proxy/load balancer)
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip
    
    return request.remote_addr or 'unknown'


def get_location_info(ip_address: str) -> Dict[str, Any]:
    """
    Get location information for IP address.
    In a real implementation, this would use a geolocation service.
    
    Args:
        ip_address: IP address
        
    Returns:
        Dictionary with location information
    """
    # For now, return mock data
    # In production, integrate with a service like MaxMind GeoIP2
    return {
        'ip_address': ip_address,
        'city': 'New York',
        'country': 'United States',
        'is_vpn': False  # Would be determined by IP reputation service
    }


@sessions_bp.route('', methods=['GET'])
@auth_required
def list_sessions():
    """
    List all active sessions for the current user.
    
    Returns:
        JSON response with list of active sessions
    """
    try:
        user_id = g.current_user['id']
        
        # Get sessions from database
        with connection_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Query active sessions
            query = """
                SELECT 
                    id,
                    family_id,
                    current_jti,
                    user_agent,
                    ip_address,
                    created_at,
                    last_used,
                    expires_at,
                    device_hash
                FROM auth_sessions 
                WHERE user_id = %s 
                AND revoked_at IS NULL 
                AND expires_at > NOW()
                ORDER BY last_used DESC
            """
            
            cursor.execute(query, (user_id,))
            sessions = cursor.fetchall()
            
            # Get current session ID from token
            current_session_id = g.token_payload.get('sid')
            
            # Format sessions
            formatted_sessions = []
            for session in sessions:
                session_id, family_id, current_jti, user_agent, ip_address, created_at, last_used, expires_at, device_hash = session
                
                # Parse user agent
                device_info = parse_user_agent(user_agent or '')
                
                # Get location info
                location_info = get_location_info(ip_address or 'unknown')
                
                # Check if this is the current session
                is_current = (current_jti == current_session_id) if current_session_id else False
                
                formatted_session = {
                    'id': session_id,
                    'family_id': family_id,
                    'device_info': {
                        'user_agent': user_agent or '',
                        'device_type': device_info['device_type'],
                        'browser': device_info['browser'],
                        'os': device_info['os']
                    },
                    'location': location_info,
                    'created_at': created_at.isoformat() if created_at else None,
                    'last_used': last_used.isoformat() if last_used else None,
                    'expires_at': expires_at.isoformat() if expires_at else None,
                    'is_current': is_current
                }
                
                formatted_sessions.append(formatted_session)
            
            logger.info(f"Listed {len(formatted_sessions)} active sessions for user {user_id}")
            
            return jsonify({
                'success': True,
                'sessions': formatted_sessions,
                'total': len(formatted_sessions)
            })
            
    except Exception as e:
        logger.error(f"Error listing sessions for user {user_id}: {e}")
        return jsonify({
            'success': False,
            'error': {
                'type': 'SESSION_LIST_ERROR',
                'message': 'Failed to list sessions',
                'details': str(e)
            }
        }), 500


@sessions_bp.route('/<session_id>', methods=['DELETE'])
@auth_required
def revoke_session(session_id: str):
    """
    Revoke a specific session.
    
    Args:
        session_id: Session ID to revoke
        
    Returns:
        JSON response indicating success or failure
    """
    try:
        user_id = g.current_user['id']
        
        # Verify session belongs to user
        with connection_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if session exists and belongs to user
            query = """
                SELECT id, family_id, current_jti 
                FROM auth_sessions 
                WHERE id = %s AND user_id = %s AND revoked_at IS NULL
            """
            
            cursor.execute(query, (session_id, user_id))
            session = cursor.fetchone()
            
            if not session:
                return jsonify({
                    'success': False,
                    'error': {
                        'type': 'SESSION_NOT_FOUND',
                        'message': 'Session not found or already revoked'
                    }
                }), 404
            
            session_id_found, family_id, current_jti = session
            
            # Check if this is the current session
            current_session_id = g.token_payload.get('sid')
            is_current_session = (current_jti == current_session_id) if current_session_id else False
            
            if is_current_session:
                return jsonify({
                    'success': False,
                    'error': {
                        'type': 'CANNOT_REVOKE_CURRENT',
                        'message': 'Cannot revoke current session from this interface'
                    }
                }), 400
            
            # Revoke the session
            revoke_query = """
                UPDATE auth_sessions 
                SET revoked_at = NOW(), revoked_reason = 'user_revoked'
                WHERE id = %s AND user_id = %s
            """
            
            cursor.execute(revoke_query, (session_id, user_id))
            conn.commit()
            
            # Invalidate any cached tokens for this session
            if current_jti:
                auth_service.invalidate_token(current_jti)
            
            logger.info(f"Session {session_id} revoked by user {user_id}")
            
            return jsonify({
                'success': True,
                'message': 'Session revoked successfully'
            })
            
    except Exception as e:
        logger.error(f"Error revoking session {session_id} for user {user_id}: {e}")
        return jsonify({
            'success': False,
            'error': {
                'type': 'SESSION_REVOKE_ERROR',
                'message': 'Failed to revoke session',
                'details': str(e)
            }
        }), 500


@sessions_bp.route('/revoke-all', methods=['POST'])
@auth_required
def revoke_all_sessions():
    """
    Revoke all sessions for the current user except the current one.
    
    Returns:
        JSON response indicating success or failure
    """
    try:
        user_id = g.current_user['id']
        current_session_id = g.token_payload.get('sid')
        
        with connection_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get all active sessions for user
            query = """
                SELECT id, current_jti 
                FROM auth_sessions 
                WHERE user_id = %s 
                AND revoked_at IS NULL 
                AND expires_at > NOW()
            """
            
            cursor.execute(query, (user_id,))
            sessions = cursor.fetchall()
            
            if not sessions:
                return jsonify({
                    'success': True,
                    'message': 'No active sessions to revoke',
                    'revoked_count': 0
                })
            
            # Revoke all sessions except current one
            revoked_count = 0
            revoked_tokens = []
            
            for session_id, current_jti in sessions:
                # Skip current session
                if current_jti == current_session_id:
                    continue
                
                # Revoke session
                revoke_query = """
                    UPDATE auth_sessions 
                    SET revoked_at = NOW(), revoked_reason = 'user_revoked_all'
                    WHERE id = %s AND user_id = %s
                """
                
                cursor.execute(revoke_query, (session_id, user_id))
                revoked_count += 1
                
                # Collect tokens for invalidation
                if current_jti:
                    revoked_tokens.append(current_jti)
            
            conn.commit()
            
            # Invalidate all revoked tokens
            for token in revoked_tokens:
                auth_service.invalidate_token(token)
            
            logger.info(f"Revoked {revoked_count} sessions for user {user_id}")
            
            return jsonify({
                'success': True,
                'message': f'Revoked {revoked_count} sessions successfully',
                'revoked_count': revoked_count
            })
            
    except Exception as e:
        logger.error(f"Error revoking all sessions for user {user_id}: {e}")
        return jsonify({
            'success': False,
            'error': {
                'type': 'SESSIONS_REVOKE_ALL_ERROR',
                'message': 'Failed to revoke all sessions',
                'details': str(e)
            }
        }), 500


@sessions_bp.route('/<session_id>/info', methods=['GET'])
@auth_required
def get_session_info(session_id: str):
    """
    Get detailed information about a specific session.
    
    Args:
        session_id: Session ID
        
    Returns:
        JSON response with session details
    """
    try:
        user_id = g.current_user['id']
        
        with connection_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get session details
            query = """
                SELECT 
                    id,
                    family_id,
                    current_jti,
                    user_agent,
                    ip_address,
                    created_at,
                    last_used,
                    expires_at,
                    device_hash,
                    revoked_at,
                    revoked_reason
                FROM auth_sessions 
                WHERE id = %s AND user_id = %s
            """
            
            cursor.execute(query, (session_id, user_id))
            session = cursor.fetchone()
            
            if not session:
                return jsonify({
                    'success': False,
                    'error': {
                        'type': 'SESSION_NOT_FOUND',
                        'message': 'Session not found'
                    }
                }), 404
            
            (session_id_found, family_id, current_jti, user_agent, ip_address, 
             created_at, last_used, expires_at, device_hash, revoked_at, revoked_reason) = session
            
            # Parse user agent
            device_info = parse_user_agent(user_agent or '')
            
            # Get location info
            location_info = get_location_info(ip_address or 'unknown')
            
            # Check if this is the current session
            current_session_id = g.token_payload.get('sid')
            is_current = (current_jti == current_session_id) if current_session_id else False
            
            session_info = {
                'id': session_id_found,
                'family_id': family_id,
                'device_info': {
                    'user_agent': user_agent or '',
                    'device_type': device_info['device_type'],
                    'browser': device_info['browser'],
                    'os': device_info['os']
                },
                'location': location_info,
                'created_at': created_at.isoformat() if created_at else None,
                'last_used': last_used.isoformat() if last_used else None,
                'expires_at': expires_at.isoformat() if expires_at else None,
                'revoked_at': revoked_at.isoformat() if revoked_at else None,
                'revoked_reason': revoked_reason,
                'is_current': is_current,
                'is_active': revoked_at is None and (expires_at is None or expires_at > datetime.utcnow())
            }
            
            return jsonify({
                'success': True,
                'session': session_info
            })
            
    except Exception as e:
        logger.error(f"Error getting session info for {session_id}: {e}")
        return jsonify({
            'success': False,
            'error': {
                'type': 'SESSION_INFO_ERROR',
                'message': 'Failed to get session information',
                'details': str(e)
            }
        }), 500


@sessions_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for session management.
    
    Returns:
        JSON response with health status
    """
    try:
        # Test database connection
        with connection_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            db_healthy = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_healthy = False
    
    # Test Redis connection
    try:
        redis_manager.health_check()
        redis_healthy = True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        redis_healthy = False
    
    status = 'healthy' if db_healthy and redis_healthy else 'unhealthy'
    
    return jsonify({
        'status': status,
        'database': db_healthy,
        'redis': redis_healthy,
        'timestamp': datetime.utcnow().isoformat()
    }), 200 if status == 'healthy' else 503
