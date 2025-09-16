#!/usr/bin/env python3
"""
WebSocket API Routes for JewGo Backend
======================================

This module provides WebSocket API endpoints for real-time features:
- Real-time restaurant status updates
- Live user notifications
- Location-based broadcasting
- Restaurant subscription management

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

from flask import Blueprint, request, jsonify
from flask_socketio import emit
from datetime import datetime

from utils.logging_config import get_logger
from middleware.auth_v5 import require_auth_v5
from middleware.rate_limit_v5 import rate_limit_v5
from services.websocket_integration import get_websocket_integration

logger = get_logger(__name__)

# Create WebSocket API blueprint
websocket_api = Blueprint('websocket_api', __name__, url_prefix='/api/v5/websocket')


@websocket_api.route('/stats', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_websocket_stats():
    """Get WebSocket connection statistics."""
    try:
        integration = get_websocket_integration()
        if not integration:
            return jsonify({
                'success': False,
                'error': 'WebSocket integration not initialized'
            }), 503
        
        stats = integration.get_connection_stats()
        
        return jsonify({
            'success': True,
            'stats': stats,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting WebSocket stats: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get WebSocket statistics'
        }), 500


@websocket_api.route('/broadcast/restaurant/<int:restaurant_id>', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def broadcast_restaurant_update(restaurant_id: int):
    """Broadcast restaurant update to all subscribers."""
    try:
        data = request.get_json() or {}
        update_type = data.get('type', 'restaurant_update')
        broadcast_data = data.get('data', {})
        
        integration = get_websocket_integration()
        if not integration:
            return jsonify({
                'success': False,
                'error': 'WebSocket integration not initialized'
            }), 503
        
        # Broadcast the update
        integration.broadcast_restaurant_update(restaurant_id, update_type, broadcast_data)
        
        return jsonify({
            'success': True,
            'message': 'Restaurant update broadcasted to subscribers',
            'restaurant_id': restaurant_id,
            'update_type': update_type,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error broadcasting restaurant update: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to broadcast restaurant update'
        }), 500


@websocket_api.route('/test/connection', methods=['GET'])
def test_websocket_connection():
    """Test WebSocket connection (public endpoint for testing)."""
    try:
        integration = get_websocket_integration()
        if not integration:
            return jsonify({
                'success': False,
                'error': 'WebSocket integration not initialized',
                'websocket_available': False
            }), 503
        
        stats = integration.get_connection_stats()
        
        return jsonify({
            'success': True,
            'websocket_available': True,
            'stats': stats,
            'timestamp': datetime.now().isoformat(),
            'message': 'WebSocket integration is active and ready'
        }), 200
        
    except Exception as e:
        logger.error(f"Error testing WebSocket connection: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to test WebSocket connection',
            'websocket_available': False
        }), 500


# WebSocket event handlers (these are called by Flask-SocketIO)
def setup_websocket_handlers(socketio):
    """Setup WebSocket event handlers."""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection."""
        logger.info(f"Client connected: {request.sid}")
        emit('connected', {
            'status': 'success',
            'connection_id': request.sid,
            'timestamp': datetime.now().isoformat()
        })
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        logger.info(f"Client disconnected: {request.sid}")
    
    @socketio.on('ping')
    def handle_ping():
        """Handle ping from client."""
        emit('pong', {
            'timestamp': datetime.now().isoformat()
        })
    
    @socketio.on('subscribe_location')
    def handle_subscribe_location(data):
        """Handle location-based subscription."""
        try:
            integration = get_websocket_integration()
            if integration:
                # This will be handled by the integration service
                pass
        except Exception as e:
            logger.error(f"Error handling location subscription: {e}")
            emit('error', {'message': 'Failed to subscribe to location'})
    
    @socketio.on('subscribe_restaurant')
    def handle_subscribe_restaurant(data):
        """Handle restaurant-specific subscription."""
        try:
            integration = get_websocket_integration()
            if integration:
                # This will be handled by the integration service
                pass
        except Exception as e:
            logger.error(f"Error handling restaurant subscription: {e}")
            emit('error', {'message': 'Failed to subscribe to restaurant'})
    
    @socketio.on('unsubscribe_location')
    def handle_unsubscribe_location():
        """Handle location subscription removal."""
        try:
            integration = get_websocket_integration()
            if integration:
                # This will be handled by the integration service
                pass
        except Exception as e:
            logger.error(f"Error handling location unsubscription: {e}")
            emit('error', {'message': 'Failed to unsubscribe from location'})
    
    @socketio.on('unsubscribe_restaurant')
    def handle_unsubscribe_restaurant(data):
        """Handle restaurant subscription removal."""
        try:
            integration = get_websocket_integration()
            if integration:
                # This will be handled by the integration service
                pass
        except Exception as e:
            logger.error(f"Error handling restaurant unsubscription: {e}")
            emit('error', {'message': 'Failed to unsubscribe from restaurant'})


# Health check endpoint
@websocket_api.route('/health', methods=['GET'])
def websocket_health():
    """WebSocket API health check."""
    try:
        integration = get_websocket_integration()
        
        if integration:
            stats = integration.get_connection_stats()
            return jsonify({
                'status': 'healthy',
                'websocket_integration': 'active',
                'stats': stats,
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            return jsonify({
                'status': 'unhealthy',
                'websocket_integration': 'inactive',
                'error': 'WebSocket integration not initialized',
                'timestamp': datetime.now().isoformat()
            }), 503
            
    except Exception as e:
        logger.error(f"WebSocket health check error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
