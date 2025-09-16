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
    'debug_api', __name__, '/api/v5/debug'
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

@debug_bp.route('/full-inspection', methods=['GET'])
def debug_full_inspection():
    """Full database inspection endpoint"""
    try:
        db_manager = get_connection_manager()
        
        inspection_results = {
            'schema_info': {},
            'users_info': {},
            'constraints_info': {},
            'summary': {}
        }
        
        with db_manager.session_scope() as session:
            # 1. Schema inspection
            try:
                # Check if users table exists
                result = session.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'users'
                    );
                """)).fetchone()
                
                inspection_results['schema_info']['users_table_exists'] = result[0] if result else False
                
                if inspection_results['schema_info']['users_table_exists']:
                    # Get table structure
                    result = session.execute(text("""
                        SELECT column_name, data_type, is_nullable, column_default
                        FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        ORDER BY ordinal_position;
                    """)).fetchall()
                    
                    inspection_results['schema_info']['columns'] = []
                    for row in result:
                        inspection_results['schema_info']['columns'].append({
                            'name': row[0],
                            'type': row[1],
                            'nullable': row[2],
                            'default': row[3]
                        })
                
            except Exception as e:
                inspection_results['schema_info']['error'] = str(e)
            
            # 2. Users inspection
            try:
                # Count total users
                result = session.execute(text("SELECT COUNT(*) FROM users")).fetchone()
                total_users = result[0] if result else 0
                inspection_results['users_info']['total_count'] = total_users
                
                if total_users > 0:
                    # Get all users
                    result = session.execute(text("""
                        SELECT id, email, name, "createdAt", "isSuperAdmin", email_verified, is_guest
                        FROM users 
                        ORDER BY "createdAt" DESC
                    """)).fetchall()
                    
                    users = []
                    test_users = []
                    emails = []
                    
                    for row in result:
                        user_data = {
                            'id': row[0],
                            'email': row[1],
                            'name': row[2],
                            'created_at': str(row[3]) if row[3] else None,
                            'is_super_admin': row[4],
                            'email_verified': row[5],
                            'is_guest': row[6]
                        }
                        users.append(user_data)
                        emails.append(row[1])
                        
                        # Check if this is a test user
                        email = row[1].lower()
                        if any(pattern in email for pattern in ['test', 'debug', 'example.com', 'admin@jewgo.app']):
                            test_users.append(user_data)
                    
                    inspection_results['users_info']['all_users'] = users
                    inspection_results['users_info']['test_users'] = test_users
                    inspection_results['users_info']['all_emails'] = emails
                    
                    # Check for duplicate emails
                    result = session.execute(text("""
                        SELECT email, COUNT(*) as count
                        FROM users 
                        GROUP BY email 
                        HAVING COUNT(*) > 1;
                    """)).fetchall()
                    
                    duplicates = []
                    for row in result:
                        duplicates.append({'email': row[0], 'count': row[1]})
                    
                    inspection_results['users_info']['duplicate_emails'] = duplicates
                
            except Exception as e:
                inspection_results['users_info']['error'] = str(e)
            
            # 3. Constraints inspection
            try:
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
                
                inspection_results['constraints_info']['email_constraints'] = constraints
                inspection_results['constraints_info']['has_unique_constraint'] = len(constraints) > 0
                
                # Check for indexes on email column
                result = session.execute(text("""
                    SELECT 
                        indexname,
                        indexdef
                    FROM pg_indexes 
                    WHERE tablename = 'users' 
                    AND indexdef LIKE '%email%';
                """)).fetchall()
                
                indexes = []
                for row in result:
                    indexes.append({
                        'name': row[0],
                        'definition': row[1]
                    })
                
                inspection_results['constraints_info']['email_indexes'] = indexes
                
            except Exception as e:
                inspection_results['constraints_info']['error'] = str(e)
            
            # 4. Summary
            inspection_results['summary'] = {
                'users_table_exists': inspection_results['schema_info'].get('users_table_exists', False),
                'total_users': inspection_results['users_info'].get('total_count', 0),
                'test_users_count': len(inspection_results['users_info'].get('test_users', [])),
                'duplicate_emails_count': len(inspection_results['users_info'].get('duplicate_emails', [])),
                'has_unique_email_constraint': inspection_results['constraints_info'].get('has_unique_constraint', False),
                'recommendations': []
            }
            
            # Generate recommendations
            recommendations = inspection_results['summary']['recommendations']
            
            if inspection_results['summary']['test_users_count'] > 0:
                recommendations.append("Clean up test users to resolve registration issues")
            
            if inspection_results['summary']['duplicate_emails_count'] > 0:
                recommendations.append("Remove duplicate email addresses")
            
            if inspection_results['summary']['has_unique_email_constraint']:
                recommendations.append("Consider removing unique constraint on email if not needed")
            
            if inspection_results['summary']['total_users'] == 0:
                recommendations.append("Database is clean - registration should work")
            
            inspection_results['summary']['recommendations'] = recommendations
            
            return jsonify({
                'success': True,
                'inspection_results': inspection_results
            })
            
    except Exception as e:
        logger.error(f"Full inspection error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debug_bp.route('/cleanup', methods=['POST'])
def debug_cleanup():
    """Cleanup endpoint to remove test users and unwanted constraints"""
    try:
        data = request.get_json() or {}
        cleanup_type = data.get('type', 'test_users')  # 'test_users', 'constraints', 'all'
        
        db_manager = get_connection_manager()
        
        cleanup_results = {
            'cleanup_type': cleanup_type,
            'actions_performed': [],
            'errors': [],
            'success': True
        }
        
        with db_manager.session_scope() as session:
            if cleanup_type in ['test_users', 'all']:
                # Clean up test users
                try:
                    # Define test email patterns
                    test_patterns = [
                        'test@example.com',
                        'debugtest@example.com', 
                        'admin@jewgo.app',
                        'admin2@jewgo.app',
                        'testadmin@jewgo.app',
                        'investigation123@test.com',
                        'uniqueuser12345@example.com',
                        'finaltest@example.com',
                        'bypasstest@example.com',
                        'integritytest@example.com',
                        'debugtest123@example.com',
                        'detailedtest@example.com'
                    ]
                    
                    # Find test users
                    test_users = []
                    for email in test_patterns:
                        result = session.execute(text("""
                            SELECT id, email, name FROM users WHERE email = :email;
                        """), {'email': email}).fetchone()
                        
                        if result:
                            test_users.append(result)
                    
                    # Also find users with test patterns
                    result = session.execute(text("""
                        SELECT id, email, name 
                        FROM users 
                        WHERE email ILIKE '%test%' 
                        OR email ILIKE '%debug%' 
                        OR email LIKE '%example.com'
                        AND email NOT IN :specific_emails;
                    """), {'specific_emails': tuple(test_patterns)}).fetchall()
                    
                    test_users.extend(result)
                    
                    # Delete test users and their associated data
                    deleted_count = 0
                    for user in test_users:
                        user_id = user[0]
                        
                        # Delete associated data first
                        session.execute(text("DELETE FROM user_roles WHERE user_id = :user_id;"), {'user_id': user_id})
                        session.execute(text("DELETE FROM auth_sessions WHERE user_id = :user_id;"), {'user_id': user_id})
                        session.execute(text("DELETE FROM auth_audit_log WHERE user_id = :user_id;"), {'user_id': user_id})
                        session.execute(text("DELETE FROM accounts WHERE userId = :user_id;"), {'user_id': user_id})
                        
                        # Delete the user
                        session.execute(text("DELETE FROM users WHERE id = :user_id;"), {'user_id': user_id})
                        
                        deleted_count += 1
                        cleanup_results['actions_performed'].append(f"Deleted test user: {user[1]} (ID: {user[0]})")
                    
                    if deleted_count > 0:
                        cleanup_results['actions_performed'].append(f"Total test users deleted: {deleted_count}")
                    else:
                        cleanup_results['actions_performed'].append("No test users found to delete")
                        
                except Exception as e:
                    cleanup_results['errors'].append(f"Error cleaning test users: {str(e)}")
                    cleanup_results['success'] = False
            
            if cleanup_type in ['constraints', 'all']:
                # Remove unique constraints on email
                try:
                    # Check for unique constraints
                    result = session.execute(text("""
                        SELECT 
                            tc.constraint_name,
                            tc.constraint_type
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu 
                            ON tc.constraint_name = kcu.constraint_name
                        WHERE tc.table_name = 'users' 
                        AND kcu.column_name = 'email'
                        AND tc.constraint_type = 'UNIQUE';
                    """)).fetchall()
                    
                    constraints_removed = 0
                    for row in result:
                        constraint_name = row[0]
                        try:
                            session.execute(text(f"ALTER TABLE users DROP CONSTRAINT {constraint_name};"))
                            cleanup_results['actions_performed'].append(f"Removed constraint: {constraint_name}")
                            constraints_removed += 1
                        except Exception as e:
                            cleanup_results['errors'].append(f"Failed to remove constraint {constraint_name}: {str(e)}")
                    
                    if constraints_removed == 0:
                        cleanup_results['actions_performed'].append("No unique constraints found on email column")
                    else:
                        cleanup_results['actions_performed'].append(f"Total constraints removed: {constraints_removed}")
                        
                except Exception as e:
                    cleanup_results['errors'].append(f"Error removing constraints: {str(e)}")
                    cleanup_results['success'] = False
        
        return jsonify({
            'success': cleanup_results['success'],
            'cleanup_results': cleanup_results
        })
        
    except Exception as e:
        logger.error(f"Cleanup error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debug_bp.route('/fix-user-roles', methods=['POST'])
def debug_fix_user_roles():
    """Fix user roles foreign key constraint issue"""
    try:
        db_manager = get_connection_manager()
        
        fix_results = {
            'actions_performed': [],
            'errors': [],
            'success': True
        }
        
        with db_manager.session_scope() as session:
            # Step 1: Check if user_roles table exists
            result = session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_roles'
                );
            """)).fetchone()
            
            if not result or not result[0]:
                fix_results['errors'].append("user_roles table does not exist")
                fix_results['success'] = False
                return jsonify({'success': False, 'fix_results': fix_results}), 400
            
            fix_results['actions_performed'].append("✅ user_roles table exists")
            
            # Step 2: Check current foreign key constraints on granted_by
            result = session.execute(text("""
                SELECT 
                    tc.constraint_name,
                    kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'user_roles'
                AND kcu.column_name = 'granted_by'
                AND tc.constraint_type = 'FOREIGN KEY';
            """)).fetchall()
            
            if result:
                fix_results['actions_performed'].append(f"Found {len(result)} foreign key constraints on granted_by")
                
                # Drop the foreign key constraints
                for row in result:
                    constraint_name = row[0]
                    try:
                        session.execute(text(f"ALTER TABLE user_roles DROP CONSTRAINT {constraint_name};"))
                        fix_results['actions_performed'].append(f"✅ Dropped constraint: {constraint_name}")
                    except Exception as e:
                        fix_results['errors'].append(f"Failed to drop constraint {constraint_name}: {str(e)}")
                        fix_results['success'] = False
                
                # Make granted_by nullable
                try:
                    session.execute(text("ALTER TABLE user_roles ALTER COLUMN granted_by DROP NOT NULL;"))
                    fix_results['actions_performed'].append("✅ Made granted_by column nullable")
                except Exception as e:
                    fix_results['errors'].append(f"Failed to make granted_by nullable: {str(e)}")
                    fix_results['success'] = False
                
                # Set default value for granted_by
                try:
                    session.execute(text("ALTER TABLE user_roles ALTER COLUMN granted_by SET DEFAULT 'system';"))
                    fix_results['actions_performed'].append("✅ Set default value for granted_by to 'system'")
                except Exception as e:
                    fix_results['errors'].append(f"Failed to set default for granted_by: {str(e)}")
                    fix_results['success'] = False
            else:
                fix_results['actions_performed'].append("✅ No foreign key constraints found on granted_by column")
            
            # Step 3: Test user role creation
            try:
                # Get the existing admin user
                result = session.execute(text("""
                    SELECT id FROM users WHERE email = 'admin@jewgo.app' LIMIT 1;
                """)).fetchone()
                
                if result:
                    user_id = result[0]
                    fix_results['actions_performed'].append(f"✅ Found admin user with ID: {user_id}")
                    
                    # Test creating a user role
                    session.execute(text("""
                        INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active, created_at, updated_at)
                        VALUES (:user_id, 'user', 1, NOW(), :user_id, TRUE, NOW(), NOW())
                        ON CONFLICT (user_id, role) DO NOTHING;
                    """), {'user_id': user_id})
                    
                    fix_results['actions_performed'].append("✅ Successfully created test user role")
                    
                    # Verify the role was created
                    result = session.execute(text("""
                        SELECT role, level, granted_by FROM user_roles 
                        WHERE user_id = :user_id AND role = 'user';
                    """), {'user_id': user_id}).fetchone()
                    
                    if result:
                        fix_results['actions_performed'].append(f"✅ Role verified: {result[0]} (level {result[1]}, granted by {result[2]})")
                    else:
                        fix_results['errors'].append("Role was not created or verified")
                        fix_results['success'] = False
                else:
                    fix_results['errors'].append("No admin user found to test with")
                    fix_results['success'] = False
                    
            except Exception as e:
                fix_results['errors'].append(f"Failed to test user role creation: {str(e)}")
                fix_results['success'] = False
        
        return jsonify({
            'success': fix_results['success'],
            'fix_results': fix_results
        })
        
    except Exception as e:
        logger.error(f"Fix user roles error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Export blueprint
__all__ = ['debug_bp']
