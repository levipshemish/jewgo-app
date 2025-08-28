/// <reference types="node" />
import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: WebSocketMessage) => void;
  connect: () => void;
  disconnect: () => void;
  lastMessage: WebSocketMessage | null;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  url:
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'wss://jewgo-app-oyoh.onrender.com/ws'
      : 'ws://127.0.0.1:8082/ws'),
  reconnectInterval: 3000,
  maxReconnectAttempts: 3, // Reduced for production
  heartbeatInterval: 30000,
};

export function useWebSocket(config: Partial<WebSocketConfig> = {}): UseWebSocketReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Disable WebSocket in development and production if not explicitly enabled
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldUseWebSocket = false; // Disable WebSocket for now since backend doesn't support it
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  // Send heartbeat to keep connection alive
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'heartbeat',
        data: { timestamp: Date.now() }
      }));
    }
  }, []);

  // Start heartbeat interval
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setInterval(sendHeartbeat, finalConfig.heartbeatInterval);
  }, [sendHeartbeat, finalConfig.heartbeatInterval]);

  // Stop heartbeat interval
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Handle WebSocket connection
  const connect = useCallback(() => {
    if (!shouldUseWebSocket) {

      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(finalConfig.url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        startHeartbeat();

      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case 'heartbeat':
              // Respond to heartbeat
              ws.send(JSON.stringify({
                type: 'heartbeat_ack',
                data: { timestamp: Date.now() }
              }));
              break;
              
            case 'restaurant_status_update':
              // Handle restaurant status updates

              break;
              
            case 'open_now_update':
              // Handle open now updates

              break;
              
            case 'filter_update':
              // Handle filter updates

              break;
              
            default:

          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (_event) => {
        setIsConnected(false);
        setIsConnecting(false);
        stopHeartbeat();

        // Attempt to reconnect if not manually closed
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < finalConfig.maxReconnectAttempts!) {
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, finalConfig.reconnectInterval);
        } else if (reconnectAttemptsRef.current >= finalConfig.maxReconnectAttempts!) {
          setError('Failed to reconnect after maximum attempts');
          // console.warn('WebSocket reconnection failed, continuing without real-time updates');
        }
      };

      ws.onerror = (_event) => {
        // console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

    } catch (err) {
      // console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [finalConfig.url, finalConfig.reconnectInterval, finalConfig.maxReconnectAttempts, startHeartbeat, stopHeartbeat, shouldUseWebSocket]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
  }, [stopHeartbeat]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      
      wsRef.current.send(JSON.stringify(messageWithTimestamp));
    } else {
      // console.warn('WebSocket is not connected. Message not sent:', message);
      setError('WebSocket is not connected');
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    // No-op since WebSocket is disabled
  }, [connect, disconnect, shouldUseWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    // No-op since WebSocket is disabled
  }, [stopHeartbeat]);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    connect,
    disconnect,
    lastMessage,
  };
}

// Hook for subscribing to specific WebSocket rooms
export function useWebSocketRoom(roomId: string, config?: Partial<WebSocketConfig>) {
  const { isConnected, sendMessage, ...wsState } = useWebSocket(config);
  
  const joinRoom = useCallback(() => {
    if (isConnected) {
      sendMessage({
        type: 'join_room',
        data: { room_id: roomId }
      });
    }
  }, [isConnected, sendMessage, roomId]);
  
  const leaveRoom = useCallback(() => {
    if (isConnected) {
      sendMessage({
        type: 'leave_room',
        data: { room_id: roomId }
      });
    }
  }, [isConnected, sendMessage, roomId]);
  
  useEffect(() => {
    if (isConnected) {
      joinRoom();
      
      return () => {
        leaveRoom();
      };
    }
  }, [isConnected, joinRoom, leaveRoom]);
  
  return {
    ...wsState,
    joinRoom,
    leaveRoom,
  };
}

// Hook for restaurant-specific updates
export function useRestaurantUpdates(restaurantId?: string) {
  const roomId = restaurantId ? `restaurant_${restaurantId}` : 'restaurant_updates';
  return useWebSocketRoom(roomId);
}

// Hook for open now updates
export function useOpenNowUpdates() {
  return useWebSocketRoom('open_now_updates');
}

// Hook for filter updates
export function useFilterUpdates() {
  return useWebSocketRoom('filter_updates');
}
