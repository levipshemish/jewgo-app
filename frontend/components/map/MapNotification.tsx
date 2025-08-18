'use client';

import React from 'react';

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface MapNotificationProps {
  notification: Notification | null;
}

export default function MapNotification({ notification }: MapNotificationProps) {
  if (!notification) {
    return null;
  }

  return (
    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
      <div className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
        notification.type === 'success' 
          ? 'bg-green-500 text-white' 
          : notification.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-blue-500 text-white'
      }`}>
        {notification.message}
      </div>
    </div>
  );
}
