"""
OAuth Debug endpoint for troubleshooting OAuth configuration issues.
This is a temporary debug endpoint to help identify OAuth failures.
"""

import os
from datetime import datetime
from flask import Blueprint, jsonify
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Create debug blueprint
oauth_debug_bp = Blueprint('oauth_debug', __name__)

@oauth_debug_bp.route('/oauth-debug', methods=['GET'])
def oauth_debug():
    """Debug OAuth configuration and service status with comprehensive diagnostics."""
    try:
        # Test OAuth service initialization
        oauth_service_status = 'unknown'
        oauth_service_error = None
        try:
            from services.oauth_service_v5 import OAuthService
            oauth_service = OAuthService()
            oauth_service_status = 'initialized'
        except Exception as e:
            oauth_service_status = 'failed'
            oauth_service_error = str(e)
        
        # Test auth service initialization  
        auth_service_status = 'unknown'
        auth_service_error = None
        try:
            from services.auth_service_v5 import AuthServiceV5
            auth_service = AuthServiceV5()
            auth_service_status = 'initialized'
        except Exception as e:
            auth_service_status = 'failed'
            auth_service_error = str(e)
            
        debug_info = {
            'timestamp': datetime.utcnow().isoformat(),
            'google_oauth_config': {
                'client_id_set': bool(os.getenv('GOOGLE_CLIENT_ID')),
                'client_id_prefix': os.getenv('GOOGLE_CLIENT_ID', '')[:20] if os.getenv('GOOGLE_CLIENT_ID') else None,
                'client_secret_set': bool(os.getenv('GOOGLE_CLIENT_SECRET')),
                'redirect_uri_set': bool(os.getenv('GOOGLE_REDIRECT_URI')),
                'redirect_uri_value': os.getenv('GOOGLE_REDIRECT_URI', 'NOT_SET'),
                'frontend_url': os.getenv('FRONTEND_URL', 'NOT_SET'),
                'oauth_state_signing_key_set': bool(os.getenv('OAUTH_STATE_SIGNING_KEY')),
            },
            'service_status': {
                'oauth_service': oauth_service_status,
                'oauth_service_error': oauth_service_error,
                'auth_service': auth_service_status, 
                'auth_service_error': auth_service_error
            },
            'environment_config': {
                'frontend_url_set': bool(os.getenv('FRONTEND_URL')),
                'frontend_url_value': os.getenv('FRONTEND_URL', 'NOT_SET'),
                'oauth_state_key_set': bool(os.getenv('OAUTH_STATE_SIGNING_KEY')),
                'oauth_state_key_length': len(os.getenv('OAUTH_STATE_SIGNING_KEY', '')),
            }
        }
        
        # Test OAuth service initialization
        try:
            from services.oauth_service_v5 import OAuthService
            from flask import current_app
            db_manager = current_app.config.get('DB_MANAGER')
            if db_manager:
                oauth_service = OAuthService(db_manager)
                debug_info['service_status']['oauth_service'] = 'initialized_successfully'
                debug_info['service_status']['frontend_url_from_service'] = oauth_service.frontend_url
            else:
                debug_info['service_status']['oauth_service'] = 'db_manager_not_available'
        except Exception as e:
            debug_info['service_status']['oauth_service'] = f'initialization_failed: {str(e)}'
        
        # Test Google OAuth URL generation
        try:
            if debug_info['service_status'].get('oauth_service') == 'initialized_successfully':
                test_url = oauth_service.get_google_auth_url('/test')
                debug_info['service_status']['google_url_generation'] = 'success'
                debug_info['service_status']['test_url_prefix'] = test_url[:100] + '...'
            else:
                debug_info['service_status']['google_url_generation'] = 'skipped_due_to_init_failure'
        except Exception as e:
            debug_info['service_status']['google_url_generation'] = f'failed: {str(e)}'
        
        return jsonify({
            'success': True,
            'debug_info': debug_info,
            'timestamp': '2025-09-16T22:50:00Z',
            'note': 'This is a temporary debug endpoint - remove after OAuth is fixed'
        })
        
    except Exception as e:
        logger.error(f"OAuth debug endpoint error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'note': 'Debug endpoint failed'
        }), 500
