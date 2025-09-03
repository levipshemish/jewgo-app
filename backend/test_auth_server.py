#!/usr/bin/env python3
"""
Minimal test server for admin authentication endpoints
====================================================
This server only includes the essential auth endpoints to test the admin dashboard
without the complexity of the full app_factory.
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS

# Load environment variables
def load_env():
    """Load environment variables from config.env"""
    try:
        with open('config.env', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
    except Exception as e:
        print(f"Warning: Could not load config.env: {e}")

# Load environment variables
load_env()

app = Flask(__name__)
CORS(app)

@app.route('/api/auth/health', methods=['GET'])
def auth_health():
    """Health check endpoint for the authentication system"""
    return jsonify({
        "success": True,
        "timestamp": "2025-09-02T23:27:00.000Z",
        "auth_system": "healthy",
        "components": {
            "supabase_role_manager": "available",
            "supabase_auth": "available",
            "environment": {
                "NODE_ENV": os.getenv("NODE_ENV", "not_set"),
                "FLASK_ENV": os.getenv("FLASK_ENV", "not_set"),
                "ADMIN_DEV_BYPASS": os.getenv("ADMIN_DEV_BYPASS", "not_set"),
                "SUPABASE_URL": "configured" if os.getenv("SUPABASE_URL") else "not_configured",
                "SUPABASE_ANON_KEY": "configured" if os.getenv("SUPABASE_ANON_KEY") else "not_configured"
            }
        }
    })

@app.route('/api/auth/user-role', methods=['GET'])
def get_user_role():
    """Get user role information from JWT token for admin authentication"""
    try:
        # Development bypass - completely skip authentication for testing
        if os.getenv('ADMIN_DEV_BYPASS') == 'true':
            print("ADMIN_DEV_BYPASS enabled - returning super_admin role for all requests")
            return jsonify({
                "success": True,
                "role": "super_admin",
                "level": 4,
                "permissions": ["*"],
                "user_id": "dev-bypass-user",
                "note": "Development bypass enabled"
            })
        
        # Get Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            print("Missing or invalid Authorization header")
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        
        token = auth_header.split(' ')[1]
        print(f"Processing user-role request with token: {token[:10]}...")
        print(f"Environment: NODE_ENV={os.getenv('NODE_ENV')}, FLASK_ENV={os.getenv('FLASK_ENV')}, ADMIN_DEV_BYPASS={os.getenv('ADMIN_DEV_BYPASS')}")
        
        # For now, return a mock admin role for any valid token
        # This allows testing without complex Supabase integration
        return jsonify({
            "success": True,
            "role": "super_admin",
            "level": 4,
            "permissions": ["*"],
            "user_id": "test-user",
            "note": "Test mode - mock admin role"
        })
        
    except Exception as e:
        print(f"Error in user-role endpoint: {e}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Basic health check"""
    return jsonify({
        "success": True,
        "status": "healthy",
        "message": "Test Auth Server is running",
        "endpoints": [
            "/api/auth/health",
            "/api/auth/user-role",
            "/health"
        ]
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8082))
    print(f"Starting test auth server on port {port}")
    print(f"Environment: NODE_ENV={os.getenv('NODE_ENV')}, FLASK_ENV={os.getenv('FLASK_ENV')}, ADMIN_DEV_BYPASS={os.getenv('ADMIN_DEV_BYPASS')}")
    app.run(host='0.0.0.0', port=port, debug=True)
