'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  MessageSquare,
  Building2,
  Users,
  Settings,
  Clock
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  category: 'system' | 'moderation' | 'user_activity' | 'security';
}

interface NotificationSystemProps {
  className?: string;
}

const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}> = ({ notification, onMarkAsRead, onDismiss }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      case 'info': 
      default: return Info;
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'info':
      default: return 'text-blue-500';
    }
  };

  const getCategoryIcon = () => {
    switch (notification.category) {
      case 'moderation': return MessageSquare;
      case 'user_activity': return Users;
      case 'system': return Settings;
      case 'security': return AlertTriangle;
      default: return Bell;
    }
  };

  const Icon = getIcon();
  const CategoryIcon = getCategoryIcon();

  return (
    <div 
      className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        !notification.read ? 'bg-blue-50' : 'bg-white'
      }`}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-1 rounded-full ${getIconColor()}`}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
              {notification.title}
            </h4>
            <CategoryIcon className="h-3 w-3 text-gray-400" />
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </div>
          
          <p className={`text-sm ${!notification.read ? 'text-gray-800' : 'text-gray-600'}`}>
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{new Date(notification.timestamp).toLocaleString()}</span>
            </div>
            
            {notification.actionUrl && (
              <a
                href={notification.actionUrl}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                View Details
              </a>
            )}
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default function NotificationSystem({ className = '' }: NotificationSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate mock notifications
  const generateMockNotifications = (): Notification[] => {
    return [
      {
        id: '1',
        type: 'warning',
        title: 'Pending Restaurant Approval',
        message: '5 new restaurant submissions are awaiting approval',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        read: false,
        category: 'moderation',
        actionUrl: '/admin/restaurants?status=pending_approval'
      },
      {
        id: '2',
        type: 'info',
        title: 'New User Registration',
        message: '12 new users registered in the last hour',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
        read: false,
        category: 'user_activity',
        actionUrl: '/admin/database/users'
      },
      {
        id: '3',
        type: 'success',
        title: 'System Backup Complete',
        message: 'Daily database backup completed successfully',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        read: true,
        category: 'system'
      },
      {
        id: '4',
        type: 'error',
        title: 'Failed Login Attempts',
        message: 'Unusual login activity detected from IP 192.168.1.100',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
        read: false,
        category: 'security',
        actionUrl: '/admin/audit?category=auth_failures'
      },
      {
        id: '5',
        type: 'info',
        title: 'Review Moderation',
        message: '3 reviews flagged for manual moderation',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        read: true,
        category: 'moderation',
        actionUrl: '/admin/database/reviews?status=flagged'
      }
    ];
  };

  useEffect(() => {
    // Load notifications on mount
    const loadNotifications = async () => {
      setLoading(true);
      try {
        // In a real app, this would be an API call
        await new Promise(resolve => setTimeout(resolve, 500));
        setNotifications(generateMockNotifications());
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Set up polling for new notifications
    const interval = setInterval(() => {
      // In a real app, this would check for new notifications
      // For demo purposes, we'll just update timestamps
      setNotifications(prev => prev.map(n => ({ ...n })));
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDismiss={dismissNotification}
                />
              ))
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No notifications</h4>
                <p className="text-gray-500">You&apos;re all caught up!</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <a
                href="/admin/notifications"
                className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}