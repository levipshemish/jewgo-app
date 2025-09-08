"""
JewGo Backend Application
Main Flask application with monitoring integration
"""

import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import routes
from routes import auth, restaurants, synagogues, reviews, health, metrics
from middleware.metrics_middleware import MetricsMiddleware

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configure CORS
    CORS(app, origins=[
        "http://localhost:3000",
        "https://jewgo.app",
        "https://www.jewgo.app",
        "https://jewgo-app.netlify.app",
        "https://jewgo-app.vercel.app"
    ])
    
    # Initialize metrics middleware
    metrics_middleware = MetricsMiddleware(app)
    
    # Register blueprints
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(restaurants.bp, url_prefix='/api/restaurants')
    app.register_blueprint(synagogues.bp, url_prefix='/api/synagogues')
    app.register_blueprint(reviews.bp, url_prefix='/api/reviews')
    app.register_blueprint(health.bp, url_prefix='/health')
    app.register_blueprint(metrics.metrics_bp, url_prefix='/api/metrics')
    
    # Root endpoint
    @app.route('/')
    def root():
        return jsonify({
            'message': 'JewGo API',
            'version': '1.0.0',
            'status': 'running',
            'endpoints': {
                'health': '/health',
                'metrics': '/api/metrics',
                'auth': '/api/auth',
                'restaurants': '/api/restaurants',
                'synagogues': '/api/synagogues',
                'reviews': '/api/reviews'
            }
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    # Get configuration from environment
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    
    print(f"Starting JewGo API server on {host}:{port}")
    print(f"Debug mode: {debug}")
    print(f"Metrics endpoint: http://{host}:{port}/api/metrics")
    
    app.run(host=host, port=port, debug=debug)