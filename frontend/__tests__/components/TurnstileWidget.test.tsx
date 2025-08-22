import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';

// Mock the global turnstile object
const mockTurnstile = {
  ready: jest.fn((callback) => callback()),
  render: jest.fn(() => 'mock-widget-id'),
  reset: jest.fn(),
  getResponse: jest.fn(() => 'mock-token')
};

// Mock Next.js Script component
jest.mock('next/script', () => {
  return function MockScript({ onLoad }: { onLoad?: () => void }) {
    React.useEffect(() => {
      if (onLoad) {
        onLoad();
      }
    }, [onLoad]);
    return null;
  };
});

describe('TurnstileWidget', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock window.turnstile
    Object.defineProperty(window, 'turnstile', {
      value: mockTurnstile,
      writable: true
    });

    // Set a mock site key for testing
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
  });

  it('renders without crashing', () => {
    const mockOnVerify = jest.fn();
    
    render(
      <TurnstileWidget
        onVerify={mockOnVerify}
        onError={jest.fn()}
        onExpired={jest.fn()}
      />
    );

    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
  });

  it('shows error when site key is not configured', () => {
    // Temporarily remove the environment variable
    const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    const mockOnVerify = jest.fn();
    
    render(
      <TurnstileWidget
        onVerify={mockOnVerify}
        onError={jest.fn()}
        onExpired={jest.fn()}
      />
    );

    expect(screen.getByText('Turnstile site key not configured')).toBeInTheDocument();

    // Restore the environment variable
    if (originalSiteKey) {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey;
    }
  });

  it('calls onVerify when turnstile verification succeeds', async () => {
    const mockOnVerify = jest.fn();
    const mockOnError = jest.fn();
    const mockOnExpired = jest.fn();

    render(
      <TurnstileWidget
        onVerify={mockOnVerify}
        onError={mockOnError}
        onExpired={mockOnExpired}
      />
    );

    await waitFor(() => {
      expect(mockTurnstile.render).toHaveBeenCalled();
    });

    // Simulate successful verification
    const renderCall = mockTurnstile.render.mock.calls[0];
    const options = renderCall[1];
    options.callback('test-token');

    expect(mockOnVerify).toHaveBeenCalledWith('test-token');
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('calls onError when turnstile verification fails', async () => {
    const mockOnVerify = jest.fn();
    const mockOnError = jest.fn();
    const mockOnExpired = jest.fn();

    render(
      <TurnstileWidget
        onVerify={mockOnVerify}
        onError={mockOnError}
        onExpired={mockOnExpired}
      />
    );

    await waitFor(() => {
      expect(mockTurnstile.render).toHaveBeenCalled();
    });

    // Simulate error
    const renderCall = mockTurnstile.render.mock.calls[0];
    const options = renderCall[1];
    options['error-callback']();

    expect(mockOnError).toHaveBeenCalledWith('Turnstile verification failed');
    expect(mockOnVerify).not.toHaveBeenCalled();
  });

  it('calls onExpired when turnstile token expires', async () => {
    const mockOnVerify = jest.fn();
    const mockOnError = jest.fn();
    const mockOnExpired = jest.fn();

    render(
      <TurnstileWidget
        onVerify={mockOnVerify}
        onError={mockOnError}
        onExpired={mockOnExpired}
      />
    );

    await waitFor(() => {
      expect(mockTurnstile.render).toHaveBeenCalled();
    });

    // Simulate expiration
    const renderCall = mockTurnstile.render.mock.calls[0];
    const options = renderCall[1];
    options['expired-callback']();

    expect(mockOnExpired).toHaveBeenCalled();
    expect(mockOnVerify).not.toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });
});
