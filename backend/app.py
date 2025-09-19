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

# Validate configuration
print('Validating application configuration...')
try:
    from utils.config_validator import validate_config_on_startup
    config_summary = validate_config_on_startup()
    print('SUCCESS: Configuration validation passed')
except SystemExit:
    # Re-raise system exit from config validator
    raise
except Exception as e:
    print(f'WARNING: Configuration validation failed: {e}')
    print('Continuing with startup - some features may not work properly')

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

# CORS handling
# In production, Nginx sets CORS headers. Avoid duplicate headers by disabling
# Flask-CORS when running in production. Enable Flask-CORS elsewhere (dev/test).
if os.environ.get('FLASK_ENV') != 'production':
    CORS(app, supports_credentials=True)
else:
    print('INFO: Flask-CORS disabled in production (Nginx handles CORS)')

print('Initializing real database services...')
try:
    # Import real database connection managers with correct class names
    from database.unified_connection_manager import UnifiedConnectionManager
    from cache.redis_manager_v5 import RedisManagerV5
    
    # Initialize real database connection
    connection_manager = UnifiedConnectionManager()
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
    
    # Initialize database pool monitoring
    from services.database_pool_monitor import db_pool_monitor
    if db_pool_monitor.initialize():
        db_pool_monitor.start_monitoring()
        print('SUCCESS: Database pool monitoring started')
    else:
        print('WARNING: Database pool monitoring failed to initialize')
    
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

print('Registering error handlers...')
try:
    from middleware.error_handlers import register_error_handlers, register_custom_error_handlers
    register_error_handlers(app)
    register_custom_error_handlers(app)
    print('SUCCESS: Error handlers registered')
except Exception as e:
    print(f'ERROR: Failed to register error handlers: {e}')
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

print('Registering specials API blueprint...')
try:
    from routes.specials_routes import specials_bp
    app.register_blueprint(specials_bp)
    print(f'SUCCESS: Registered {specials_bp.name} with prefix {specials_bp.url_prefix}')
except Exception as e:
    print(f'ERROR: Failed to register specials API blueprint: {e}')
    import traceback
    traceback.print_exc()

print('Registering webhook API blueprint...')
try:
    from routes.v5.simple_webhook_api import simple_webhook_api
    app.register_blueprint(simple_webhook_api)
    print(f'SUCCESS: Registered {simple_webhook_api.name} with prefix {simple_webhook_api.url_prefix}')
except Exception as e:
    print(f'ERROR: Failed to register webhook API blueprint: {e}')
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

# Add a simple webhook test endpoint
@app.route('/api/v5/webhook/simple', methods=['GET'])
def simple_webhook_test():
    return jsonify({'status': 'ok', 'message': 'Simple webhook endpoint is working'})

@app.route('/api/listings')
def simple_listings():
    """Redirect to the real v5 API endpoint."""
    from flask import redirect, request
    
    # Get the category parameter to determine the entity type
    category = request.args.get('category', 'restaurants')
    
    # Map frontend categories to backend entity types
    category_mapping = {
        'eatery': 'restaurants',
        'restaurants': 'restaurants', 
        'mikvah': 'mikvahs',
        'mikvahs': 'mikvahs',
        'shul': 'synagogues',
        'synagogues': 'synagogues',
        'stores': 'stores',
        'shuk': 'stores'
    }
    
    entity_type = category_mapping.get(category, 'restaurants')
    
    # Build the redirect URL with all query parameters
    from urllib.parse import urlencode
    query_params = dict(request.args)
    redirect_url = f'/api/v5/{entity_type}?{urlencode(query_params)}'
    
    return redirect(redirect_url)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
