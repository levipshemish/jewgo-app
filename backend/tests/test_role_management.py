import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from services.user_service_v4 import UserServiceV4
from database.database_manager_v4 import DatabaseManager
from utils.error_handler import ValidationError
from routes.api_v4 import api_v4
from app_factory import create_app


class TestRoleManagement:
    """Test suite for role management functionality."""
    
    @pytest.fixture
    def app(self):
        """Create Flask app for testing."""
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    @pytest.fixture
    def user_service(self):
        """Create a UserServiceV4 instance for testing."""
        db_manager = Mock(spec=DatabaseManager)
        return UserServiceV4(db_manager=db_manager)
    
    @pytest.fixture
    def db_manager(self):
        """Create a DatabaseManager instance for testing."""
        return DatabaseManager()
    
    @pytest.fixture
    def admin_user(self):
        """Create a mock admin user."""
        return {
            'id': 'admin-123',
            'email': 'admin@example.com',
            'name': 'Admin User',
            'role': 'super_admin'
        }
    
    @pytest.fixture
    def regular_user(self):
        """Create a mock regular user."""
        return {
            'id': 'user-456',
            'email': 'user@example.com',
            'name': 'Regular User',
            'role': None
        }
    
    @pytest.fixture
    def test_users(self):
        """Create multiple test users."""
        return [
            {
                'id': f'user-{i}',
                'email': f'user{i}@example.com',
                'name': f'User {i}',
                'role': None
            }
            for i in range(1, 6)
        ]

    def test_assign_user_role_success(self, user_service, admin_user, regular_user):
        """Test successful role assignment."""
        with patch.object(user_service.db_manager, 'assign_admin_role', return_value={'success': True}):
            result = user_service.assign_user_role(
                target_user_id=regular_user['id'],
                role='moderator',
                assigned_by_user_id=admin_user['id'],
                expires_at=None,
                notes='Test assignment'
            )
            
            assert result == {'success': True}
            user_service.db_manager.assign_admin_role.assert_called_once_with(
                target_user_id=regular_user['id'],
                role='moderator',
                assigned_by_user_id=admin_user['id'],
                expires_at=None,
                notes='Test assignment'
            )

    def test_assign_user_role_invalid_role(self, user_service, admin_user, regular_user):
        """Test role assignment with invalid role."""
        with pytest.raises(ValidationError, match="Invalid role"):
            user_service.assign_user_role(
                target_user_id=regular_user['id'],
                role='invalid_role',
                assigned_by_user_id=admin_user['id']
            )

    def test_assign_user_role_with_expiration(self, user_service, admin_user, regular_user):
        """Test role assignment with expiration date."""
        expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat()
        
        with patch.object(user_service.db_manager, 'assign_admin_role', return_value={'success': True}):
            result = user_service.assign_user_role(
                target_user_id=regular_user['id'],
                role='data_admin',
                assigned_by_user_id=admin_user['id'],
                expires_at=expires_at,
                notes='Temporary assignment'
            )
            
            assert result == {'success': True}
            user_service.db_manager.assign_admin_role.assert_called_once_with(
                target_user_id=regular_user['id'],
                role='data_admin',
                assigned_by_user_id=admin_user['id'],
                expires_at=expires_at,
                notes='Temporary assignment'
            )

    def test_revoke_user_role_success(self, user_service, admin_user, regular_user):
        """Test successful role revocation."""
        with patch.object(user_service.db_manager, 'remove_admin_role', return_value={'success': True}):
            result = user_service.revoke_user_role(
                target_user_id=regular_user['id'],
                role='moderator',
                removed_by_user_id=admin_user['id']
            )
            
            assert result == {'success': True}
            user_service.db_manager.remove_admin_role.assert_called_once_with(
                target_user_id=regular_user['id'],
                role='moderator',
                removed_by_user_id=admin_user['id']
            )

    def test_revoke_user_role_failure(self, user_service, admin_user, regular_user):
        """Test role revocation failure."""
        with patch.object(user_service.db_manager, 'remove_admin_role', return_value={'success': False, 'error': 'Failed'}):
            result = user_service.revoke_user_role(
                target_user_id=regular_user['id'],
                role='moderator',
                removed_by_user_id=admin_user['id']
            )
            
            assert result == {'success': False, 'error': 'Failed'}

    def test_get_user_roles_single_user(self, user_service, regular_user):
        """Test getting roles for a single user."""
        mock_result = {
            'users': [{
                'id': regular_user['id'],
                'name': regular_user['name'],
                'email': regular_user['email'],
                'role': 'moderator',
                'role_level': 1,
                'assigned_at': datetime.utcnow().isoformat()
            }],
            'total': 1,
            'page': 1,
            'limit': 50,
            'has_more': False
        }
        
        with patch.object(user_service.db_manager, 'get_admin_roles', return_value=mock_result):
            result = user_service.get_user_roles(user_id=regular_user['id'])
            
            assert result == mock_result
            user_service.db_manager.get_admin_roles.assert_called_once_with(
                user_id=regular_user['id'],
                limit=50,
                offset=0,
                search='',
                role_filter=None,
                include_all=False
            )

    def test_get_user_roles_with_pagination(self, user_service):
        """Test getting user roles with pagination."""
        mock_result = {
            'users': [],
            'total': 100,
            'page': 2,
            'limit': 25,
            'has_more': True
        }
        
        with patch.object(user_service.db_manager, 'get_admin_roles', return_value=mock_result):
            result = user_service.get_user_roles(page=2, limit=25)
            
            assert result == mock_result
            user_service.db_manager.get_admin_roles.assert_called_once_with(
                user_id=None,
                limit=25,
                offset=25,  # (page - 1) * limit
                search='',
                role_filter=None,
                include_all=False
            )

    def test_get_user_roles_with_search(self, user_service):
        """Test getting user roles with search filter."""
        search_term = 'john'
        mock_result = {
            'users': [],
            'total': 0,
            'page': 1,
            'limit': 50,
            'has_more': False
        }
        
        with patch.object(user_service.db_manager, 'get_admin_roles', return_value=mock_result):
            result = user_service.get_user_roles(search=search_term)
            
            assert result == mock_result
            user_service.db_manager.get_admin_roles.assert_called_once_with(
                user_id=None,
                limit=50,
                offset=0,
                search=search_term,
                role_filter=None,
                include_all=False
            )

    def test_get_available_roles(self, user_service):
        """Test getting available roles."""
        result = user_service.get_available_roles()
        
        assert isinstance(result, list)
        assert len(result) == 4
        
        # Check role structure
        for role in result:
            assert 'name' in role
            assert 'level' in role
            assert 'description' in role
            assert 'permissions' in role
            assert isinstance(role['permissions'], list)
        
        # Check specific roles
        role_names = [role['name'] for role in result]
        assert 'moderator' in role_names
        assert 'data_admin' in role_names
        assert 'system_admin' in role_names
        assert 'super_admin' in role_names
        
        # Check role hierarchy
        role_levels = {role['name']: role['level'] for role in result}
        assert role_levels['moderator'] == 1
        assert role_levels['data_admin'] == 2
        assert role_levels['system_admin'] == 3
        assert role_levels['super_admin'] == 4

    def test_database_manager_supabase_rpc_success(self, db_manager):
        """Test successful Supabase RPC call."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'success': True, 'data': 'test'}
        
        with patch('requests.post', return_value=mock_response):
            result = db_manager.call_supabase_rpc('test_function', {'param': 'value'})
            
            assert result == {'success': True, 'data': 'test'}

    def test_database_manager_supabase_rpc_failure(self, db_manager):
        """Test Supabase RPC call failure."""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = 'Bad Request'
        
        with patch('requests.post', return_value=mock_response):
            result = db_manager.call_supabase_rpc('test_function', {'param': 'value'})
            
            assert 'error' in result
            assert 'RPC call failed: 400' in result['error']

    def test_database_manager_supabase_rpc_exception(self, db_manager):
        """Test Supabase RPC call with exception."""
        with patch('requests.post', side_effect=Exception('Connection error')):
            result = db_manager.call_supabase_rpc('test_function', {'param': 'value'})
            
            assert 'error' in result
            assert 'RPC call error: Connection error' in result['error']

    def test_database_manager_assign_admin_role(self, db_manager):
        """Test database manager assign admin role."""
        with patch.object(db_manager, 'call_supabase_rpc', return_value={'success': True}):
            result = db_manager.assign_admin_role(
                target_user_id='user-123',
                role='moderator',
                assigned_by_user_id='admin-456',
                expires_at=None,
                notes='Test'
            )
            
            assert result == {'success': True}
            db_manager.call_supabase_rpc.assert_called_once_with('assign_admin_role', {
                'p_user_id': 'user-123',
                'p_role': 'moderator',
                'p_assigned_by': 'admin-456',
                'p_notes': 'Test'
            })

    def test_database_manager_remove_admin_role(self, db_manager):
        """Test database manager remove admin role."""
        with patch.object(db_manager, 'call_supabase_rpc', return_value={'success': True}):
            result = db_manager.remove_admin_role(
                target_user_id='user-123',
                role='moderator',
                removed_by_user_id='admin-456'
            )
            
            assert result == {'success': True}
            db_manager.call_supabase_rpc.assert_called_once_with('remove_admin_role', {
                'p_user_id': 'user-123',
                'p_role': 'moderator',
                'p_removed_by': 'admin-456'
            })

    def test_database_manager_get_admin_roles_success(self, db_manager):
        """Test database manager get admin roles success."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                'id': 1,
                'user_id': 'user-123',
                'role': 'moderator',
                'assigned_at': '2024-01-01T00:00:00Z',
                'users': {'id': 'user-123', 'name': 'Test User', 'email': 'test@example.com'}
            }
        ]
        
        count_response = Mock()
        count_response.status_code = 200
        count_response.json.return_value = [{'count': 1}]
        
        with patch('requests.get', side_effect=[mock_response, count_response]):
            result = db_manager.get_admin_roles(limit=10, offset=0)
            
            assert 'users' in result
            assert len(result['users']) == 1
            assert result['total'] == 1
            assert result['page'] == 1
            assert result['limit'] == 10

    def test_database_manager_get_admin_roles_failure(self, db_manager):
        """Test database manager get admin roles failure."""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = 'Internal Server Error'
        
        with patch('requests.get', return_value=mock_response):
            result = db_manager.get_admin_roles()
            
            assert result['users'] == []
            assert result['total'] == 0
            assert result['page'] == 1
            assert result['limit'] == 50

    def test_database_manager_supabase_not_configured(self, db_manager):
        """Test database manager with Supabase not configured."""
        # Temporarily disable Supabase
        db_manager.supabase_enabled = False
        
        result = db_manager.call_supabase_rpc('test_function', {})
        assert 'error' in result
        assert 'Supabase not configured' in result['error']
        
        result = db_manager.get_admin_roles()
        assert result['users'] == []
        assert result['total'] == 0

    def test_role_hierarchy_validation(self):
        """Test role hierarchy validation."""
        from backend.services.user_service_v4 import UserServiceV4
        
        user_service = UserServiceV4()
        roles = user_service.get_available_roles()
        
        # Verify role hierarchy
        role_levels = {role['name']: role['level'] for role in roles}
        
        # Higher roles should have higher levels
        assert role_levels['moderator'] < role_levels['data_admin']
        assert role_levels['data_admin'] < role_levels['system_admin']
        assert role_levels['system_admin'] < role_levels['super_admin']
        
        # Verify permissions inheritance
        for role in roles:
            if role['name'] == 'super_admin':
                assert 'role:manage' in role['permissions']
                assert 'admin:all' in role['permissions']
            elif role['name'] == 'system_admin':
                assert 'user:manage' in role['permissions']
                assert 'system:configure' in role['permissions']
            elif role['name'] == 'data_admin':
                assert 'data:view' in role['permissions']
                assert 'analytics:view' in role['permissions']
            elif role['name'] == 'moderator':
                assert 'content:moderate' in role['permissions']
                assert 'user:view' in role['permissions']

    def test_error_handling_in_role_operations(self, user_service):
        """Test error handling in role operations."""
        # Test database error in role assignment
        with patch.object(user_service.db_manager, 'assign_admin_role', side_effect=Exception('Database error')):
            with pytest.raises(Exception, match='Database error'):
                user_service.assign_user_role(
                    target_user_id='user-123',
                    role='moderator',
                    assigned_by_user_id='admin-456'
                )
        
        # Test database error in role revocation
        with patch.object(user_service.db_manager, 'remove_admin_role', side_effect=Exception('Database error')):
            with pytest.raises(Exception, match='Database error'):
                user_service.revoke_user_role(
                    target_user_id='user-123',
                    role='moderator',
                    removed_by_user_id='admin-456'
                )
        
        # Test database error in getting roles
        with patch.object(user_service.db_manager, 'get_admin_roles', side_effect=Exception('Database error')):
            with pytest.raises(Exception, match='Database error'):
                user_service.get_user_roles()

    def test_logging_in_role_operations(self, user_service, admin_user, regular_user):
        """Test logging in role operations."""
        with patch.object(user_service.db_manager, 'assign_admin_role', return_value={'success': True}):
            with patch.object(user_service.logger, 'info') as mock_logger:
                user_service.assign_user_role(
                    target_user_id=regular_user['id'],
                    role='moderator',
                    assigned_by_user_id=admin_user['id']
                )
                
                # Verify logging was called
                mock_logger.assert_called()
                log_call = mock_logger.call_args
                assert 'Successfully assigned admin role' in str(log_call)
                assert regular_user['id'] in str(log_call)
                assert 'moderator' in str(log_call)

        with patch.object(user_service.db_manager, 'remove_admin_role', return_value={'success': True}):
            with patch.object(user_service.logger, 'info') as mock_logger:
                user_service.revoke_user_role(
                    target_user_id=regular_user['id'],
                    role='moderator',
                    removed_by_user_id=admin_user['id']
                )
                
                # Verify logging was called
                mock_logger.assert_called()
                log_call = mock_logger.call_args
                assert 'Successfully revoked admin role' in str(log_call)
                assert regular_user['id'] in str(log_call)
                assert 'moderator' in str(log_call)

    # Flask endpoint tests
    def test_assign_role_endpoint_success(self, client):
        """Test successful role assignment via Flask endpoint."""
        # Patch the security decorator to bypass authentication
        with patch('routes.api_v4.require_super_admin_auth') as mock_auth:
            # Create a no-op decorator that just returns the function
            def no_op_decorator(f):
                return f
            mock_auth.return_value = no_op_decorator
            
            with patch('backend.routes.api_v4.create_user_service') as mock_service:
                mock_service_instance = Mock()
                mock_service_instance.assign_user_role.return_value = {'success': True}
                mock_service.return_value = mock_service_instance
                
                response = client.post('/api/v4/admin/roles/assign', 
                    json={
                        'user_id': 'user-456',
                        'role': 'moderator',
                        'expires_at': None,
                        'notes': 'Test assignment'
                    }
                )
                
                assert response.status_code == 200
                data = response.get_json()
                assert data['success'] is True
                assert 'Role assigned successfully' in data['message']

    def test_assign_role_endpoint_unauthorized(self, client):
        """Test role assignment without authentication."""
        response = client.post('/api/v4/admin/roles/assign', 
            json={
                'user_id': 'user-456',
                'role': 'moderator'
            }
        )
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'Authentication required' in data['error']

    def test_assign_role_endpoint_insufficient_permissions(self, client):
        """Test role assignment with insufficient permissions."""
        with patch('backend.routes.api_v4.get_current_supabase_user') as mock_user:
            mock_user.return_value = {
                'id': 'admin-123',
                'role': 'moderator'  # Not super_admin
            }
            
            response = client.post('/api/v4/admin/roles/assign', 
                json={
                    'user_id': 'user-456',
                    'role': 'moderator'
                }
            )
            
            assert response.status_code == 403
            data = response.get_json()
            assert 'super_admin role required' in data['error']

    def test_assign_role_endpoint_invalid_payload(self, client):
        """Test role assignment with invalid payload."""
        with patch('backend.routes.api_v4.get_current_supabase_user') as mock_user:
            mock_user.return_value = {
                'id': 'admin-123',
                'role': 'super_admin'
            }
            
            # Missing required fields
            response = client.post('/api/v4/admin/roles/assign', 
                json={'user_id': 'user-456'}  # Missing role
            )
            
            assert response.status_code == 400
            data = response.get_json()
            assert 'role are required' in data['error']

    def test_assign_role_endpoint_conflict(self, client):
        """Test role assignment with conflict (user already has role)."""
        with patch('backend.routes.api_v4.get_current_supabase_user') as mock_user:
            mock_user.return_value = {
                'id': 'admin-123',
                'role': 'super_admin'
            }
            
            with patch('backend.routes.api_v4.create_user_service') as mock_service:
                mock_service_instance = Mock()
                mock_service_instance.assign_user_role.return_value = {
                    'success': False,
                    'error': 'User already has this role',
                    'error_type': 'conflict'
                }
                mock_service.return_value = mock_service_instance
                
                response = client.post('/api/v4/admin/roles/assign', 
                    json={
                        'user_id': 'user-456',
                        'role': 'moderator'
                    }
                )
                
                assert response.status_code == 409
                data = response.get_json()
                assert 'User already has this role' in data['error']

    def test_revoke_role_endpoint_success(self, client):
        """Test successful role revocation via Flask endpoint."""
        with patch('backend.routes.api_v4.get_current_supabase_user') as mock_user:
            mock_user.return_value = {
                'id': 'admin-123',
                'role': 'super_admin'
            }
            
            with patch('backend.routes.api_v4.create_user_service') as mock_service:
                mock_service_instance = Mock()
                mock_service_instance.revoke_user_role.return_value = {'success': True}
                mock_service.return_value = mock_service_instance
                
                response = client.post('/api/v4/admin/roles/revoke', 
                    json={
                        'user_id': 'user-456',
                        'role': 'moderator'
                    }
                )
                
                assert response.status_code == 200
                data = response.get_json()
                assert data['success'] is True
                assert 'Role revoked successfully' in data['message']

    def test_revoke_role_endpoint_self_revocation(self, client):
        """Test self-revocation of super_admin role."""
        with patch('backend.routes.api_v4.get_current_supabase_user') as mock_user:
            mock_user.return_value = {
                'id': 'admin-123',
                'role': 'super_admin'
            }
            
            response = client.post('/api/v4/admin/roles/revoke', 
                json={
                    'user_id': 'admin-123',  # Same as current user
                    'role': 'super_admin'
                }
            )
            
            assert response.status_code == 409
            data = response.get_json()
            assert 'Cannot revoke your own super_admin role' in data['error']

    def test_list_roles_endpoint_success(self, client):
        """Test successful role listing via Flask endpoint."""
        with patch('backend.routes.api_v4.get_current_supabase_user') as mock_user:
            mock_user.return_value = {
                'id': 'admin-123',
                'role': 'super_admin'
            }
            
            with patch('backend.routes.api_v4.create_user_service') as mock_service:
                mock_service_instance = Mock()
                mock_service_instance.get_user_roles.return_value = {
                    'users': [
                        {
                            'id': 'user-456',
                            'name': 'Test User',
                            'email': 'test@example.com',
                            'role': 'moderator',
                            'role_level': 1,
                            'assigned_at': '2024-01-01T00:00:00Z'
                        }
                    ],
                    'total': 1,
                    'page': 1,
                    'limit': 50,
                    'has_more': False
                }
                mock_service.return_value = mock_service_instance
                
                response = client.get('/api/v4/admin/roles')
                
                assert response.status_code == 200
                data = response.get_json()
                assert 'users' in data
                assert len(data['users']) == 1
                assert data['users'][0]['role'] == 'moderator'

    def test_available_roles_endpoint_success(self, client):
        """Test successful available roles endpoint."""
        with patch('backend.routes.api_v4.get_current_supabase_user') as mock_user:
            mock_user.return_value = {
                'id': 'admin-123',
                'role': 'super_admin'
            }
            
            response = client.get('/api/v4/admin/roles/available')
            
            assert response.status_code == 200
            data = response.get_json()
            assert isinstance(data, list)
            assert len(data) == 4
            
            # Check role structure
            for role in data:
                assert 'name' in role
                assert 'level' in role
                assert 'description' in role
                assert 'permissions' in role
            
            # Check specific roles
            role_names = [role['name'] for role in data]
            assert 'moderator' in role_names
            assert 'data_admin' in role_names
            assert 'system_admin' in role_names
            assert 'super_admin' in role_names

    def test_available_roles_endpoint_unauthorized(self, client):
        """Test available roles endpoint without authentication."""
        response = client.get('/api/v4/admin/roles/available')
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'Authentication required' in data['error']

    def test_get_admin_roles_with_include_expired(self, client):
        """Test GET /admin/roles with include_expired=true parameter."""
        with patch('backend.routes.api_v4.get_current_supabase_user') as mock_user:
            mock_user.return_value = {
                'id': 'admin-123',
                'role': 'super_admin'
            }
            
            with patch('backend.routes.api_v4.create_user_service') as mock_service:
                mock_service_instance = Mock()
                mock_service_instance.get_user_roles.return_value = {
                    'users': [
                        {
                            'id': 'user-456',
                            'name': 'Test User',
                            'email': 'test@example.com',
                            'role': 'moderator',
                            'role_level': 1,
                            'assigned_at': '2024-01-01T00:00:00Z',
                            'expires_at': '2024-01-01T00:00:00Z'  # Expired role
                        }
                    ],
                    'total': 1,
                    'page': 1,
                    'limit': 50,
                    'has_more': False
                }
                mock_service.return_value = mock_service_instance
                
                response = client.get('/api/v4/admin/roles?include_expired=true')
                
                assert response.status_code == 200
                data = response.get_json()
                assert 'users' in data
                assert len(data['users']) == 1
                # Verify that the service was called with include_expired=True
                mock_service_instance.get_user_roles.assert_called_once()
                call_args = mock_service_instance.get_user_roles.call_args
                assert call_args[1]['include_expired'] is True

    def test_get_admin_roles_non_admin_access(self, client):
        """Test GET /admin/roles with non-admin user access."""
        with patch('backend.routes.api_v4.get_current_supabase_user') as mock_user:
            mock_user.return_value = {
                'id': 'user-123',
                'role': 'user'  # Regular user, not admin
            }
            
            response = client.get('/api/v4/admin/roles')
            
            assert response.status_code == 403
            data = response.get_json()
            assert 'forbidden' in data['error'].lower() or 'insufficient' in data['error'].lower()

    def test_health_endpoint(self, client):
        """Test the simple health endpoint that doesn't require authentication."""
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert data['message'] == 'API v4 is working'
        assert 'timestamp' in data
