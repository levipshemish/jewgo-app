from flask import Flask
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

print('Initializing real database services...')
try:
    # Import real database connection managers with correct class names
    from database.connection_manager import DatabaseConnectionManager
    from cache.redis_manager_v5 import RedisManagerV5
    
    # Initialize real database connection
    connection_manager = DatabaseConnectionManager()
    redis_manager = RedisManagerV5()
    
    # IMPORTANT: Connect to the database
    print('Connecting to database...')
    connection_manager.connect()
    print('SUCCESS: Database connected')
    
    print('SUCCESS: Real database services initialized')
    
    # Initialize services with real database connections
    from routes.v5.api_v5 import init_services
    init_services(connection_manager, redis_manager)
    print('SUCCESS: Services initialized with real database')
    
except Exception as e:
    print(f'ERROR: Failed to initialize real database services: {e}')
    import traceback
    traceback.print_exc()
    
    # Fallback to mock services if real database fails
    print('Falling back to mock services...')
    class MockConnectionManager:
        def __init__(self):
            pass
        def connect(self):
            pass

    class MockRedisManager:
        def __init__(self):
            pass
        
        def get(self, key, prefix=None):
            return None
        
        def set(self, key, value, ex=None, ttl=None):
            pass
        
        def delete(self, key):
            pass
        
        def exists(self, key):
            return False

    try:
        from routes.v5.api_v5 import init_services
        mock_connection_manager = MockConnectionManager()
        mock_redis_manager = MockRedisManager()
        init_services(mock_connection_manager, mock_redis_manager)
        print('SUCCESS: Mock services initialized as fallback')
    except Exception as e2:
        print(f'ERROR: Failed to initialize mock services: {e2}')
        import traceback
        traceback.print_exc()

print('Registering monitoring blueprint...')
try:
    from routes.v5.monitoring_api import monitoring_v5
    app.register_blueprint(monitoring_v5)
    print(f'SUCCESS: Registered {monitoring_v5.name} with prefix {monitoring_v5.url_prefix}')
except Exception as e:
    print(f'ERROR: Failed to register monitoring blueprint: {e}')
    import traceback
    traceback.print_exc()

print('Registering auth blueprint...')
try:
    from routes.v5.auth_api import auth_bp
    app.register_blueprint(auth_bp)
    print(f'SUCCESS: Registered {auth_bp.name} with prefix {auth_bp.url_prefix}')
except Exception as e:
    print(f'ERROR: Failed to register auth blueprint: {e}')
    import traceback
    traceback.print_exc()

print('Registering main API blueprint...')
try:
    from routes.v5.api_v5 import api_v5
    app.register_blueprint(api_v5)
    print(f'SUCCESS: Registered {api_v5.name} with prefix {api_v5.url_prefix}')
except Exception as e:
    print(f'ERROR: Failed to register main API blueprint: {e}')
    import traceback
    traceback.print_exc()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
