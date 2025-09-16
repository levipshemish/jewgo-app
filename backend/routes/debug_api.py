#!/usr/bin/env python3
"""
Debug API routes for troubleshooting database issues
"""

from flask import request, jsonify
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from database.connection_manager import get_connection_manager
from sqlalchemy import text
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Create blueprint
debug_bp = BlueprintFactoryV5.create_blueprint(
    'debug_api', __name__, '/api/debug'
)

@debug_bp.route('/users', methods=['GET'])
def debug_users():
    """Debug endpoint to check users in database"""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            # Get all users
            result = session.execute(
                text("SELECT id, email, name FROM users ORDER BY email")
            ).fetchall()
            
            users = []
            for row in result:
                users.append({
                    'id': row[0],
                    'email': row[1],
                    'name': row[2]
                })
            
            return jsonify({
                'success': True,
                'total_users': len(users),
                'users': users
            })
            
    except Exception as e:
        logger.error(f"Debug users error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debug_bp.route('/check-email', methods=['POST'])
def debug_check_email():
    """Debug endpoint to check if email exists"""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({
                'success': False,
                'error': 'Email required'
            }), 400
            
        email = data['email'].strip().lower()
        
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            # Check if email exists
            result = session.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {'email': email}
            ).fetchone()
            
            # Also get all emails for comparison
            all_emails = session.execute(
                text("SELECT email FROM users ORDER BY email")
            ).fetchall()
            
            return jsonify({
                'success': True,
                'email': email,
                'exists': result is not None,
                'user_id': result[0] if result else None,
                'all_emails': [row[0] for row in all_emails]
            })
            
    except Exception as e:
        logger.error(f"Debug check email error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Export blueprint
__all__ = ['debug_bp']
