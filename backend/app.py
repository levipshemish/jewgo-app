from flask import Flask, jsonify
from flask_cors import CORS
import os
import sys

# Check dependencies before proceeding
print('Checking application dependencies...')
try:
    from utils.dependency_checker import check_dependencies_on_startup
    check_dependencies_on_startup()
    print('SUCCESS: All critical dependencies available')
except SystemExit:
    # Re-raise system exit from dependency checker
    raise
except Exception as e:
    print(f'WARNING: Dependency check failed: {e}')
    print('Continuing with startup - some features may not work')

app = Flask(__name__)

# Require SECRET_KEY in production - no fallback
secret_key = os.environ.get('SECRET_KEY')
if not secret_key:
    if os.environ.get('FLASK_ENV') == 'production':
        print("ERROR: SECRET_KEY environment variable is required in production")
        sys.exit(1)
    else:
        print("WARNING: Using development secret key - not for production use")
        secret_key = 'dev-secret-key-not-for-production'

app.config['SECRET_KEY'] = secret_key

# Enable CORS for all routes
CORS(app)

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
    
    # In production, fail fast instead of using mocks
    if os.environ.get('FLASK_ENV') == 'production':
        print('CRITICAL: Database initialization failed in production - exiting')
        sys.exit(1)
    
    # In development, allow graceful degradation with clear warnings
    print('WARNING: Using degraded mode - some features may not work')
    print('WARNING: This is only acceptable in development environments')
    
    # Create minimal fallback managers that log their usage
    class DegradedConnectionManager:
        def __init__(self):
            self.degraded = True
        def connect(self):
            print('WARNING: Using degraded database connection')
            return False

    class DegradedRedisManager:
        def __init__(self):
            self.degraded = True
        
        def get(self, key, prefix=None):
            print(f'WARNING: Degraded Redis GET for key: {key}')
            return None
        
        def set(self, key, value, ex=None, ttl=None):
            print(f'WARNING: Degraded Redis SET for key: {key}')
            return False
        
        def delete(self, key):
            print(f'WARNING: Degraded Redis DELETE for key: {key}')
            return False
        
        def exists(self, key):
            print(f'WARNING: Degraded Redis EXISTS for key: {key}')
            return False

    try:
        from routes.v5.api_v5 import init_services
        degraded_connection_manager = DegradedConnectionManager()
        degraded_redis_manager = DegradedRedisManager()
        init_services(degraded_connection_manager, degraded_redis_manager)
        print('WARNING: Degraded services initialized - expect limited functionality')
    except Exception as e2:
        print(f'CRITICAL: Failed to initialize even degraded services: {e2}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

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

print('Registering CSRF middleware...')
try:
    from middleware.csrf_v5 import register_csrf_middleware
    register_csrf_middleware(app)
    print('SUCCESS: CSRF middleware registered')
except Exception as e:
    print(f'ERROR: Failed to register CSRF middleware: {e}')
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

# Disable incomplete reviews system in production
if os.environ.get('FLASK_ENV') != 'production':
    print('Registering reviews blueprint (development only)...')
    try:
        from routes.v5.reviews_v5 import reviews_v5
        app.register_blueprint(reviews_v5)
        print(f'SUCCESS: Registered {reviews_v5.name} with prefix {reviews_v5.url_prefix}')
    except Exception as e:
        print(f'WARNING: Failed to register reviews blueprint: {e}')
else:
    print('SKIPPED: Reviews system disabled in production (incomplete implementation)')

# Add a simple test endpoint
@app.route('/test')
def test():
    return jsonify({'status': 'ok', 'message': 'Backend is running'})

@app.route('/api/listings')
def simple_listings():
    # Mock data that matches the frontend's Listing interface
    return jsonify({
        'success': True,
        'data': [
            {
                'id': 1,
                'title': 'Test Mikvah',
                'name': 'Test Mikvah',
                'description': 'A beautiful mikvah in the heart of the community',
                'category': 'mikvah',
                'category_name': 'mikvah',
                'category_emoji': '🕍',
                'latitude': 40.7128,
                'longitude': -74.0060,
                'zip_code': '10001',
                'rating': '4.5',
                'address': '123 Main St, New York, NY 10001',
                'phone': '(555) 123-4567',
                'website': 'https://example.com',
                'business_hours': {
                    'monday': {'open': '09:00', 'close': '17:00'},
                    'tuesday': {'open': '09:00', 'close': '17:00'},
                    'wednesday': {'open': '09:00', 'close': '17:00'},
                    'thursday': {'open': '09:00', 'close': '17:00'},
                    'friday': {'open': '09:00', 'close': '15:00'},
                    'saturday': {'closed': True},
                    'sunday': {'open': '10:00', 'close': '16:00'}
                }
            },
            {
                'id': 2,
                'title': 'Test Restaurant',
                'name': 'Test Restaurant',
                'description': 'Delicious kosher cuisine for the whole family',
                'category': 'eatery',
                'category_name': 'eatery',
                'category_emoji': '🍽️',
                'latitude': 40.7589,
                'longitude': -73.9851,
                'zip_code': '10019',
                'rating': '4.2',
                'address': '456 Broadway, New York, NY 10019',
                'phone': '(555) 987-6543',
                'website': 'https://restaurant.com',
                'business_hours': {
                    'monday': {'open': '11:00', 'close': '22:00'},
                    'tuesday': {'open': '11:00', 'close': '22:00'},
                    'wednesday': {'open': '11:00', 'close': '22:00'},
                    'thursday': {'open': '11:00', 'close': '22:00'},
                    'friday': {'open': '11:00', 'close': '15:00'},
                    'saturday': {'closed': True},
                    'sunday': {'open': '12:00', 'close': '21:00'}
                }
            }
        ]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
