import { render, screen } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import MapNotification from '../MapNotification';

describe('MapNotification', () => {
  it('renders nothing when notification is null', () => {
    const { container } = render(<MapNotification notification={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders success notification with correct styling', () => {
    const notification = {
      type: 'success' as const,
      message: 'Location obtained successfully!'
    };
    
    render(<MapNotification notification={notification} />);
    
    const notificationElement = screen.getByText('Location obtained successfully!');
    expect(notificationElement).toBeInTheDocument();
    expect(notificationElement).toHaveClass('bg-green-500', 'text-white');
  });

  it('renders error notification with correct styling', () => {
    const notification = {
      type: 'error' as const,
      message: 'Unable to get your location'
    };
    
    render(<MapNotification notification={notification} />);
    
    const notificationElement = screen.getByText('Unable to get your location');
    expect(notificationElement).toBeInTheDocument();
    expect(notificationElement).toHaveClass('bg-red-500', 'text-white');
  });

  it('renders info notification with correct styling', () => {
    const notification = {
      type: 'info' as const,
      message: 'Loading map data...'
    };
    
    render(<MapNotification notification={notification} />);
    
    const notificationElement = screen.getByText('Loading map data...');
    expect(notificationElement).toBeInTheDocument();
    expect(notificationElement).toHaveClass('bg-blue-500', 'text-white');
  });

  it('has proper positioning classes', () => {
    const notification = {
      type: 'success' as const,
      message: 'Test message'
    };
    
    render(<MapNotification notification={notification} />);
    
    const container = screen.getByText('Test message').parentElement;
    expect(container).toHaveClass('absolute', 'top-2', 'left-1/2', 'transform', '-translate-x-1/2', 'z-20');
  });

  it('has proper notification styling', () => {
    const notification = {
      type: 'success' as const,
      message: 'Test message'
    };
    
    render(<MapNotification notification={notification} />);
    
    const notificationElement = screen.getByText('Test message');
    expect(notificationElement).toHaveClass('px-4', 'py-2', 'rounded-lg', 'shadow-lg', 'text-sm', 'font-medium');
  });

  it('displays the correct message text', () => {
    const testMessage = 'This is a test notification message';
    const notification = {
      type: 'info' as const,
      message: testMessage
    };
    
    render(<MapNotification notification={notification} />);
    
    expect(screen.getByText(testMessage)).toBeInTheDocument();
  });
});
