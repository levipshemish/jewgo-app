'use client';

import { MessageSquare } from 'lucide-react';
import React, { useState } from 'react';

import FeedbackForm, { FeedbackData } from './FeedbackForm';

interface FeedbackButtonProps {
  restaurantId?: number;
  restaurantName?: string;
  variant?: 'floating' | 'inline' | 'minimal';
  className?: string;
  onFeedbackSubmit?: (data: FeedbackData) => void;
}

export default function FeedbackButton({
  restaurantId, restaurantName, variant = 'floating', onFeedbackSubmit
}: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    
    // Track feedback button click
    if (typeof window !== 'undefined' && window.trackAnalyticsEvent) {
      window.trackAnalyticsEvent('feedback_button_click', {
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        variant,
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = (data: FeedbackData) => {
    if (onFeedbackSubmit) {
      onFeedbackSubmit(data);
    }
  };

  const getButtonContent = () => {
    switch (variant) {
      case 'minimal':
        return (
          <button
            onClick={handleOpen}
            className="text-gray-500 hover:text-blue-600 transition-colors p-1"
            title="Submit feedback"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        );
      
      case 'inline':
        return (
          <button
            onClick={handleOpen}
            className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Feedback
          </button>
        );
      
      case 'floating':
      default:
        return (
          <button
            onClick={handleOpen}
            className="fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 z-50"
            title="Submit feedback"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        );
    }
  };

  return (
    <>
      {getButtonContent()}
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-md w-full">
            <FeedbackForm
              restaurantId={restaurantId}
              restaurantName={restaurantName}
              onClose={handleClose}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}
    </>
  );
} 