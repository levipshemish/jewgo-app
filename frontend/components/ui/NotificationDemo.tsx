'use client';

import React from 'react';

import { useNotifications } from '@/lib/contexts/NotificationsContext';

const NotificationDemo: React.FC = () => {
  const { addNotification } = useNotifications();

  const addSampleNotifications = () => {
    // Add some sample notifications
    addNotification({
      type: 'special',
      title: 'New Special Offer!',
      message: 'Get 20% off at Kosher Deli this week',
      read: false
    });

    addNotification({
      type: 'restaurant',
      title: 'New Restaurant Added',
      message: 'Sushi Bar Kosher is now available in your area',
      read: false
    });

    addNotification({
      type: 'update',
      title: 'Menu Updated',
      message: 'Kosher Pizza Palace has updated their menu',
      read: false
    });

    addNotification({
      type: 'reminder',
      title: 'Shabbat Reminder',
      message: 'Don\'t forget to order your Shabbat meals',
      read: false
    });
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={addSampleNotifications}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
      >
        Add Sample Notifications
      </button>
    </div>
  );
};

export default NotificationDemo; 