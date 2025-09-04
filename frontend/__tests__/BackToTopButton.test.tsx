import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BackToTopButton } from '@/components/ui/BackToTopButton';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
global.IntersectionObserver = mockIntersectionObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
const mockScrollTo = jest.fn();
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: mockScrollTo,
});

describe('BackToTopButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document.getElementById to return a sentinel element
    document.getElementById = jest.fn().mockReturnValue({
      scrollTo: jest.fn(),
    });
  });

  it('renders nothing when not visible', () => {
    render(<BackToTopButton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders button when visible', () => {
    // Mock IntersectionObserver to simulate sentinel not intersecting (scrolled down)
    const mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };
    
    mockIntersectionObserver.mockReturnValue(mockObserver);
    
    // Mock the observer callback to set isVisible to true
    let observerCallback: (entries: any[]) => void;
    mockObserver.observe.mockImplementation((_element) => {
      // Simulate the sentinel not intersecting (user has scrolled down)
      setTimeout(() => {
        observerCallback([{ isIntersecting: false }]);
      }, 0);
    });

    render(<BackToTopButton />);
    
    // Wait for the button to become visible
    setTimeout(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByLabelText('Back to top')).toBeInTheDocument();
    }, 100);
  });

  it('calls scrollTo when clicked', () => {
    // Mock IntersectionObserver to simulate sentinel not intersecting
    const mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };
    
    mockIntersectionObserver.mockReturnValue(mockObserver);
    
    let observerCallback: (entries: any[]) => void;
    mockObserver.observe.mockImplementation((_element) => {
      setTimeout(() => {
        observerCallback([{ isIntersecting: false }]);
      }, 0);
    });

    render(<BackToTopButton />);
    
    setTimeout(() => {
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  });

  it('respects prefers-reduced-motion', () => {
    // Mock prefers-reduced-motion: reduce
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };
    
    mockIntersectionObserver.mockReturnValue(mockObserver);
    
    let observerCallback: (entries: any[]) => void;
    mockObserver.observe.mockImplementation((_element) => {
      setTimeout(() => {
        observerCallback([{ isIntersecting: false }]);
      }, 0);
    });

    render(<BackToTopButton />);
    
    setTimeout(() => {
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'auto'
      });
    }, 100);
  });
});
