from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

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
