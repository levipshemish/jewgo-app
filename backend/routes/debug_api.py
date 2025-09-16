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

@debug_bp.route('/schema/constraints', methods=['GET'])
def debug_schema_constraints():
    """Debug endpoint to check database schema constraints"""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            # Check for unique constraints on email column
            result = session.execute(text("""
                SELECT 
                    tc.constraint_name,
                    tc.constraint_type,
                    kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'users' 
                AND kcu.column_name = 'email'
                AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');
            """)).fetchall()
            
            constraints = []
            for row in result:
                constraints.append({
                    'name': row[0],
                    'type': row[1],
                    'column': row[2]
                })
            
            # Check for indexes on email column
            index_result = session.execute(text("""
                SELECT 
                    indexname,
                    indexdef
                FROM pg_indexes 
                WHERE tablename = 'users' 
                AND indexdef LIKE '%email%';
            """)).fetchall()
            
            indexes = []
            for row in index_result:
                indexes.append({
                    'name': row[0],
                    'definition': row[1]
                })
            
            return jsonify({
                'success': True,
                'constraints': constraints,
                'indexes': indexes,
                'has_unique_constraint': len(constraints) > 0
            })
            
    except Exception as e:
        logger.error(f"Debug schema constraints error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debug_bp.route('/test-users', methods=['GET'])
def debug_test_users():
    """Debug endpoint to check for test users"""
    try:
        db_manager = get_connection_manager()
        
        with db_manager.session_scope() as session:
            # Get all users
            result = session.execute(text("""
                SELECT id, email, name, "createdAt", "isSuperAdmin"
                FROM users 
                ORDER BY "createdAt" DESC
            """)).fetchall()
            
            users = []
            test_users = []
            
            for row in result:
                user_data = {
                    'id': row[0],
                    'email': row[1],
                    'name': row[2],
                    'created_at': str(row[3]) if row[3] else None,
                    'is_super_admin': row[4]
                }
                users.append(user_data)
                
                # Check if this is a test user
                email = row[1].lower()
                if any(pattern in email for pattern in ['test', 'debug', 'example.com', 'admin@jewgo.app']):
                    test_users.append(user_data)
            
            return jsonify({
                'success': True,
                'total_users': len(users),
                'test_users': test_users,
                'all_users': users
            })
            
    except Exception as e:
        logger.error(f"Debug test users error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Export blueprint
__all__ = ['debug_bp']
