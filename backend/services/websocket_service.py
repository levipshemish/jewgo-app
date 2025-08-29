"""
WebSocket Service for JewGo Backend
==================================
This service provides real-time WebSocket capabilities for the JewGo backend,
including live restaurant status updates, user notifications, and real-time filtering.
Features:
- Real-time restaurant status updates
- Live user notifications
- Real-time filtering updates
- Connection management
- Message broadcasting
- Room-based subscriptions
Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import json
import logging
import asyncio
import uuid
from typing import Dict, List, Set, Optional, Any, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import websockets
from websockets.server import WebSocketServerProtocol
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """Types of WebSocket messages."""

    RESTAURANT_STATUS_UPDATE = "restaurant_status_update"
    OPEN_NOW_UPDATE = "open_now_update"
    FILTER_UPDATE = "filter_update"
    USER_NOTIFICATION = "user_notification"
    LOCATION_UPDATE = "location_update"
    PING = "ping"
    PONG = "pong"
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"


@dataclass
class WebSocketMessage:
    """WebSocket message structure."""

    type: MessageType
    data: Dict[str, Any]
    timestamp: datetime
    message_id: str = None

    def __post_init__(self):
        if self.message_id is None:
            self.message_id = str(uuid.uuid4())
        if isinstance(self.timestamp, str):
            self.timestamp = datetime.fromisoformat(self.timestamp)


@dataclass
class ConnectionInfo:
    """Information about a WebSocket connection."""

    connection_id: str
    user_id: Optional[str] = None
    location: Optional[Dict[str, float]] = None
    subscribed_rooms: Set[str] = None
    last_activity: datetime = None
    is_authenticated: bool = False

    def __post_init__(self):
        if self.subscribed_rooms is None:
            self.subscribed_rooms = set()
        if self.last_activity is None:
            self.last_activity = datetime.now()


class WebSocketService:
    """WebSocket service for real-time updates."""

    def __init__(self):
        """Initialize the WebSocket service."""
        self.connections: Dict[str, WebSocketServerProtocol] = {}
        self.connection_info: Dict[str, ConnectionInfo] = {}
        self.rooms: Dict[str, Set[str]] = {}  # room_id -> set of connection_ids
        self.message_handlers: Dict[MessageType, List[Callable]] = {}
        self.server = None
        self.is_running = False
        # Register default message handlers
        self._register_default_handlers()

    def _register_default_handlers(self):
        """Register default message handlers."""
        self.register_handler(MessageType.SUBSCRIBE, self._handle_subscribe)
        self.register_handler(MessageType.UNSUBSCRIBE, self._handle_unsubscribe)
        self.register_handler(MessageType.PING, self._handle_ping)
        self.register_handler(MessageType.LOCATION_UPDATE, self._handle_location_update)

    def register_handler(self, message_type: MessageType, handler: Callable):
        """Register a message handler."""
        if message_type not in self.message_handlers:
            self.message_handlers[message_type] = []
        self.message_handlers[message_type].append(handler)

    async def start_server(self, host: str = "localhost", port: int = 8765):
        """Start the WebSocket server."""
        try:
            self.server = await websockets.serve(self._handle_connection, host, port)
            self.is_running = True
            logger.info(f"WebSocket server started on ws://{host}:{port}")
            # Start background tasks
            asyncio.create_task(self._cleanup_inactive_connections())
            asyncio.create_task(self._broadcast_heartbeat())
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
            raise

    async def stop_server(self):
        """Stop the WebSocket server."""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.is_running = False
            logger.info("WebSocket server stopped")

    async def _handle_connection(self, websocket: WebSocketServerProtocol, path: str):
        """Handle a new WebSocket connection."""
        connection_id = str(uuid.uuid4())
        connection_info = ConnectionInfo(connection_id=connection_id)
        self.connections[connection_id] = websocket
        self.connection_info[connection_id] = connection_info
        logger.info(f"New WebSocket connection: {connection_id}")
        try:
            async for message in websocket:
                await self._process_message(connection_id, message)
        except ConnectionClosed:
            logger.info(f"WebSocket connection closed: {connection_id}")
        except Exception as e:
            logger.error(f"Error handling WebSocket connection {connection_id}: {e}")
        finally:
            await self._cleanup_connection(connection_id)

    async def _process_message(self, connection_id: str, message: str):
        """Process an incoming WebSocket message."""
        try:
            data = json.loads(message)
            message_type = MessageType(data.get("type"))
            message_data = data.get("data", {})
            # Update last activity
            if connection_id in self.connection_info:
                self.connection_info[connection_id].last_activity = datetime.now()
            # Handle message
            if message_type in self.message_handlers:
                for handler in self.message_handlers[message_type]:
                    try:
                        await handler(connection_id, message_data)
                    except Exception as e:
                        logger.error(f"Error in message handler: {e}")
            else:
                logger.warning(f"Unknown message type: {message_type}")
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message from {connection_id}")
        except Exception as e:
            logger.error(f"Error processing message from {connection_id}: {e}")

    async def _handle_subscribe(self, connection_id: str, data: Dict[str, Any]):
        """Handle subscription to a room."""
        room_id = data.get("room_id")
        if not room_id:
            return
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(connection_id)
        if connection_id in self.connection_info:
            self.connection_info[connection_id].subscribed_rooms.add(room_id)
        # Send confirmation
        await self._send_to_connection(
            connection_id,
            {
                "type": "subscription_confirmed",
                "data": {"room_id": room_id},
                "timestamp": datetime.now().isoformat(),
            },
        )
        logger.info(f"Connection {connection_id} subscribed to room {room_id}")

    async def _handle_unsubscribe(self, connection_id: str, data: Dict[str, Any]):
        """Handle unsubscription from a room."""
        room_id = data.get("room_id")
        if not room_id:
            return
        if room_id in self.rooms:
            self.rooms[room_id].discard(connection_id)
        if connection_id in self.connection_info:
            self.connection_info[connection_id].subscribed_rooms.discard(room_id)
        logger.info(f"Connection {connection_id} unsubscribed from room {room_id}")

    async def _handle_ping(self, connection_id: str, data: Dict[str, Any]):
        """Handle ping message."""
        await self._send_to_connection(
            connection_id,
            {
                "type": "pong",
                "data": {"timestamp": datetime.now().isoformat()},
                "timestamp": datetime.now().isoformat(),
            },
        )

    async def _handle_location_update(self, connection_id: str, data: Dict[str, Any]):
        """Handle location update from client."""
        if connection_id in self.connection_info:
            self.connection_info[connection_id].location = {
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
            }
            logger.debug(f"Updated location for connection {connection_id}")

    async def _cleanup_connection(self, connection_id: str):
        """Clean up a closed connection."""
        # Remove from all rooms
        if connection_id in self.connection_info:
            for room_id in self.connection_info[connection_id].subscribed_rooms:
                if room_id in self.rooms:
                    self.rooms[room_id].discard(connection_id)
        # Remove connection
        self.connections.pop(connection_id, None)
        self.connection_info.pop(connection_id, None)
        logger.info(f"Cleaned up connection: {connection_id}")

    async def _send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """Send a message to a specific connection."""
        if connection_id in self.connections:
            try:
                await self.connections[connection_id].send(json.dumps(message))
            except ConnectionClosed:
                await self._cleanup_connection(connection_id)
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")

    async def broadcast_to_room(self, room_id: str, message: Dict[str, Any]):
        """Broadcast a message to all connections in a room."""
        if room_id not in self.rooms:
            return
        disconnected_connections = []
        for connection_id in self.rooms[room_id]:
            try:
                await self._send_to_connection(connection_id, message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
                disconnected_connections.append(connection_id)
        # Clean up disconnected connections
        for connection_id in disconnected_connections:
            await self._cleanup_connection(connection_id)

    async def broadcast_to_all(self, message: Dict[str, Any]):
        """Broadcast a message to all connections."""
        disconnected_connections = []
        for connection_id in list(self.connections.keys()):
            try:
                await self._send_to_connection(connection_id, message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
                disconnected_connections.append(connection_id)
        # Clean up disconnected connections
        for connection_id in disconnected_connections:
            await self._cleanup_connection(connection_id)

    async def send_restaurant_status_update(
        self,
        restaurant_id: int,
        status: str,
        location: Optional[Dict[str, float]] = None,
    ):
        """Send restaurant status update to relevant connections."""
        message = {
            "type": MessageType.RESTAURANT_STATUS_UPDATE.value,
            "data": {
                "restaurant_id": restaurant_id,
                "status": status,
                "timestamp": datetime.now().isoformat(),
            },
            "timestamp": datetime.now().isoformat(),
        }
        # Send to restaurant-specific room
        room_id = f"restaurant_{restaurant_id}"
        await self.broadcast_to_room(room_id, message)
        # Send to location-based rooms if location provided
        if location:
            await self._send_location_based_update(message, location)

    async def send_open_now_update(
        self, restaurant_id: int, is_open: bool, next_open_time: Optional[str] = None
    ):
        """Send open now status update."""
        message = {
            "type": MessageType.OPEN_NOW_UPDATE.value,
            "data": {
                "restaurant_id": restaurant_id,
                "is_open": is_open,
                "next_open_time": next_open_time,
                "timestamp": datetime.now().isoformat(),
            },
            "timestamp": datetime.now().isoformat(),
        }
        # Send to restaurant-specific room
        room_id = f"restaurant_{restaurant_id}"
        await self.broadcast_to_room(room_id, message)
        # Send to open now room
        await self.broadcast_to_room("open_now_updates", message)

    async def send_filter_update(
        self,
        filter_type: str,
        filter_data: Dict[str, Any],
        location: Optional[Dict[str, float]] = None,
    ):
        """Send filter update to relevant connections."""
        message = {
            "type": MessageType.FILTER_UPDATE.value,
            "data": {
                "filter_type": filter_type,
                "filter_data": filter_data,
                "timestamp": datetime.now().isoformat(),
            },
            "timestamp": datetime.now().isoformat(),
        }
        # Send to filter-specific room
        room_id = f"filters_{filter_type}"
        await self.broadcast_to_room(room_id, message)
        # Send to location-based rooms if location provided
        if location:
            await self._send_location_based_update(message, location)

    async def send_user_notification(
        self, user_id: str, notification_type: str, notification_data: Dict[str, Any]
    ):
        """Send user notification."""
        message = {
            "type": MessageType.USER_NOTIFICATION.value,
            "data": {
                "notification_type": notification_type,
                "notification_data": notification_data,
                "timestamp": datetime.now().isoformat(),
            },
            "timestamp": datetime.now().isoformat(),
        }
        # Send to user-specific room
        room_id = f"user_{user_id}"
        await self.broadcast_to_room(room_id, message)

    async def _send_location_based_update(
        self, message: Dict[str, Any], location: Dict[str, float]
    ):
        """Send location-based updates to nearby connections."""
        latitude = location.get("latitude")
        longitude = location.get("longitude")
        if not latitude or not longitude:
            return
        # Find connections within a certain radius
        for connection_id, connection_info in self.connection_info.items():
            if connection_info.location:
                distance = self._calculate_distance(
                    latitude,
                    longitude,
                    connection_info.location["latitude"],
                    connection_info.location["longitude"],
                )
                # Send to connections within 10 miles
                if distance <= 10:
                    await self._send_to_connection(connection_id, message)

    def _calculate_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Calculate distance between two points in miles."""
        import math

        # Convert to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return 3959 * c  # Earth's radius in miles

    async def _cleanup_inactive_connections(self):
        """Clean up inactive connections."""
        while self.is_running:
            try:
                current_time = datetime.now()
                inactive_connections = []
                for connection_id, connection_info in self.connection_info.items():
                    if (current_time - connection_info.last_activity) > timedelta(
                        minutes=30
                    ):
                        inactive_connections.append(connection_id)
                for connection_id in inactive_connections:
                    await self._cleanup_connection(connection_id)
                await asyncio.sleep(300)  # Check every 5 minutes
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
                await asyncio.sleep(60)

    async def _broadcast_heartbeat(self):
        """Broadcast heartbeat to keep connections alive."""
        while self.is_running:
            try:
                await self.broadcast_to_all(
                    {
                        "type": "heartbeat",
                        "data": {"timestamp": datetime.now().isoformat()},
                        "timestamp": datetime.now().isoformat(),
                    }
                )
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
            except Exception as e:
                logger.error(f"Error in heartbeat task: {e}")
                await asyncio.sleep(60)

    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics."""
        return {
            "total_connections": len(self.connections),
            "total_rooms": len(self.rooms),
            "connections_per_room": {
                room_id: len(connections) for room_id, connections in self.rooms.items()
            },
            "authenticated_connections": sum(
                1 for info in self.connection_info.values() if info.is_authenticated
            ),
        }


# Global WebSocket service instance
websocket_service = WebSocketService()
