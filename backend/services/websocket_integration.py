#!/usr/bin/env python3
"""
WebSocket Integration Service for JewGo Backend
==============================================

This module integrates the WebSocket service with Flask-SocketIO for real-time features:
- Live restaurant status updates
- Real-time user notifications
- Live filtering updates
- Location-based broadcasting
- Restaurant "open now" status changes

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

import threading
from datetime import datetime
from typing import Dict, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum

from flask import request
from flask_socketio import SocketIO, emit
from sqlalchemy import text

from utils.logging_config import get_logger
from services.websocket_service import WebSocketService, MessageType, ConnectionInfo
from database.connection_manager import get_connection_manager

logger = get_logger(__name__)


class RealTimeEventType(Enum):
    """Real-time event types for JewGo."""
    RESTAURANT_STATUS_CHANGE = "restaurant_status_change"
    RESTAURANT_OPEN_NOW_CHANGE = "restaurant_open_now_change"
    NEW_RESTAURANT_ADDED = "new_restaurant_added"
    RESTAURANT_HOURS_UPDATED = "restaurant_hours_updated"
    USER_LOCATION_UPDATE = "user_location_update"
    NEARBY_RESTAURANT_ALERT = "nearby_restaurant_alert"
    KOSHER_STATUS_CHANGE = "kosher_status_change"
    REVIEW_ADDED = "review_added"
    RESTAURANT_RATING_CHANGE = "restaurant_rating_change"


@dataclass
class RealTimeEvent:
    """Real-time event data structure."""
    event_type: RealTimeEventType
    data: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    location: Optional[Dict[str, float]] = None
    broadcast_radius: Optional[float] = None  # km


class WebSocketIntegration:
    """Integrates WebSocket service with Flask-SocketIO for real-time features."""
    
    def __init__(self, socketio: SocketIO):
        self.socketio = socketio
        self.websocket_service = WebSocketService()
        self.connection_manager = get_connection_manager()
        self.active_connections: Dict[str, ConnectionInfo] = {}
        self.location_subscriptions: Dict[str, Set[str]] = {}  # location -> set of connection_ids
        self.restaurant_subscriptions: Dict[int, Set[str]] = {}  # restaurant_id -> set of connection_ids
        
        # Event handlers
        self._setup_socketio_handlers()
        self._setup_websocket_handlers()
        
        # Background tasks
        self._start_background_tasks()
        
        logger.info("WebSocket integration initialized")

    def _setup_socketio_handlers(self):
        """Setup Flask-SocketIO event handlers."""
        
        @self.socketio.on('connect')
        def handle_connect():
            """Handle client connection."""
            connection_id = request.sid
            user_id = request.args.get('user_id')
            
            # Create connection info
            connection_info = ConnectionInfo(
                connection_id=connection_id,
                user_id=user_id,
                is_authenticated=bool(user_id)
            )
            
            self.active_connections[connection_id] = connection_info
            
            logger.info(f"Client connected: {connection_id}, user: {user_id}")
            emit('connected', {'status': 'success', 'connection_id': connection_id})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """Handle client disconnection."""
            connection_id = request.sid
            
            if connection_id in self.active_connections:
                # Clean up subscriptions
                self._cleanup_connection_subscriptions(connection_id)
                del self.active_connections[connection_id]
            
            logger.info(f"Client disconnected: {connection_id}")
        
        @self.socketio.on('subscribe_location')
        def handle_subscribe_location(data):
            """Handle location-based subscription."""
            connection_id = request.sid
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            radius = data.get('radius', 5.0)  # km
            
            if not latitude or not longitude:
                emit('error', {'message': 'Latitude and longitude required'})
                return
            
            # Update connection location
            if connection_id in self.active_connections:
                self.active_connections[connection_id].location = {
                    'latitude': float(latitude),
                    'longitude': float(longitude),
                    'radius': float(radius)
                }
            
            # Add to location subscriptions
            location_key = f"{latitude:.4f},{longitude:.4f}"
            if location_key not in self.location_subscriptions:
                self.location_subscriptions[location_key] = set()
            self.location_subscriptions[location_key].add(connection_id)
            
            emit('location_subscribed', {
                'location': {'latitude': latitude, 'longitude': longitude, 'radius': radius}
            })
            
            logger.info(f"Location subscription: {connection_id} -> {location_key}")
        
        @self.socketio.on('subscribe_restaurant')
        def handle_subscribe_restaurant(data):
            """Handle restaurant-specific subscription."""
            connection_id = request.sid
            restaurant_id = data.get('restaurant_id')
            
            if not restaurant_id:
                emit('error', {'message': 'Restaurant ID required'})
                return
            
            # Add to restaurant subscriptions
            restaurant_id = int(restaurant_id)
            if restaurant_id not in self.restaurant_subscriptions:
                self.restaurant_subscriptions[restaurant_id] = set()
            self.restaurant_subscriptions[restaurant_id].add(connection_id)
            
            emit('restaurant_subscribed', {'restaurant_id': restaurant_id})
            
            logger.info(f"Restaurant subscription: {connection_id} -> {restaurant_id}")
        
        @self.socketio.on('unsubscribe_location')
        def handle_unsubscribe_location():
            """Handle location subscription removal."""
            connection_id = request.sid
            
            # Remove from all location subscriptions
            for location_key, connections in self.location_subscriptions.items():
                connections.discard(connection_id)
                if not connections:
                    del self.location_subscriptions[location_key]
            
            emit('location_unsubscribed', {'status': 'success'})
        
        @self.socketio.on('unsubscribe_restaurant')
        def handle_unsubscribe_restaurant(data):
            """Handle restaurant subscription removal."""
            connection_id = request.sid
            restaurant_id = data.get('restaurant_id')
            
            if restaurant_id and int(restaurant_id) in self.restaurant_subscriptions:
                self.restaurant_subscriptions[int(restaurant_id)].discard(connection_id)
            
            emit('restaurant_unsubscribed', {'restaurant_id': restaurant_id})

    def _setup_websocket_handlers(self):
        """Setup WebSocket service event handlers."""
        
        # Register handlers for different message types
        self.websocket_service.register_handler(
            MessageType.RESTAURANT_STATUS_UPDATE,
            self._handle_restaurant_status_update
        )
        
        self.websocket_service.register_handler(
            MessageType.OPEN_NOW_UPDATE,
            self._handle_open_now_update
        )
        
        self.websocket_service.register_handler(
            MessageType.LOCATION_UPDATE,
            self._handle_location_update
        )

    def _handle_restaurant_status_update(self, connection_id: str, data: Dict[str, Any]):
        """Handle restaurant status update."""
        restaurant_id = data.get('restaurant_id')
        new_status = data.get('status')
        
        if restaurant_id and new_status:
            # Broadcast to restaurant subscribers
            self._broadcast_to_restaurant_subscribers(restaurant_id, {
                'type': 'restaurant_status_change',
                'restaurant_id': restaurant_id,
                'status': new_status,
                'timestamp': datetime.now().isoformat()
            })

    def _handle_open_now_update(self, connection_id: str, data: Dict[str, Any]):
        """Handle restaurant open/closed status update."""
        restaurant_id = data.get('restaurant_id')
        is_open = data.get('is_open')
        
        if restaurant_id is not None:
            # Broadcast to restaurant subscribers
            self._broadcast_to_restaurant_subscribers(restaurant_id, {
                'type': 'restaurant_open_now_change',
                'restaurant_id': restaurant_id,
                'is_open': is_open,
                'timestamp': datetime.now().isoformat()
            })
            
            # Also broadcast to location-based subscribers if restaurant has location
            self._broadcast_to_location_subscribers(restaurant_id, {
                'type': 'restaurant_open_now_change',
                'restaurant_id': restaurant_id,
                'is_open': is_open,
                'timestamp': datetime.now().isoformat()
            })

    def _handle_location_update(self, connection_id: str, data: Dict[str, Any]):
        """Handle user location update."""
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if latitude and longitude and connection_id in self.active_connections:
            self.active_connections[connection_id].location = {
                'latitude': float(latitude),
                'longitude': float(longitude)
            }

    def _broadcast_to_restaurant_subscribers(self, restaurant_id: int, data: Dict[str, Any]):
        """Broadcast event to restaurant subscribers."""
        if restaurant_id in self.restaurant_subscriptions:
            for connection_id in self.restaurant_subscriptions[restaurant_id]:
                if connection_id in self.active_connections:
                    self.socketio.emit('restaurant_update', data, room=connection_id)

    def _broadcast_to_location_subscribers(self, restaurant_id: int, data: Dict[str, Any]):
        """Broadcast event to location-based subscribers."""
        # Get restaurant location
        restaurant_location = self._get_restaurant_location(restaurant_id)
        if not restaurant_location:
            return
        
        # Find nearby subscribers
        for connection_id, connection_info in self.active_connections.items():
            if connection_info.location:
                distance = self._calculate_distance(
                    restaurant_location,
                    connection_info.location
                )
                
                # Check if within radius
                radius = connection_info.location.get('radius', 5.0)
                if distance <= radius:
                    self.socketio.emit('nearby_restaurant_update', {
                        **data,
                        'distance_km': distance
                    }, room=connection_id)

    def _get_restaurant_location(self, restaurant_id: int) -> Optional[Dict[str, float]]:
        """Get restaurant location from database."""
        try:
            with self.connection_manager.get_session() as session:
                query = text("""
                    SELECT latitude, longitude 
                    FROM restaurants 
                    WHERE id = :restaurant_id 
                    AND latitude IS NOT NULL 
                    AND longitude IS NOT NULL
                """)
                
                result = session.execute(query, {'restaurant_id': restaurant_id}).fetchone()
                if result:
                    return {'latitude': float(result[0]), 'longitude': float(result[1])}
        except Exception as e:
            logger.error(f"Error getting restaurant location: {e}")
        
        return None

    def _calculate_distance(self, loc1: Dict[str, float], loc2: Dict[str, float]) -> float:
        """Calculate distance between two locations in kilometers."""
        from math import radians, cos, sin, asin, sqrt
        
        # Haversine formula
        lat1, lon1 = radians(loc1['latitude']), radians(loc1['longitude'])
        lat2, lon2 = radians(loc2['latitude']), radians(loc2['longitude'])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return c * r

    def _cleanup_connection_subscriptions(self, connection_id: str):
        """Clean up all subscriptions for a connection."""
        # Remove from location subscriptions
        for location_key, connections in self.location_subscriptions.items():
            connections.discard(connection_id)
        
        # Remove from restaurant subscriptions
        for restaurant_id, connections in self.restaurant_subscriptions.items():
            connections.discard(connection_id)

    def _start_background_tasks(self):
        """Start background tasks for real-time updates."""
        # Start restaurant status monitoring
        threading.Thread(target=self._monitor_restaurant_changes, daemon=True).start()
        
        # Start location-based notifications
        threading.Thread(target=self._monitor_location_alerts, daemon=True).start()

    def _monitor_restaurant_changes(self):
        """Monitor restaurant status changes in the background."""
        last_check = datetime.now()
        
        while True:
            try:
                # Check for restaurant status changes
                with self.connection_manager.get_session() as session:
                    query = text("""
                        SELECT id, status, hours_parsed, updated_at
                        FROM restaurants 
                        WHERE updated_at > :last_check
                        ORDER BY updated_at DESC
                        LIMIT 100
                    """)
                    
                    results = session.execute(query, {'last_check': last_check}).fetchall()
                    
                    for row in results:
                        restaurant_id, status, hours_parsed, updated_at = row
                        
                        # Broadcast status change
                        self._broadcast_to_restaurant_subscribers(restaurant_id, {
                            'type': 'restaurant_status_change',
                            'restaurant_id': restaurant_id,
                            'status': status,
                            'hours_parsed': hours_parsed,
                            'timestamp': updated_at.isoformat()
                        })
                
                last_check = datetime.now()
                threading.Event().wait(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error monitoring restaurant changes: {e}")
                threading.Event().wait(60)  # Wait longer on error

    def _monitor_location_alerts(self):
        """Monitor location-based alerts in the background."""
        while True:
            try:
                # Check for new restaurants near subscribed locations
                for location_key, connections in self.location_subscriptions.items():
                    if not connections:
                        continue
                    
                    lat, lon = map(float, location_key.split(','))
                    
                    # Find new restaurants in the area
                    with self.connection_manager.get_session() as session:
                        query = text("""
                            SELECT id, name, latitude, longitude,
                                   earth_distance(ll_to_earth(:lat, :lon), ll_to_earth(latitude, longitude)) / 1000 as distance_km
                            FROM restaurants 
                            WHERE latitude IS NOT NULL 
                            AND longitude IS NOT NULL
                            AND created_at > NOW() - INTERVAL '1 hour'
                            AND earth_distance(ll_to_earth(:lat, :lon), ll_to_earth(latitude, longitude)) <= :radius * 1000
                            ORDER BY distance_km
                        """)
                        
                        results = session.execute(query, {
                            'lat': lat,
                            'lon': lon,
                            'radius': 5.0  # 5km radius
                        }).fetchall()
                        
                        for row in results:
                            restaurant_id, name, r_lat, r_lon, distance_km = row
                            
                            # Broadcast to all connections in this location
                            for connection_id in connections:
                                if connection_id in self.active_connections:
                                    self.socketio.emit('nearby_restaurant_alert', {
                                        'type': 'new_restaurant_nearby',
                                        'restaurant_id': restaurant_id,
                                        'restaurant_name': name,
                                        'distance_km': round(distance_km, 2),
                                        'timestamp': datetime.now().isoformat()
                                    }, room=connection_id)
                
                threading.Event().wait(300)  # Check every 5 minutes
                
            except Exception as e:
                logger.error(f"Error monitoring location alerts: {e}")
                threading.Event().wait(600)  # Wait longer on error

    def broadcast_restaurant_update(self, restaurant_id: int, update_type: str, data: Dict[str, Any]):
        """Broadcast restaurant update to all subscribers."""
        event_data = {
            'type': update_type,
            'restaurant_id': restaurant_id,
            'timestamp': datetime.now().isoformat(),
            **data
        }
        
        # Broadcast to restaurant subscribers
        self._broadcast_to_restaurant_subscribers(restaurant_id, event_data)
        
        # Broadcast to location subscribers
        self._broadcast_to_location_subscribers(restaurant_id, event_data)

    def get_connection_stats(self) -> Dict[str, Any]:
        """Get WebSocket connection statistics."""
        return {
            'total_connections': len(self.active_connections),
            'authenticated_connections': sum(1 for conn in self.active_connections.values() if conn.is_authenticated),
            'location_subscriptions': len(self.location_subscriptions),
            'restaurant_subscriptions': len(self.restaurant_subscriptions),
            'total_location_subscribers': sum(len(conns) for conns in self.location_subscriptions.values()),
            'total_restaurant_subscribers': sum(len(conns) for conns in self.restaurant_subscriptions.values())
        }


# Global WebSocket integration instance
_websocket_integration = None


def get_websocket_integration(socketio: SocketIO = None) -> WebSocketIntegration:
    """Get the global WebSocket integration instance."""
    global _websocket_integration
    
    if _websocket_integration is None and socketio:
        _websocket_integration = WebSocketIntegration(socketio)
    
    return _websocket_integration


def initialize_websocket_integration(socketio: SocketIO):
    """Initialize WebSocket integration with Flask-SocketIO."""
    return get_websocket_integration(socketio)
